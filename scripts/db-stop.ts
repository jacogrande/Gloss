import { stopLocalPostgres } from "../apps/api/src/lib/local-postgres";

const run = async (): Promise<void> => {
  await stopLocalPostgres();

  console.log(
    JSON.stringify({
      status: "stopped",
    }),
  );
};

void run();
