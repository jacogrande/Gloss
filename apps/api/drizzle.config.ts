import "dotenv/config";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://gloss:gloss@127.0.0.1:54329/gloss",
  },
  dialect: "postgresql",
  out: "../../db/migrations",
  schema: "./src/db/schema.ts",
  strict: true,
  verbose: true,
});
