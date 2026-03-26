import type { Hono } from "hono";

import { sessionDataSchema } from "@gloss/shared/contracts";

import { jsonSuccess } from "../lib/http";
import type { GlossAuth } from "../lib/auth";
import { requireSession } from "../lib/session";
import type { ProfileService } from "../services/profile-service";

type MeRouteDependencies = {
  auth: GlossAuth;
  profileService: ProfileService;
};

export const registerMeRoute = (
  app: Hono<{ Variables: { requestId: string } }>,
  dependencies: MeRouteDependencies,
): void => {
  app.get("/api/me", async (context) => {
    const sessionData = await requireSession({
      auth: dependencies.auth,
      headers: context.req.raw.headers,
      requestId: context.get("requestId"),
    });

    const profile = await dependencies.profileService.getProfileByUserId(
      String(sessionData.user.id),
    );

    return jsonSuccess(
      context,
      sessionDataSchema.parse({
        profile:
          profile === null
            ? null
            : {
                createdAt: profile.createdAt.toISOString(),
                updatedAt: profile.updatedAt.toISOString(),
                userId: profile.userId,
              },
        session: {
          expiresAt: sessionData.session.expiresAt.toISOString(),
          id: String(sessionData.session.id),
          userId: String(sessionData.session.userId),
        },
        user: {
          email: sessionData.user.email,
          id: String(sessionData.user.id),
          image: sessionData.user.image ?? null,
          name: sessionData.user.name,
        },
      }),
    );
  });
};
