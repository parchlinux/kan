import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import nodemailer from "nodemailer";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  cards,
  lists,
  boards,
  workspaces,
  workspaceMembers,
  users,
  cardToWorkspaceMembers,
} from "@kan/db/schema";
import { initAuth } from "@kan/auth/server";
import { generateUID } from "@kan/shared/utils";
import { createLogger } from "@kan/logger";

const log = createLogger("admin-router");

// Security check: verify caller is workspace owner or lead (Sohrab Behdani)
const assertIsLeadOrAdmin = async (ctx: any, workspacePublicId?: string) => {
  const userEmail = ctx.user?.email?.toLowerCase();
  if (userEmail === "behdanisohrab@gmail.com") {
    return true;
  }

  if (workspacePublicId) {
    const ws = await ctx.db.query.workspaces.findFirst({
      where: eq(workspaces.publicId, workspacePublicId),
      columns: { id: true, ownerId: true },
    });
    if (ws && ws.ownerId === ctx.user?.id) {
      return true;
    }
  }

  // Check if member is admin in any workspace
  const member = await ctx.db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.userId, ctx.user?.id),
      eq(workspaceMembers.role, "admin"),
    ),
  });

  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only workspace leads or administrators can access this section.",
    });
  }

  return true;
};

export const adminRouter = createTRPCRouter({
  // 1. Overview and metrics for the lead cockpit
  getOverview: protectedProcedure
    .input(z.object({ workspacePublicId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      await assertIsLeadOrAdmin(ctx, input.workspacePublicId);

      // Total boards
      const allBoards = await ctx.db.query.boards.findMany({
        where: isNull(boards.deletedAt),
        columns: { id: true, name: true, publicId: true },
        with: {
          lists: {
            where: isNull(lists.deletedAt),
            columns: { id: true, name: true, publicId: true },
          },
        },
      });

      // Total cards and active blockers
      const allCards = await ctx.db.query.cards.findMany({
        where: isNull(cards.deletedAt),
        columns: {
          id: true,
          publicId: true,
          title: true,
          priority: true,
          isBlocked: true,
          architecture: true,
          desktopEnv: true,
          listId: true,
          createdAt: true,
        },
      });

      const blockers = allCards.filter(
        (c) => c.isBlocked === true || c.priority === "urgent",
      );

      // Members and task counts
      const allUsers = await ctx.db.query.users.findMany({
        columns: { id: true, name: true, email: true, image: true, createdAt: true },
      });

      const cardAssignments = await ctx.db.query.cardToWorkspaceMembers.findMany({
        columns: { cardId: true, workspaceMemberId: true },
      });

      const members = await ctx.db.query.workspaceMembers.findMany({
        columns: { id: true, userId: true, role: true },
      });

      const memberTaskCounts: Record<string, number> = {};
      for (const a of cardAssignments) {
        memberTaskCounts[a.workspaceMemberId] =
          (memberTaskCounts[a.workspaceMemberId] ?? 0) + 1;
      }

      const usersWithTasks = allUsers.map((u) => {
        const mem = members.find((m) => m.userId === u.id);
        const taskCount = mem ? (memberTaskCounts[mem.id] ?? 0) : 0;
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          image: u.image,
          role: mem?.role ?? "member",
          assignedTasks: taskCount,
        };
      });

      return {
        stats: {
          totalBoards: allBoards.length,
          totalCards: allCards.length,
          totalUsers: allUsers.length,
          totalBlockers: blockers.length,
        },
        blockers,
        boards: allBoards,
        users: usersWithTasks,
      };
    }),

  // 2. Manually create a user account by Admin
  createUser: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        password: z.string().min(8).max(100),
        role: z.enum(["admin", "member"]).default("member"),
        workspacePublicId: z.string().min(12),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertIsLeadOrAdmin(ctx, input.workspacePublicId);

      // Check if user already exists
      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email.toLowerCase()),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email address already exists.",
        });
      }

      // Find target workspace
      const ws = await ctx.db.query.workspaces.findFirst({
        where: eq(workspaces.publicId, input.workspacePublicId),
        columns: { id: true },
      });

      if (!ws) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found.",
        });
      }

      // Create user via BetterAuth
      const auth = initAuth(ctx.db);
      const res = await auth.api.signUpEmail({
        body: {
          name: input.name,
          email: input.email.toLowerCase(),
          password: input.password,
        },
      });

      if (!res || !res.user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user account.",
        });
      }

      // Add user to workspace members
      await ctx.db.insert(workspaceMembers).values({
        publicId: generateUID(),
        email: input.email.toLowerCase(),
        userId: res.user.id,
        workspaceId: ws.id,
        createdBy: ctx.user!.id,
        role: input.role,
        status: "active",
      });

      log.info(
        { userId: res.user.id, email: input.email, createdBy: ctx.user!.email },
        "Admin manually created user",
      );

      return {
        success: true,
        user: {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: input.role,
        },
      };
    }),

  // 3. Send Task Reminder Emails to Members
  sendReminders: protectedProcedure
    .input(
      z.object({
        workspacePublicId: z.string().optional(),
        customNote: z.string().optional(),
        dryRun: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertIsLeadOrAdmin(ctx, input.workspacePublicId);

      // Query cards assigned to members with list and board info
      const assignedCards = await ctx.db.query.cards.findMany({
        where: isNull(cards.deletedAt),
        columns: { id: true, title: true, priority: true, listId: true },
        with: {
          list: {
            columns: { id: true, name: true, boardId: true },
            with: {
              board: {
                columns: { id: true, name: true },
              },
            },
          },
        },
      });

      // Filter out Done / Finished cards
      const activeAssignedCards = assignedCards.filter((c) => {
        const listName = c.list?.name?.toLowerCase() ?? "";
        return (
          !listName.includes("done") &&
          !listName.includes("finished") &&
          !listName.includes("تمام")
        );
      });

      const assignments = await ctx.db.query.cardToWorkspaceMembers.findMany({
        columns: { cardId: true, workspaceMemberId: true },
      });

      const members = await ctx.db.query.workspaceMembers.findMany({
        columns: { id: true, userId: true },
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
        },
      });

      // Group active tasks by user email
      const userTasks: Record<
        string,
        { name: string; email: string; tasks: { title: string; board: string; list: string }[] }
      > = {};

      for (const a of assignments) {
        const card = activeAssignedCards.find((c) => c.id === a.cardId);
        if (!card) continue;

        const mem = members.find((m) => m.id === a.workspaceMemberId);
        if (!mem || !mem.user?.email) continue;

        const email = mem.user.email;
        if (!userTasks[email]) {
          userTasks[email] = {
            name: mem.user.name ?? "عضو گرامی",
            email,
            tasks: [],
          };
        }

        userTasks[email].tasks.push({
          title: card.title,
          board: card.list?.board?.name ?? "تخته عمومی",
          list: card.list?.name ?? "در دست اقدام",
        });
      }

      const recipients = Object.values(userTasks);

      if (input.dryRun) {
        return {
          dryRun: true,
          recipientCount: recipients.length,
          recipients: recipients.map((r) => ({
            name: r.name,
            email: r.email,
            taskCount: r.tasks.length,
          })),
        };
      }

      // Configure SMTP transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASSWORD
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
              }
            : undefined,
      });

      const sentList: string[] = [];

      for (const recipient of recipients) {
        const taskItemsHtml = recipient.tasks
          .map(
            (t) =>
              `<li style="margin-bottom: 8px;"><strong>${t.title}</strong>: <span style="color: #666;">(برد: ${t.board} | ستون: ${t.list})</span></li>`,
          )
          .join("");

        const emailHtml = `
          <div dir="rtl" style="font-family: 'Estedad', Tahoma, sans-serif; line-height: 1.8; color: #1e293b; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px;">
            <div style="border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 16px;">
              <h2 style="color: #0f172a; margin: 0;">یادآوری تسک‌های فعال در کان‌بان پارچ‌لینوکس</h2>
            </div>
            <p>سلام ${recipient.name} عزیز،</p>
            <p>شما در حال حاضر وظایف زیر را در میز کار پارچ در دست اقدام دارید:</p>
            <ul style="background: #f8fafc; padding: 16px 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
              ${taskItemsHtml}
            </ul>
            ${
              input.customNote
                ? `<p style="padding: 12px; background: #ecfdf5; border-right: 4px solid #10b981; border-radius: 4px;"><strong>پیام لید پروژه:</strong> ${input.customNote}</p>`
                : ""
            }
            <p>لطفاً در صورت پیشرفت کار یا نیاز به تغییر اولویت، کارت مربوطه را در پنل کان‌بان به‌روزرسانی فرمایید:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://kan.parchlinux.com" style="background: #10b981; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">ورود به کان‌بان پارچ</a>
            </div>
            <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;">با احترام،<br/>تیم مهندسی و رهبری توزیع پارچ‌لینوکس</p>
          </div>
        `;

        try {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || "Parch Kanban <kan@parchlinux.com>",
            to: recipient.email,
            subject: "[Parch Kanban] یادآوری تسک‌های در دست انجام شما در پارچ‌لینوکس",
            html: emailHtml,
          });
          sentList.push(recipient.email);
        } catch (err) {
          log.error({ err, email: recipient.email }, "Failed to send reminder email");
        }
      }

      return {
        success: true,
        sentCount: sentList.length,
        recipients: sentList,
      };
    }),

  // 4. Master Release Notes Builder across all boards
  getMasterReleaseNotes: protectedProcedure
    .input(z.object({ workspacePublicId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      await assertIsLeadOrAdmin(ctx, input.workspacePublicId);

      const allBoards = await ctx.db.query.boards.findMany({
        where: isNull(boards.deletedAt),
        columns: { id: true, name: true },
        with: {
          lists: {
            where: isNull(lists.deletedAt),
            columns: { id: true, name: true },
            with: {
              cards: {
                where: isNull(cards.deletedAt),
                columns: {
                  id: true,
                  title: true,
                  cardNumber: true,
                  priority: true,
                  architecture: true,
                  desktopEnv: true,
                },
              },
            },
          },
        },
      });

      const today = new Date().toISOString().split("T")[0];
      const lines: string[] = [];
      lines.push(`# Parch Linux: Master Release Notes`);
      lines.push(`Date: ${today}`);
      lines.push(`Compiled by: ${ctx.user!.name} (${ctx.user!.email})`);
      lines.push("");

      for (const b of allBoards) {
        const doneList = b.lists.find((l) =>
          /done|finish|پایان|کامل/i.test(l.name),
        );
        if (!doneList || !doneList.cards.length) continue;

        lines.push(`## ${b.name}`);
        for (const card of doneList.cards) {
          const arch =
            card.architecture && card.architecture !== "all"
              ? ` [${card.architecture}]`
              : "";
          const de =
            card.desktopEnv && card.desktopEnv !== "all"
              ? ` (${card.desktopEnv})`
              : "";
          lines.push(`- ${card.title}${arch}${de}`);
        }
        lines.push("");
      }

      lines.push("---");
      lines.push("*Generated via Parch Lead Cockpit*");

      return {
        markdown: lines.join("\n"),
        date: today,
      };
    }),
});
