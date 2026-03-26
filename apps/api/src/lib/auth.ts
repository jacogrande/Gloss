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

type GlossAuthOptions = BetterAuthOptions & {
  advanced: {
    useSecureCookies: boolean;
  };
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

const createAuthOptions = ({
  env,
  pool,
  profileService,
}: Pick<AuthDependencies, "env" | "pool" | "profileService">): GlossAuthOptions =>
  ({
    advanced: {
      useSecureCookies: env.API_ORIGIN.startsWith("https://"),
    },
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
    trustedOrigins: [env.WEB_ORIGIN, env.API_ORIGIN],
  }) satisfies GlossAuthOptions;

export type GlossAuth = Auth<GlossAuthOptions>;

export const createAuth = ({
  env,
  logger: _logger,
  pool,
  profileService,
}: AuthDependencies): GlossAuth =>
  betterAuth(createAuthOptions({ env, pool, profileService }));
