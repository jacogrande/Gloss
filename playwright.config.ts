import { defineConfig } from "@playwright/test";

const repoRoot = process.cwd();
const databaseUrl = "postgresql://gloss:gloss@127.0.0.1:54329/gloss";
const isHostedRun = process.env.PLAYWRIGHT_HOSTED === "1";
const apiPort = Number(process.env.PLAYWRIGHT_API_PORT ?? "8878");
const webPort = Number(process.env.PLAYWRIGHT_WEB_PORT ?? "4174");
const apiOrigin = `http://127.0.0.1:${String(apiPort)}`;
const webOrigin = `http://127.0.0.1:${String(webPort)}`;
const hostedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  fullyParallel: false,
  globalSetup: isHostedRun ? undefined : "./e2e/global-setup.ts",
  reporter: "line",
  testDir: "./e2e/specs",
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL: isHostedRun ? hostedBaseUrl : webOrigin,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: isHostedRun
    ? undefined
    : [
        {
          command: "bun run dev:api",
          cwd: repoRoot,
          env: {
            ...process.env,
            API_ORIGIN: apiOrigin,
            BETTER_AUTH_SECRET: "development-secret-value-at-least-32-chars",
            BETTER_AUTH_URL: apiOrigin,
            DATABASE_URL: databaseUrl,
            ENRICHMENT_PROVIDER_MODE:
              process.env.ENRICHMENT_PROVIDER_MODE ?? "live",
            LOG_LEVEL: "error",
            NODE_ENV: "test",
            PORT: String(apiPort),
            WEB_ORIGIN: webOrigin,
          },
          reuseExistingServer: false,
          timeout: 120_000,
          url: `${apiOrigin}/health`,
        },
        {
          command:
            `bun run dev:web -- --host 127.0.0.1 --port ${String(webPort)} --strictPort`,
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
