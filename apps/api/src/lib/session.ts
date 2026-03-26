import { unauthorizedError } from "@gloss/shared/errors";

import type { GlossAuth } from "./auth";

type SessionResult = NonNullable<
  Awaited<ReturnType<GlossAuth["api"]["getSession"]>>
>;

export type AuthenticatedSession = {
  session: NonNullable<SessionResult["session"]>;
  user: NonNullable<SessionResult["user"]>;
};

export const requireSession = async (options: {
  auth: GlossAuth;
  headers: Headers;
  requestId?: string;
}): Promise<AuthenticatedSession> => {
  const sessionData = await options.auth.api.getSession({
    headers: options.headers,
  });

  if (!sessionData?.session || !sessionData.user) {
    throw unauthorizedError(options.requestId);
  }

  return {
    session: sessionData.session,
    user: sessionData.user,
  };
};
