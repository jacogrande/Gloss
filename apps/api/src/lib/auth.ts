import { betterAuth } from "better-auth";
import type { Auth, BetterAuthOptions } from "better-auth/types";
import type { Pool } from "pg";

import { productEventSchemaVersion } from "@gloss/shared/contracts";
import type { ServerEnv } from "@gloss/shared/env";

import type { Logger } from "./logger";
import type { ProfileService } from "../services/profile-service";
import type { ProductEventService } from "../services/product-event-service";

export type AuthDependencies = {
  env: ServerEnv;
  logger: Logger;
  pool: Pool;
  profileService: ProfileService;
  productEventService: ProductEventService;
};

type GlossAdvancedAuthOptions = NonNullable<BetterAuthOptions["advanced"]> & {
  useSecureCookies: boolean;
};

type GlossAuthOptions = BetterAuthOptions & {
  advanced: GlossAdvancedAuthOptions;
  basePath: "/api/auth";
  baseURL: string;
  database: Pool;
  databaseHooks: {
    session: {
      create: {
        after: (
          session: { id: string; userId: string },
          context?: { path?: string } | null,
        ) => Promise<void>;
      };
    };
    user: {
      create: {
        after: (
          user: { id: string },
          context?: { path?: string } | null,
        ) => Promise<void>;
      };
    };
  };
  emailAndPassword: {
    autoSignIn: true;
    enabled: true;
    minPasswordLength: 8;
    requireEmailVerification: false;
  };
  secret: string;
  trustedOrigins: string[];
};

export const resolveAuthTrustedOrigins = (
  env: Pick<ServerEnv, "API_ORIGIN" | "BETTER_AUTH_URL" | "WEB_ORIGIN">,
): string[] =>
  Array.from(new Set([env.WEB_ORIGIN, env.API_ORIGIN, env.BETTER_AUTH_URL]));

export const resolveAuthAdvancedOptions = (
  env: Pick<ServerEnv, "API_ORIGIN" | "BETTER_AUTH_URL" | "COOKIE_DOMAIN">,
): GlossAdvancedAuthOptions => ({
  ...(env.COOKIE_DOMAIN
    ? {
        crossSubDomainCookies: {
          domain: env.COOKIE_DOMAIN,
          enabled: true,
        },
      }
    : {}),
  useSecureCookies:
    env.API_ORIGIN.startsWith("https://") ||
    env.BETTER_AUTH_URL.startsWith("https://"),
});

export const createAuthOptions = ({
  env,
  pool,
  profileService,
  productEventService,
  logger,
}: Pick<
  AuthDependencies,
  "env" | "logger" | "pool" | "productEventService" | "profileService"
>): GlossAuthOptions =>
  ({
    advanced: resolveAuthAdvancedOptions(env),
    basePath: "/api/auth",
    baseURL: env.BETTER_AUTH_URL,
    database: pool,
    databaseHooks: {
      session: {
        create: {
          after: async (
            session: { id: string; userId: string },
            context?: { path?: string } | null,
          ) => {
            if (context?.path !== "/sign-in/email") {
              return;
            }

            try {
              await productEventService.record({
                actorTag: String(session.userId),
                occurredAt: new Date().toISOString(),
                payload: {
                  method: "email_password",
                },
                schemaVersion: productEventSchemaVersion,
                sessionId: String(session.id),
                type: "auth.sign_in",
                userId: String(session.userId),
              });
            } catch (error) {
              logger.warn("product_event.record_failed", {
                eventType: "auth.sign_in",
                sessionId: String(session.id),
                userId: String(session.userId),
                error:
                  error instanceof Error
                    ? error.message
                    : "Unexpected non-error while recording product event.",
              });
            }
          },
        },
      },
      user: {
        create: {
          after: async (user: { id: string }) => {
            await profileService.ensureProfile(String(user.id));

            try {
              await productEventService.record({
                actorTag: String(user.id),
                occurredAt: new Date().toISOString(),
                payload: {
                  method: "email_password",
                },
                schemaVersion: productEventSchemaVersion,
                type: "auth.sign_up",
                userId: String(user.id),
              });
            } catch (error) {
              logger.warn("product_event.record_failed", {
                eventType: "auth.sign_up",
                userId: String(user.id),
                error:
                  error instanceof Error
                    ? error.message
                    : "Unexpected non-error while recording product event.",
              });
            }
          },
        },
      },
    },
    emailAndPassword: {
      autoSignIn: true,
      enabled: true,
      minPasswordLength: 8,
      requireEmailVerification: false,
    },
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: resolveAuthTrustedOrigins(env),
  }) satisfies GlossAuthOptions;

export type GlossAuth = Auth<GlossAuthOptions>;

export const createAuth = ({
  env,
  logger,
  pool,
  profileService,
  productEventService,
}: AuthDependencies): GlossAuth =>
  betterAuth(
    createAuthOptions({
      env,
      logger,
      pool,
      productEventService,
      profileService,
    }),
  );
