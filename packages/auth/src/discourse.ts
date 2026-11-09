import crypto from "crypto";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { eq } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import * as schema from "@kan/db/schema";
import { createLogger } from "@kan/logger";

const log = createLogger("discourse-auth");

export const discoursePlugin = (db: dbClient) => ({
  id: "discourse-auth-plugin",
  endpoints: {
    discourseSignIn: createAuthEndpoint(
      "/discourse",
      {
        method: "GET",
      },
      async (ctx) => {
        const discourseUrl =
          process.env.DISCOURSE_URL || "https://forum.parchlinux.com";
        const discourseSecret =
          process.env.DISCOURSE_SSO_SECRET ||
          "ParchDiscourseSSOSecretKey2026";
        const baseURL =
          process.env.NEXT_PUBLIC_BASE_URL || "https://kan.parchlinux.com";

        const callbackURL = (ctx.query?.callbackURL as string) || "/boards";
        const nonce = crypto.randomBytes(16).toString("hex");

        await ctx.setSignedCookie(
          "kan_discourse_nonce",
          nonce,
          ctx.context.secret,
          {
            maxAge: 600,
            httpOnly: true,
            sameSite: "lax",
            path: "/",
          },
        );

        await ctx.setSignedCookie(
          "kan_discourse_callback",
          callbackURL,
          ctx.context.secret,
          {
            maxAge: 600,
            httpOnly: true,
            sameSite: "lax",
            path: "/",
          },
        );

        const returnUrl = `${baseURL}/api/auth/discourse/callback`;
        const payload = `nonce=${nonce}&return_sso_url=${encodeURIComponent(returnUrl)}`;
        const sso = Buffer.from(payload).toString("base64");
        const sig = crypto
          .createHmac("sha256", discourseSecret)
          .update(sso)
          .digest("hex");

        return ctx.redirect(
          `${discourseUrl}/session/sso_provider?sso=${encodeURIComponent(sso)}&sig=${sig}`,
        );
      },
    ),
    discourseCallback: createAuthEndpoint(
      "/discourse/callback",
      {
        method: "GET",
      },
      async (ctx) => {
        const sso = ctx.query?.sso as string;
        const sig = ctx.query?.sig as string;

        if (!sso || !sig) {
          throw new APIError("BAD_REQUEST", {
            message: "Missing sso or sig parameter",
          });
        }

        const discourseSecret =
          process.env.DISCOURSE_SSO_SECRET ||
          "ParchDiscourseSSOSecretKey2026";
        const expectedSig = crypto
          .createHmac("sha256", discourseSecret)
          .update(sso)
          .digest("hex");

        if (sig !== expectedSig) {
          log.warn(
            { sig, expectedSig },
            "Invalid SSO signature from Discourse",
          );
          throw new APIError("UNAUTHORIZED", {
            message: "Invalid SSO signature",
          });
        }

        const rawPayload = Buffer.from(sso, "base64").toString("utf-8");
        const params = new URLSearchParams(rawPayload);

        const nonce = params.get("nonce");
        const storedNonce = await ctx.getSignedCookie(
          "kan_discourse_nonce",
          ctx.context.secret,
        );

        if (!nonce || nonce !== storedNonce) {
          log.warn({ nonce, storedNonce }, "Invalid or expired SSO nonce");
          throw new APIError("UNAUTHORIZED", {
            message: "Invalid or expired SSO nonce",
          });
        }

        const email = params.get("email")?.toLowerCase();
        if (!email) {
          throw new APIError("BAD_REQUEST", {
            message: "No email provided by Discourse",
          });
        }

        const name =
          params.get("name") ||
          params.get("username") ||
          email.split("@")[0] ||
          "Parch User";
        const avatarUrl = params.get("avatar_url");

        // Find or create user in database
        let user = await db.query.users.findFirst({
          where: eq(schema.users.email, email),
        });

        if (!user) {
          const [createdUser] = await db
            .insert(schema.users)
            .values({
              email,
              name,
              emailVerified: true,
              image: avatarUrl || null,
            })
            .returning();
          user = createdUser;
        } else if (!user.image && avatarUrl) {
          await db
            .update(schema.users)
            .set({ image: avatarUrl })
            .where(eq(schema.users.id, user.id));
        }

        if (!user) {
          throw new APIError("INTERNAL_SERVER_ERROR", {
            message: "Failed to load user",
          });
        }

        // Create new session in session table
        const sessionToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const [createdSession] = await db
          .insert(schema.session)
          .values({
            token: sessionToken,
            userId: user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            expiresAt,
            userAgent: ctx.headers?.get("user-agent") ?? null,
          })
          .returning();

        if (!createdSession) {
          throw new APIError("INTERNAL_SERVER_ERROR", {
            message: "Failed to create session",
          });
        }

        await setSessionCookie(ctx, {
          session: {
            ...createdSession,
            id: String(createdSession.id),
          },
          user: {
            ...user,
            name: user.name ?? user.email.split("@")[0] ?? "Parch User",
          },
        });

        const storedCallback =
          (await ctx.getSignedCookie(
            "kan_discourse_callback",
            ctx.context.secret,
          )) || "/boards";

        return ctx.redirect(storedCallback);
      },
    ),
  },
});
