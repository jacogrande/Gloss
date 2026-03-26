import { defineConfig } from "@playwright/test";

const repoRoot = process.cwd();
const apiOrigin = "http://127.0.0.1:8878";
const webOrigin = "http://127.0.0.1:4174";
const databaseUrl = "postgresql://gloss:gloss@127.0.0.1:54329/gloss";

export default defineConfig({
  fullyParallel: false,
  globalSetup: "./e2e/global-setup.ts",
  reporter: "line",
  testDir: "./e2e/specs",
  timeout: 30_000,
  use: {
    baseURL: webOrigin,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "bun run dev:api",
      cwd: repoRoot,
      env: {
        ...process.env,
        API_ORIGIN: apiOrigin,
        BETTER_AUTH_SECRET: "development-secret-value-at-least-32-chars",
        BETTER_AUTH_URL: apiOrigin,
        DATABASE_URL: databaseUrl,
        LOG_LEVEL: "error",
        NODE_ENV: "test",
        PORT: "8878",
        WEB_ORIGIN: webOrigin,
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: `${apiOrigin}/health`,
    },
    {
      command:
        "bun run dev:web -- --host 127.0.0.1 --port 4174 --strictPort",
      cwd: repoRoot,
      env: {
        ...process.env,
        VITE_API_BASE_URL: apiOrigin,
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: `${webOrigin}/login`,
    },
  ],
});
