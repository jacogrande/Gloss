import { resolveScriptEnv } from "./lib/env";
import { resetLocalDatabase } from "./lib/local-reset";

const run = async (): Promise<void> => {
  const env = resolveScriptEnv();
  const seedResult = await resetLocalDatabase(env);

  console.log(
    JSON.stringify({
      databaseUrl: env.DATABASE_URL,
      seedResult,
      status: "reset",
    }),
  );
};

void run();
