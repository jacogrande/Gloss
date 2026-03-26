import { createAuthClient } from "better-auth/react";

import { webEnv } from "../../lib/env";

export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
  basePath: "/api/auth",
  baseURL: webEnv.VITE_API_BASE_URL,
  fetchOptions: {
    credentials: "include",
  },
});
