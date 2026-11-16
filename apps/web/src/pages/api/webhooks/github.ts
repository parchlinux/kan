import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Readable } from "node:stream";

import { createDrizzleClient } from "@kan/db/client";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import { cards, workspaceMembers } from "@kan/db/schema";
import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { createLogger } from "@kan/logger";

const log = createLogger("github-webhook");

async function buffer(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function verifySignature(payload: Buffer, signature: string | undefined, secret: string | undefined): boolean {
  if (!secret) return true; // If no secret configured, allow (e.g. dev/test)
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  const digest = `sha256=${hmac.update(payload).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

function getTargetLists(repoName: string) {
  const repo = repoName.toLowerCase();
  if (repo === "parch-iso-hyprland" || repo === "dotfiles") {
    return {
      todoListPublicId: "mlk2sbdqpxip", // Phase 1 (Stable Iso)
      doneListPublicId: "yuaf6110ayg0", // Finished
      desktopEnv: "hyprland",
    };
  }
  if (
    repo === "calamares-parch-net" ||
    repo === "parch-iso-template" ||
    repo === "parch-welcome-legacy"
  ) {
    return {
      todoListPublicId: "gcogp4rrmehx", // To Do
      doneListPublicId: "3b52phl7ic9n", // Done
      desktopEnv: "all",
    };
  }
  if (
    repo === "parch-gtk-theme" ||
    repo === "parchlinux.com" ||
    repo === "contributing" ||
    repo === "parch-community-photos"
  ) {
    return {
      todoListPublicId: "w8ind9fpk09p", // To Do
      doneListPublicId: "axeudldqgub1", // Done
      desktopEnv: "all",
    };
  }
  return {
    todoListPublicId: "043th8hcu123", // To Do
    doneListPublicId: "rhg6qzncu1q2", // Done
    desktopEnv: "all",
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const rawBody = await buffer(req);
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!verifySignature(rawBody, signature, secret)) {
    log.warn("Invalid GitHub webhook signature");
    return res.status(401).json({ message: "Invalid signature" });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody.toString("utf-8"));
  } catch (e) {
    return res.status(400).json({ message: "Invalid JSON payload" });
  }

  const githubEvent = req.headers["x-github-event"];
  log.info({ githubEvent, action: event.action }, "Received GitHub webhook");

  if (githubEvent === "ping") {
    return res.status(200).json({ message: "pong" });
  }

  const db = createDrizzleClient();

  if (githubEvent === "issues") {
    const action = event.action;
    const issue = event.issue;
    const repository = event.repository;

    if (!issue || !repository) {
      return res.status(400).json({ message: "Missing issue or repository in payload" });
    }

    const org = repository.owner?.login ?? "parchlinux";
    const repoName = repository.name;
    const targets = getTargetLists(repoName);
    const cardTitle = `[${repoName}] #${issue.number}: ${issue.title}`;
    const issueUrl = issue.html_url;

    // 1. Issue Opened
    if (action === "opened") {
      const targetList = await listRepo.getByPublicId(db, targets.todoListPublicId);
      if (!targetList) {
        log.error({ listPublicId: targets.todoListPublicId }, "Target list not found for GitHub issue");
        return res.status(404).json({ message: "Target list not found" });
      }

      // Check for duplicate
      const existing = await db.query.cards.findFirst({
        where: and(
          or(
            ilike(cards.title, `[${repoName}] #${issue.number}:%`),
            ilike(cards.description, `%${issueUrl}%`),
          ),
          isNull(cards.deletedAt),
        ),
      });

      if (existing) {
        return res.status(200).json({ message: "Card already exists", cardId: existing.publicId });
      }

      // Find an owner / creator in the workspace
      const member = await db.query.workspaceMembers.findFirst({
        where: eq(workspaceMembers.workspaceId, targetList.workspaceId),
      });
      const createdBy = member?.userId ?? "996347cb-6e02-4b30-b795-98744473f587";

      const labels = (issue.labels ?? []).map((l: any) => l.name);
      const isBug = labels.some((l: string) => /bug/i.test(l)) || /\[bug\]/i.test(issue.title);
      const priority = isBug ? "high" : "medium";

      const descLines = [
        `**GitHub Issue:** [${org}/${repoName}#${issue.number}](${issueUrl})`,
        `**Author:** @${issue.user?.login ?? "unknown"}`,
        `**Labels:** ${labels.join(", ") || "None"}`,
        "",
        "---",
        "",
        issue.body || "No description provided.",
      ];

      const newCard = await cardRepo.create(db, {
        title: cardTitle,
        description: descLines.join("\n"),
        createdBy,
        listId: targetList.id,
        workspaceId: targetList.workspaceId,
        position: "end",
        priority,
        desktopEnv: targets.desktopEnv,
        architecture: "all",
        isBlocked: false,
      });

      log.info({ cardId: newCard.publicId, issue: `${org}/${repoName}#${issue.number}` }, "Created Kanban card from GitHub issue");
      return res.status(200).json({ success: true, action: "card_created", cardId: newCard.publicId });
    }

    // 2. Issue Closed -> Move to Done
    if (action === "closed") {
      const existing = await db.query.cards.findFirst({
        where: and(
          or(
            ilike(cards.title, `[${repoName}] #${issue.number}:%`),
            ilike(cards.description, `%${issueUrl}%`),
          ),
          isNull(cards.deletedAt),
        ),
      });

      if (existing) {
        const doneList = await listRepo.getByPublicId(db, targets.doneListPublicId);
        if (doneList) {
          await cardRepo.reorder(db, {
            cardId: existing.id,
            newListId: doneList.id,
            newIndex: undefined,
          });
          log.info({ cardId: existing.publicId, issue: `${org}/${repoName}#${issue.number}` }, "Moved Kanban card to Done");
          return res.status(200).json({ success: true, action: "card_moved_to_done", cardId: existing.publicId });
        }
      }
      return res.status(200).json({ message: "No matching card found to close" });
    }

    // 3. Issue Reopened -> Move to To Do
    if (action === "reopened") {
      const existing = await db.query.cards.findFirst({
        where: and(
          or(
            ilike(cards.title, `[${repoName}] #${issue.number}:%`),
            ilike(cards.description, `%${issueUrl}%`),
          ),
          isNull(cards.deletedAt),
        ),
      });

      if (existing) {
        const todoList = await listRepo.getByPublicId(db, targets.todoListPublicId);
        if (todoList) {
          await cardRepo.reorder(db, {
            cardId: existing.id,
            newListId: todoList.id,
            newIndex: undefined,
          });
          log.info({ cardId: existing.publicId, issue: `${org}/${repoName}#${issue.number}` }, "Reopened Kanban card back to To Do");
          return res.status(200).json({ success: true, action: "card_reopened", cardId: existing.publicId });
        }
      }
      return res.status(200).json({ message: "No matching card found to reopen" });
    }

    // 4. Issue Edited -> Update title
    if (action === "edited") {
      const existing = await db.query.cards.findFirst({
        where: and(
          or(
            ilike(cards.title, `[${repoName}] #${issue.number}:%`),
            ilike(cards.description, `%${issueUrl}%`),
          ),
          isNull(cards.deletedAt),
        ),
      });

      if (existing) {
        await cardRepo.update(
          db,
          {
            title: cardTitle,
          },
          {
            cardPublicId: existing.publicId,
          },
        );
        return res.status(200).json({ success: true, action: "card_updated", cardId: existing.publicId });
      }
    }
  }

  return res.status(200).json({ received: true, ignored: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
