import { ensureLocalDatabaseExists, ensureLocalPostgresStarted } from "../apps/api/src/lib/local-postgres";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://gloss:gloss@127.0.0.1:54329/gloss";

const run = async (): Promise<void> => {
  await ensureLocalPostgresStarted({ databaseUrl });
  await ensureLocalDatabaseExists(databaseUrl);

  console.log(
    JSON.stringify({
      databaseUrl,
      status: "started",
    }),
  );
};

void run();
