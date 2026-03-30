import { betterAuth } from "better-auth";
import type { Auth, BetterAuthOptions } from "better-auth/types";
import type { Pool } from "pg";

import type { ServerEnv } from "@gloss/shared/env";

import type { Logger } from "./logger";
import type { ProfileService } from "../services/profile-service";

export type AuthDependencies = {
  env: ServerEnv;
  logger: Logger;
  pool: Pool;
  profileService: ProfileService;
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
    user: {
      create: {
        after: (user: { id: string }) => Promise<void>;
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
}: Pick<AuthDependencies, "env" | "pool" | "profileService">): GlossAuthOptions =>
  ({
    advanced: resolveAuthAdvancedOptions(env),
    basePath: "/api/auth",
    baseURL: env.BETTER_AUTH_URL,
    database: pool,
    databaseHooks: {
      user: {
        create: {
          after: async (user: { id: string }) => {
            await profileService.ensureProfile(String(user.id));
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
  logger: _logger,
  pool,
  profileService,
}: AuthDependencies): GlossAuth =>
  betterAuth(createAuthOptions({ env, pool, profileService }));
