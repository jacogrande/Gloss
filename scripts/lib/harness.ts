import { createAppRuntime, type AppRuntime } from "../../apps/api/src/lib/app-runtime";
import type { ServerEnv } from "@gloss/shared/env";

import { resolveScriptEnv } from "./env";

export const extractCookies = (response: Response): string => {
  const header =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie().join("; ")
      : response.headers.get("set-cookie");

  if (!header) {
    throw new Error("Expected auth response to include a session cookie.");
  }

  return header
    .split(/,(?=[^;]+?=)/)
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter((cookie): cookie is string => Boolean(cookie))
    .join("; ");
};

export const prepareLocalHarness = (): {
  env: ServerEnv;
  runtime: AppRuntime;
} => {
  const env = resolveScriptEnv();

  const runtime = createAppRuntime({ env });

  return {
    env,
    runtime,
  };
};

export const signUpHarnessUser = async (input: {
  app: AppRuntime["app"];
  apiOrigin: string;
  email: string;
  name: string;
  password?: string;
  webOrigin: string;
}): Promise<string> => {
  const response = await input.app.request(
    new URL("/api/auth/sign-up/email", `${input.apiOrigin}/`).toString(),
    {
      body: JSON.stringify({
        email: input.email,
        name: input.name,
        password: input.password ?? "password1234",
      }),
      headers: {
        "content-type": "application/json",
        origin: input.webOrigin,
      },
      method: "POST",
    },
  );

  if (response.status !== 200) {
    throw new Error(`Failed to sign up harness user ${input.email}.`);
  }

  return extractCookies(response);
};
