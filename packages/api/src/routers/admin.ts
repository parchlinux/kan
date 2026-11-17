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

export const SUPERADMIN_EMAIL = "behdanisohrab@gmail.com";

export const isSuperAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  return email.toLowerCase().trim() === SUPERADMIN_EMAIL.toLowerCase().trim();
};

// Security check: verify caller is SuperAdmin (Sohrab Behdani) or designated Site Admin
const assertIsSiteAdmin = async (ctx: any) => {
  const userEmail = ctx.user?.email?.toLowerCase()?.trim();
  if (!userEmail) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "لطفاً ابتدا وارد حساب کاربری خود شوید.",
    });
  }

  // 1. Hardcoded SuperAdmin always has full access
  if (isSuperAdmin(userEmail)) {
    return true;
  }

  // 2. Check if user is marked as admin in any workspace
  const member = await ctx.db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.userId, ctx.user?.id),
      eq(workspaceMembers.role, "admin"),
    ),
  });

  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "دسترسی غیرمجاز: این بخش فقط مخصوص مدیر ارشد سایت (سهراب بهدانی) و مدیران سیستم است.",
    });
  }

  return true;
};

const getSmtpTransporter = () => {
  const port = Number(process.env.SMTP_PORT) || 465;
  const isSecure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.zoho.com",
    port,
    secure: isSecure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });
};

export const adminRouter = createTRPCRouter({
  // 1. Comprehensive site-wide overview for the lead cockpit
  getOverview: protectedProcedure
    .input(z.object({ workspacePublicId: z.string().optional() }))
    .query(async ({ ctx }) => {
      await assertIsSiteAdmin(ctx);

      const userEmail = ctx.user?.email?.toLowerCase()?.trim();
      const userIsSuper = isSuperAdmin(userEmail);

      // Total boards
      const allBoards = await ctx.db.query.boards.findMany({
        where: isNull(boards.deletedAt),
        columns: { id: true, name: true, publicId: true, workspaceId: true },
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

      // All users in database
      const allUsers = await ctx.db.query.users.findMany({
        columns: { id: true, name: true, email: true, image: true, createdAt: true },
      });

      // All workspaces
      const allWorkspaces = await ctx.db.query.workspaces.findMany({
        where: isNull(workspaces.deletedAt),
        columns: {
          id: true,
          publicId: true,
          name: true,
          slug: true,
          plan: true,
          createdBy: true,
          createdAt: true,
        },
      });

      // Workspace memberships
      const allMembers = await ctx.db.query.workspaceMembers.findMany({
        columns: { id: true, userId: true, workspaceId: true, role: true, email: true },
      });

      // Card assignments
      const cardAssignments = await ctx.db.query.cardToWorkspaceMembers.findMany({
        columns: { cardId: true, workspaceMemberId: true },
      });

      const memberTaskCounts: Record<string, number> = {};
      for (const a of cardAssignments) {
        memberTaskCounts[a.workspaceMemberId] =
          (memberTaskCounts[a.workspaceMemberId] ?? 0) + 1;
      }

      // Map users with system roles and assigned tasks
      const usersList = allUsers.map((u) => {
        const uIsSuper = isSuperAdmin(u.email);
        const userMemberships = allMembers.filter((m) => m.userId === u.id);
        const hasAdminRole = userMemberships.some((m) => m.role === "admin");

        let totalAssignedTasks = 0;
        for (const m of userMemberships) {
          totalAssignedTasks += memberTaskCounts[m.id] ?? 0;
        }

        const wsNames = userMemberships
          .map((m) => allWorkspaces.find((w) => w.id === m.workspaceId)?.name)
          .filter(Boolean) as string[];

        return {
          id: u.id,
          name: u.name || "کاربر پارچ",
          email: u.email,
          image: u.image,
          createdAt: u.createdAt,
          isSuperAdmin: uIsSuper,
          role: uIsSuper || hasAdminRole ? ("admin" as const) : ("member" as const),
          assignedTasks: totalAssignedTasks,
          workspaces: wsNames,
        };
      });

      // Map workspaces with board and member counts
      const workspacesList = allWorkspaces.map((w) => {
        const ownerUser = allUsers.find((u) => u.id === w.createdBy);
        const wBoards = allBoards.filter((b) => b.workspaceId === w.id);
        const wMembers = allMembers.filter((m) => m.workspaceId === w.id);

        return {
          id: w.id,
          publicId: w.publicId,
          name: w.name,
          slug: w.slug,
          plan: w.plan,
          createdAt: w.createdAt,
          ownerName: ownerUser?.name || ownerUser?.email || "نامشخص",
          boardCount: wBoards.length,
          memberCount: wMembers.length,
        };
      });

      const adminCount = usersList.filter((u) => u.role === "admin").length;

      return {
        currentUser: {
          id: ctx.user!.id,
          email: userEmail,
          name: ctx.user!.name,
          isSuperAdmin: userIsSuper,
        },
        stats: {
          totalWorkspaces: allWorkspaces.length,
          totalBoards: allBoards.length,
          totalCards: allCards.length,
          totalUsers: allUsers.length,
          totalAdmins: adminCount,
          totalBlockers: blockers.length,
        },
        users: usersList,
        workspaces: workspacesList,
        blockers,
        boards: allBoards,
      };
    }),

  // 2. Change a user's role (Promote to Admin or Demote to Member)
  toggleUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "member"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertIsSiteAdmin(ctx);

      const targetUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "کاربر مورد نظر یافت نشد.",
        });
      }

      if (isSuperAdmin(targetUser.email)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "نقش مدیر ارشد توزیع (سهراب بهدانی) قابل تغییر نیست.",
        });
      }

      // Update role across workspace memberships for this user
      await ctx.db
        .update(workspaceMembers)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(workspaceMembers.userId, input.userId));

      log.info(
        { targetUserId: input.userId, newRole: input.role, admin: ctx.user?.email },
        "Admin updated user role",
      );

      return {
        success: true,
        userId: input.userId,
        newRole: input.role,
        userName: targetUser.name,
      };
    }),

  // 3. Manually create a user account by Admin
  createUser: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        password: z.string().min(8).max(100),
        role: z.enum(["admin", "member"]).default("member"),
        workspacePublicId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertIsSiteAdmin(ctx);

      const targetEmail = input.email.toLowerCase().trim();

      // Check if user already exists
      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.email, targetEmail),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "کاربری با این آدرس ایمیل از قبل در سیستم وجود دارد.",
        });
      }

      // Find target workspace (or default to first workspace)
      let ws = null;
      if (input.workspacePublicId) {
        ws = await ctx.db.query.workspaces.findFirst({
          where: eq(workspaces.publicId, input.workspacePublicId),
          columns: { id: true },
        });
      }
      if (!ws) {
        ws = await ctx.db.query.workspaces.findFirst({
          where: isNull(workspaces.deletedAt),
          columns: { id: true },
        });
      }

      if (!ws) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "هیچ فضای کاری فعالی برای افزودن کاربر یافت نشد.",
        });
      }

      // Create user via BetterAuth
      const auth = initAuth(ctx.db);
      const res = await auth.api.signUpEmail({
        body: {
          name: input.name,
          email: targetEmail,
          password: input.password,
        },
      });

      if (!res || !res.user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "خطا در ایجاد کاربر توسط سیستم احراز هویت.",
        });
      }

      // Add user to workspace members
      await ctx.db.insert(workspaceMembers).values({
        publicId: generateUID(),
        email: targetEmail,
        userId: res.user.id,
        workspaceId: ws.id,
        createdBy: ctx.user!.id,
        role: input.role,
        status: "active",
      });

      log.info(
        { userId: res.user.id, email: targetEmail, createdBy: ctx.user!.email },
        "Admin created user manually",
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

  // 4. Send Immediate Test Email to Admin or custom address
  sendTestEmail: protectedProcedure
    .input(
      z.object({
        targetEmail: z.string().email().default(SUPERADMIN_EMAIL),
        customNote: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertIsSiteAdmin(ctx);

      const transporter = getSmtpTransporter();
      const testEmail = input.targetEmail.toLowerCase().trim();

      const emailHtml = `
        <div dir="rtl" style="font-family: 'Estedad', Tahoma, sans-serif; line-height: 1.8; color: #1e293b; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 16px; display: flex; align-items: center;">
            <h2 style="color: #0f172a; margin: 0; font-size: 18px;">تست ارتباط ایمیل کان‌بان پارچ‌لینوکس</h2>
          </div>
          <p>سلام سهراب عزیز،</p>
          <p>این یک ایمیل آزمایشی جهت تایید صحت اتصال سرور SMTP پارچ‌لینوکس (Zoho) به کان‌بان است.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin: 16px 0; color: #166534;">
            <strong>وضعیت سرویس ایمیل:</strong> کاملاً فعال و متصل به <code>${process.env.SMTP_HOST || "smtp.zoho.com"}</code>
          </div>
          ${
            input.customNote
              ? `<p style="padding: 12px; background: #f8fafc; border-right: 4px solid #10b981; border-radius: 4px;"><strong>پیام تست:</strong> ${input.customNote}</p>`
              : ""
          }
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://kan.parchlinux.com/admin" style="background: #10b981; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">ورود به اتاق فرمان کان‌بان</a>
          </div>
          <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 20px;">
            توسعه‌یافته برای جامعه پارچ‌لینوکس | سرور رسمی kan.parchlinux.com
          </p>
        </div>
      `;

      try {
        const info = await transporter.sendMail({
          from: process.env.EMAIL_FROM || "Parch Kanban <noreply@parchlinux.com>",
          to: testEmail,
          subject: "[Parch Kanban] تست موفقیت‌آمیز سرویس ایمیل پارچ‌لینوکس",
          html: emailHtml,
        });

        log.info({ messageId: info.messageId, to: testEmail }, "Test email sent successfully");

        return {
          success: true,
          messageId: info.messageId,
          targetEmail: testEmail,
          info: "ایمیل تست با موفقیت از طریق سرور SMTP پارچ ارسال شد.",
        };
      } catch (err: any) {
        log.error({ err, to: testEmail }, "Failed to send test email");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `خطا در ارسال ایمیل: ${err?.message || "عدم برقراری ارتباط با سرور SMTP"}`,
        });
      }
    }),

  // 5. Send Task Reminder Emails or Broadcasts to Members
  sendReminders: protectedProcedure
    .input(
      z.object({
        workspacePublicId: z.string().optional(),
        customNote: z.string().optional(),
        dryRun: z.boolean().default(false),
        sendToAllMembers: z.boolean().default(false),
        targetEmail: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertIsSiteAdmin(ctx);

      // Query active cards
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
          !listName.includes("تمام") &&
          !listName.includes("پایان")
        );
      });

      const assignments = await ctx.db.query.cardToWorkspaceMembers.findMany({
        columns: { cardId: true, workspaceMemberId: true },
      });

      const members = await ctx.db.query.workspaceMembers.findMany({
        columns: { id: true, userId: true, email: true },
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
        },
      });

      // Build task map for each member
      const userTasks: Record<
        string,
        { name: string; email: string; tasks: { title: string; board: string; list: string }[] }
      > = {};

      for (const mem of members) {
        const email = (mem.user?.email || mem.email)?.toLowerCase()?.trim();
        if (!email) continue;

        if (!userTasks[email]) {
          userTasks[email] = {
            name: mem.user?.name || "عضو گرامی تیم پارچ",
            email,
            tasks: [],
          };
        }

        const memAssignments = assignments.filter((a) => a.workspaceMemberId === mem.id);
        for (const a of memAssignments) {
          const card = activeAssignedCards.find((c) => c.id === a.cardId);
          if (card) {
            userTasks[email].tasks.push({
              title: card.title,
              board: card.list?.board?.name ?? "تخته عمومی",
              list: card.list?.name ?? "در دست اقدام",
            });
          }
        }
      }

      // Filter recipients based on input mode
      let recipients = Object.values(userTasks);

      if (input.targetEmail) {
        const searchEmail = input.targetEmail.toLowerCase().trim();
        recipients = recipients.filter((r) => r.email === searchEmail);
        if (recipients.length === 0) {
          recipients = [
            {
              name: ctx.user?.name || "سهراب بهدانی",
              email: searchEmail,
              tasks: [],
            },
          ];
        }
      } else if (!input.sendToAllMembers) {
        // Only members who have active tasks
        recipients = recipients.filter((r) => r.tasks.length > 0);
      }

      if (input.dryRun) {
        return {
          dryRun: true,
          recipientCount: recipients.length,
          recipients: recipients.map((r) => ({
            name: r.name,
            email: r.email,
            taskCount: r.tasks.length,
          })),
          sentCount: 0,
          failedCount: 0,
          errors: [],
        };
      }

      if (recipients.length === 0) {
        return {
          dryRun: false,
          recipientCount: 0,
          sentCount: 0,
          failedCount: 0,
          recipients: [],
          errors: ["هیچ عضوی با تسک فعال برای ارسال یادآوری یافت نشد."],
        };
      }

      const transporter = getSmtpTransporter();
      const sentList: string[] = [];
      const errorList: string[] = [];

      for (const recipient of recipients) {
        const hasTasks = recipient.tasks.length > 0;
        const taskItemsHtml = hasTasks
          ? recipient.tasks
              .map(
                (t) =>
                  `<li style="margin-bottom: 8px;"><strong>${t.title}</strong>: <span style="color: #64748b;">(برد: ${t.board} | ستون: ${t.list})</span></li>`,
              )
              .join("")
          : `<li style="color: #64748b;">در حال حاضر تسک فعالی به شما انتساب داده نشده است.</li>`;

        const emailHtml = `
          <div dir="rtl" style="font-family: 'Estedad', Tahoma, sans-serif; line-height: 1.8; color: #1e293b; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 16px;">
              <h2 style="color: #0f172a; margin: 0; font-size: 18px;">یادآوری وضعیت تسک‌ها در کان‌بان پارچ‌لینوکس</h2>
            </div>
            <p>سلام ${recipient.name} عزیز،</p>
            <p>${hasTasks ? "شما در حال حاضر وظایف زیر را در میز کار پارچ در دست اقدام دارید:" : "گزارش دوره‌ای وضعیت میز کار پارچ‌لینوکس:"}</p>
            <ul style="background: #f8fafc; padding: 16px 24px; border-radius: 8px; border: 1px solid #e2e8f0; list-style-type: disc;">
              ${taskItemsHtml}
            </ul>
            ${
              input.customNote
                ? `<div style="padding: 12px; background: #ecfdf5; border-right: 4px solid #10b981; border-radius: 4px; margin: 16px 0;"><strong>پیام لید پروژه:</strong> ${input.customNote}</div>`
                : ""
            }
            <p>لطفاً در صورت پیشرفت کار یا نیاز به تغییر اولویت، کارت مربوطه را در پنل کان‌بان به‌روزرسانی فرمایید:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://kan.parchlinux.com" style="background: #10b981; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">ورود به کان‌بان پارچ</a>
            </div>
            <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 20px;">
              با احترام،<br/>تیم مهندسی و رهبری توزیع پارچ‌لینوکس
            </p>
          </div>
        `;

        try {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || "Parch Kanban <noreply@parchlinux.com>",
            to: recipient.email,
            subject: "[Parch Kanban] یادآوری تسک‌های فعال شما در پارچ‌لینوکس",
            html: emailHtml,
          });
          sentList.push(recipient.email);
        } catch (err: any) {
          const errMsg = `${recipient.email}: ${err?.message || "خطا در ارسال"}`;
          log.error({ err, email: recipient.email }, "Failed to send reminder email");
          errorList.push(errMsg);
        }
      }

      return {
        success: sentList.length > 0,
        sentCount: sentList.length,
        failedCount: errorList.length,
        recipients: sentList,
        errors: errorList,
      };
    }),

  // 6. Master Release Notes Builder across all boards
  getMasterReleaseNotes: protectedProcedure
    .input(z.object({ workspacePublicId: z.string().optional() }))
    .query(async ({ ctx }) => {
      await assertIsSiteAdmin(ctx);

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
