import { config } from "dotenv";

import { parseServerEnv, type ServerEnv } from "@gloss/shared/env";

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
  config();

  return loadServerEnv(process.env);
};
