import { config } from "dotenv";
import { fileURLToPath } from "node:url";

import { parseServerEnv, type ServerEnv } from "@gloss/shared/env";

const repoEnvPath = fileURLToPath(new URL("../../../../.env", import.meta.url));
const repoEnvLocalPath = fileURLToPath(
  new URL("../../../../.env.local", import.meta.url),
);

const toEnvInput = (
  input: NodeJS.ProcessEnv | Record<string, string | undefined>,
): Record<string, string | undefined> =>
  Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value]),
  );

export const loadServerEnv = (
  input: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): ServerEnv => parseServerEnv(toEnvInput(input));

export const loadServerEnvFromDotenv = (): ServerEnv => {
  config({
    path: [repoEnvLocalPath, repoEnvPath],
    quiet: true,
  });

  return loadServerEnv(process.env);
};
