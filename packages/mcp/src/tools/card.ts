import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { KanClient } from "../client.js";

export function registerCardTools(server: McpServer, client: KanClient): void {
  server.tool(
    "create_card",
    "Create a new card in a list with optional priority, story points, architecture, desktop environment, and blocker flag",
    {
      listPublicId: z.string().describe("The list's public ID"),
      title: z.string().describe("Card title"),
      description: z
        .string()
        .optional()
        .describe("Card description (markdown supported)"),
      dueDate: z.string().optional().describe("Due date in ISO 8601 format"),
      labelPublicIds: z
        .array(z.string())
        .optional()
        .describe("Public IDs of labels to attach"),
      memberPublicIds: z
        .array(z.string())
        .optional()
        .describe("Public IDs of workspace members to assign"),
      position: z
        .enum(["start", "end"])
        .optional()
        .describe("Where to insert the card in the list (default: end)"),
      priority: z
        .enum(["urgent", "high", "medium", "low", "none"])
        .optional()
        .describe("Card priority (urgent, high, medium, low, none)"),
      storyPoints: z
        .number()
        .int()
        .min(0)
        .max(1000)
        .optional()
        .describe("Story points estimate (integer between 0 and 1000)"),
      architecture: z
        .enum(["x86_64", "aarch64", "all"])
        .optional()
        .describe("Target Parch architecture (x86_64, aarch64, all)"),
      desktopEnv: z
        .enum(["gnome", "kde", "hyprland", "xfce", "cli", "all"])
        .optional()
        .describe("Target desktop environment (gnome, kde, hyprland, xfce, cli, all)"),
      isBlocked: z
        .boolean()
        .optional()
        .describe("Flag card as an active blocker issue"),
    },
    async ({
      listPublicId,
      title,
      description,
      dueDate,
      labelPublicIds,
      memberPublicIds,
      position,
      priority,
      storyPoints,
      architecture,
      desktopEnv,
      isBlocked,
    }) => {
      const data = await client.request("POST", "/cards", {
        listPublicId,
        title,
        description,
        dueDate,
        labelPublicIds: labelPublicIds ?? [],
        memberPublicIds: memberPublicIds ?? [],
        position: position ?? "end",
        priority,
        storyPoints,
        architecture,
        desktopEnv,
        isBlocked,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_card",
    "Get full details of a card including comments, checklists, labels, members, and custom Parch fields",
    { cardPublicId: z.string().describe("The card's public ID") },
    async ({ cardPublicId }) => {
      const data = await client.request("GET", `/cards/${cardPublicId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "update_card",
    "Update a card's title, description, due date, priority, points, architecture, desktop env, blocker status, or move it to another list",
    {
      cardPublicId: z.string().describe("The card's public ID"),
      title: z.string().optional().describe("New card title"),
      description: z.string().optional().describe("New description"),
      dueDate: z
        .string()
        .nullable()
        .optional()
        .describe("Due date in ISO 8601, or null to clear"),
      listPublicId: z
        .string()
        .optional()
        .describe("Move card to this list (public ID)"),
      priority: z
        .enum(["urgent", "high", "medium", "low", "none"])
        .optional()
        .describe("Card priority (urgent, high, medium, low, none)"),
      storyPoints: z
        .number()
        .int()
        .min(0)
        .max(1000)
        .nullable()
        .optional()
        .describe("Story points estimate, or null to clear"),
      architecture: z
        .enum(["x86_64", "aarch64", "all"])
        .nullable()
        .optional()
        .describe("Target architecture, or null to clear"),
      desktopEnv: z
        .enum(["gnome", "kde", "hyprland", "xfce", "cli", "all"])
        .nullable()
        .optional()
        .describe("Target desktop environment, or null to clear"),
      isBlocked: z
        .boolean()
        .optional()
        .describe("Flag card as an active blocker issue"),
    },
    async ({
      cardPublicId,
      title,
      description,
      dueDate,
      listPublicId,
      priority,
      storyPoints,
      architecture,
      desktopEnv,
      isBlocked,
    }) => {
      const data = await client.request("PUT", `/cards/${cardPublicId}`, {
        title,
        description,
        dueDate,
        listPublicId,
        priority,
        storyPoints,
        architecture,
        desktopEnv,
        isBlocked,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "delete_card",
    "Delete a card (soft delete)",
    { cardPublicId: z.string().describe("The card's public ID") },
    async ({ cardPublicId }) => {
      const data = await client.request("DELETE", `/cards/${cardPublicId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "duplicate_card",
    "Duplicate a card to the same or a different list",
    {
      cardPublicId: z.string().describe("The card's public ID to duplicate"),
      targetListPublicId: z
        .string()
        .optional()
        .describe("Target list public ID (defaults to same list)"),
      copyLabels: z
        .boolean()
        .optional()
        .default(true)
        .describe("Copy labels to the duplicate"),
      copyMembers: z
        .boolean()
        .optional()
        .default(true)
        .describe("Copy assigned members to the duplicate"),
      copyChecklists: z
        .boolean()
        .optional()
        .default(true)
        .describe("Copy checklists to the duplicate"),
    },
    async ({
      cardPublicId,
      targetListPublicId,
      copyLabels = true,
      copyMembers = true,
      copyChecklists = true,
    }) => {
      let listPublicId = targetListPublicId;
      if (!listPublicId) {
        const card = await client.request<{ list: { publicId: string } }>(
          "GET",
          `/cards/${cardPublicId}`,
        );
        listPublicId = card.list.publicId;
      }

      const data = await client.request(
        "POST",
        `/cards/${cardPublicId}/duplicate`,
        {
          listPublicId,
          copyLabels,
          copyMembers,
          copyChecklists,
        },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "search_cards",
    "Search and filter cards across a board by text query, priority, architecture, desktop environment, or blocker status",
    {
      boardPublicId: z.string().describe("The board's public ID"),
      query: z
        .string()
        .optional()
        .describe("Text to match in title or description (case-insensitive)"),
      priority: z
        .enum(["urgent", "high", "medium", "low", "none"])
        .optional()
        .describe("Filter by priority"),
      architecture: z
        .string()
        .optional()
        .describe("Filter by architecture (e.g. x86_64, aarch64)"),
      desktopEnv: z
        .string()
        .optional()
        .describe("Filter by desktop environment (e.g. kde, gnome, hyprland, xfce, cli)"),
      isBlocked: z
        .boolean()
        .optional()
        .describe("Filter cards by blocker status"),
    },
    async ({
      boardPublicId,
      query,
      priority,
      architecture,
      desktopEnv,
      isBlocked,
    }) => {
      interface BoardResponse {
        publicId: string;
        name: string;
        lists: {
          publicId: string;
          name: string;
          cards: {
            publicId: string;
            title: string;
            cardNumber?: number | null;
            description?: string | null;
            priority?: string | null;
            storyPoints?: number | null;
            architecture?: string | null;
            desktopEnv?: string | null;
            isBlocked?: boolean | null;
            dueDate?: string | null;
            labels?: { name: string; colourCode: string | null }[];
          }[];
        }[];
      }

      const board = await client.request<BoardResponse>(
        "GET",
        `/boards/${boardPublicId}`,
      );

      const q = query?.toLowerCase().trim();
      const results: unknown[] = [];

      for (const list of board.lists ?? []) {
        for (const card of list.cards ?? []) {
          if (
            q &&
            !card.title.toLowerCase().includes(q) &&
            !(card.description?.toLowerCase().includes(q))
          ) {
            continue;
          }
          if (priority && card.priority !== priority) {
            continue;
          }
          if (architecture && card.architecture !== architecture) {
            continue;
          }
          if (desktopEnv && card.desktopEnv !== desktopEnv) {
            continue;
          }
          if (isBlocked !== undefined && !!card.isBlocked !== isBlocked) {
            continue;
          }

          results.push({
            publicId: card.publicId,
            cardNumber: card.cardNumber,
            title: card.title,
            listName: list.name,
            listPublicId: list.publicId,
            priority: card.priority ?? "none",
            storyPoints: card.storyPoints ?? null,
            architecture: card.architecture ?? null,
            desktopEnv: card.desktopEnv ?? null,
            isBlocked: !!card.isBlocked,
            labels: card.labels?.map((l) => l.name) ?? [],
            dueDate: card.dueDate ?? null,
          });
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                boardName: board.name,
                totalMatches: results.length,
                cards: results,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "generate_release_notes",
    "Generate Markdown release notes for a board, grouped by primary label, with ticket numbers, architecture, and desktop environment tags",
    {
      boardPublicId: z.string().describe("The board's public ID"),
      listNameOrPublicId: z
        .string()
        .optional()
        .describe("Target list name or public ID (defaults to list named Done, Release, or the last column)"),
    },
    async ({ boardPublicId, listNameOrPublicId }) => {
      interface BoardResponse {
        publicId: string;
        name: string;
        workspace?: { cardPrefix?: string | null };
        lists: {
          publicId: string;
          name: string;
          cards: {
            publicId: string;
            title: string;
            cardNumber?: number | null;
            architecture?: string | null;
            desktopEnv?: string | null;
            isBlocked?: boolean | null;
            labels?: { name: string }[];
          }[];
        }[];
      }

      const board = await client.request<BoardResponse>(
        "GET",
        `/boards/${boardPublicId}`,
      );

      const lists = board.lists ?? [];
      let targetList = lists[lists.length - 1];

      if (listNameOrPublicId) {
        const found = lists.find(
          (l) =>
            l.publicId === listNameOrPublicId ||
            l.name.toLowerCase() === listNameOrPublicId.toLowerCase(),
        );
        if (found) targetList = found;
      } else {
        const doneList = lists.find((l) =>
          /done|release|complete|تمام/i.test(l.name),
        );
        if (doneList) targetList = doneList;
      }

      if (!targetList) {
        return {
          content: [
            {
              type: "text",
              text: `No list found in board "${board.name}".`,
            },
          ],
        };
      }

      const prefix = board.workspace?.cardPrefix || "PARCH";
      const cards = targetList.cards ?? [];

      const grouped: Record<string, typeof cards> = {};
      const unlabelled: typeof cards = [];

      for (const card of cards) {
        if (card.labels && card.labels.length > 0 && card.labels[0]?.name) {
          const cat = card.labels[0].name;
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(card);
        } else {
          unlabelled.push(card);
        }
      }

      const lines: string[] = [];
      lines.push(`# ${board.name} Release Notes`);
      lines.push(`Target List: ${targetList.name}`);
      lines.push(`Total Cards: ${cards.length}`);
      lines.push("");

      const formatLine = (c: (typeof cards)[0]) => {
        const ticket = c.cardNumber != null ? `[${prefix}-${c.cardNumber}]` : "";
        const tags: string[] = [];
        if (c.architecture && c.architecture !== "all") tags.push(c.architecture);
        if (c.desktopEnv && c.desktopEnv !== "all") tags.push(c.desktopEnv);
        const tagStr = tags.length > 0 ? ` (${tags.join(", ")})` : "";
        return `- ${ticket} ${c.title}${tagStr}`.trim();
      };

      for (const [group, groupCards] of Object.entries(grouped)) {
        lines.push(`## ${group}`);
        for (const c of groupCards) lines.push(formatLine(c));
        lines.push("");
      }

      if (unlabelled.length > 0) {
        lines.push("## Other Changes");
        for (const c of unlabelled) lines.push(formatLine(c));
        lines.push("");
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    },
  );

  server.tool(
    "get_card_activities",
    "Get the activity history of a card",
    {
      cardPublicId: z.string().describe("The card's public ID"),
      cursor: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response"),
    },
    async ({ cardPublicId, cursor }) => {
      const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const data = await client.request(
        "GET",
        `/cards/${cardPublicId}/activities${params}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "add_card_comment",
    "Add a comment to a card",
    {
      cardPublicId: z.string().describe("The card's public ID"),
      content: z.string().describe("Comment text"),
    },
    async ({ cardPublicId, content }) => {
      const data = await client.request(
        "POST",
        `/cards/${cardPublicId}/comments`,
        { comment: content },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "update_card_comment",
    "Update the text of an existing comment",
    {
      cardPublicId: z.string().describe("The card's public ID"),
      commentPublicId: z.string().describe("The comment's public ID"),
      content: z.string().describe("New comment text"),
    },
    async ({ cardPublicId, commentPublicId, content }) => {
      const data = await client.request(
        "PUT",
        `/cards/${cardPublicId}/comments/${commentPublicId}`,
        { comment: content },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "delete_card_comment",
    "Delete a comment from a card",
    {
      cardPublicId: z.string().describe("The card's public ID"),
      commentPublicId: z.string().describe("The comment's public ID"),
    },
    async ({ cardPublicId, commentPublicId }) => {
      const data = await client.request(
        "DELETE",
        `/cards/${cardPublicId}/comments/${commentPublicId}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "toggle_card_label",
    "Add or remove a label on a card (toggles if already present)",
    {
      cardPublicId: z.string().describe("The card's public ID"),
      labelPublicId: z.string().describe("The label's public ID"),
    },
    async ({ cardPublicId, labelPublicId }) => {
      const data = await client.request(
        "PUT",
        `/cards/${cardPublicId}/labels/${labelPublicId}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "toggle_card_member",
    "Add or remove a member assignment on a card (toggles if already assigned)",
    {
      cardPublicId: z.string().describe("The card's public ID"),
      memberPublicId: z
        .string()
        .describe("The workspace member's public ID"),
    },
    async ({ cardPublicId, memberPublicId }) => {
      const data = await client.request(
        "PUT",
        `/cards/${cardPublicId}/members/${memberPublicId}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
