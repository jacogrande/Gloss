import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadServerEnvFromDotenv } from "../apps/api/src/lib/env";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const apiDirectory = path.join(repoRoot, "apps", "api");
const webDirectory = path.join(repoRoot, "apps", "web");

type SpawnedService = {
  child: ChildProcess;
  name: "api" | "web";
};

const apiBindHost = "0.0.0.0";
const requiredLiveEnvNames = [
  "OPENAI_API_KEY",
  "MERRIAM_WEBSTER_DICTIONARY_API_KEY",
  "MERRIAM_WEBSTER_THESAURUS_API_KEY",
] as const;

const isRecoverablePortError = (error: unknown): boolean =>
  error instanceof Error &&
  "code" in error &&
  (error.code === "EADDRINUSE" || error.code === "EACCES");

const isPortAvailable = async (
  host: string,
  port: number,
): Promise<boolean> =>
  new Promise((resolve, reject) => {
    const server = createServer();

    server.unref();
    server.once("error", (error) => {
      server.close();

      if (isRecoverablePortError(error)) {
        resolve(false);
        return;
      }

      reject(error);
    });
    server.listen({ host, port }, () => {
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(true);
      });
    });
  });

const findAvailablePort = async (
  host: string,
  preferredPort: number,
): Promise<number> => {
  for (let port = preferredPort; port < preferredPort + 50; port += 1) {
    if (await isPortAvailable(host, port)) {
      return port;
    }
  }

  throw new Error(
    `Unable to find an available port for host ${host} near ${preferredPort}.`,
  );
};

const formatOrigin = (input: URL, port: number): string => {
  const next = new URL(input.origin);

  next.port = String(port);

  return next.origin;
};

const hasCompleteLiveCredentials = (
  env: NodeJS.ProcessEnv,
): boolean =>
  requiredLiveEnvNames.every((name) => {
    const value = env[name];

    return typeof value === "string" && value.trim().length > 0;
  });

const resolveLocalEnrichmentProviderMode = (
  env: NodeJS.ProcessEnv,
): "fixture" | "live" => {
  const configuredMode = env.ENRICHMENT_PROVIDER_MODE;

  if (configuredMode === "fixture" || configuredMode === "live") {
    return configuredMode;
  }

  return hasCompleteLiveCredentials(env) ? "live" : "fixture";
};

const spawnService = (options: {
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  name: "api" | "web";
}): SpawnedService => ({
  child: spawn("bun", options.args, {
    cwd: options.cwd,
    env: options.env,
    stdio: "inherit",
  }),
  name: options.name,
});

const waitForExit = async (
  child: ChildProcess,
  timeoutMs: number,
): Promise<void> =>
  new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      if (child.exitCode === null && !child.killed) {
        child.kill("SIGKILL");
      }

      resolve();
    }, timeoutMs);

    child.once("exit", () => {
      clearTimeout(timeoutId);
      resolve();
    });
  });

const run = async (): Promise<void> => {
  const baseEnv = loadServerEnvFromDotenv();
  const preferredApiOrigin = new URL(baseEnv.API_ORIGIN);
  const preferredWebOrigin = new URL(baseEnv.WEB_ORIGIN);
  const apiPort = await findAvailablePort(
    apiBindHost,
    baseEnv.PORT,
  );
  const preferredWebPort =
    preferredWebOrigin.port.length > 0
      ? Number.parseInt(preferredWebOrigin.port, 10)
      : 5173;
  const webPort = await findAvailablePort(
    preferredWebOrigin.hostname,
    preferredWebPort,
  );
  const enrichmentProviderMode = resolveLocalEnrichmentProviderMode(process.env);
  const apiOrigin = formatOrigin(preferredApiOrigin, apiPort);
  const webOrigin = formatOrigin(preferredWebOrigin, webPort);

  console.log(
    JSON.stringify({
      apiOrigin,
      enrichmentProviderMode,
      preferredApiPort: baseEnv.PORT,
      preferredWebPort,
      status: "starting",
      webOrigin,
    }),
  );

  const sharedEnv: NodeJS.ProcessEnv = {
    ...process.env,
    API_ORIGIN: apiOrigin,
    BETTER_AUTH_SECRET: baseEnv.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: apiOrigin,
    COOKIE_DOMAIN: baseEnv.COOKIE_DOMAIN,
    DATABASE_URL: baseEnv.DATABASE_URL,
    ENRICHMENT_PROVIDER_MODE: enrichmentProviderMode,
    LOG_LEVEL: baseEnv.LOG_LEVEL,
    MERRIAM_WEBSTER_DICTIONARY_API_KEY:
      process.env.MERRIAM_WEBSTER_DICTIONARY_API_KEY,
    MERRIAM_WEBSTER_THESAURUS_API_KEY:
      process.env.MERRIAM_WEBSTER_THESAURUS_API_KEY,
    NODE_ENV: baseEnv.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    WEB_ORIGIN: webOrigin,
  };

  const services: SpawnedService[] = [
    spawnService({
      args: ["run", "dev"],
      cwd: apiDirectory,
      env: {
        ...sharedEnv,
        PORT: String(apiPort),
      },
      name: "api",
    }),
    spawnService({
      args: [
        "run",
        "dev",
        "--",
        "--host",
        preferredWebOrigin.hostname,
        "--port",
        String(webPort),
        "--strictPort",
      ],
      cwd: webDirectory,
      env: {
        ...sharedEnv,
        VITE_API_BASE_URL: apiOrigin,
      },
      name: "web",
    }),
  ];

  let isShuttingDown = false;

  const shutdown = (exitCode: number): void => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;

    void (async () => {
      for (const service of services) {
        if (service.child.exitCode === null && !service.child.killed) {
          service.child.kill("SIGTERM");
        }
      }

      await Promise.all(
        services.map((service) => waitForExit(service.child, 1_000)),
      );

      process.exit(exitCode);
    })();
  };

  for (const service of services) {
    service.child.on("error", (error) => {
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          service: service.name,
          status: "failed_to_spawn",
        }),
      );
      shutdown(1);
    });
    service.child.on("exit", (code, signal) => {
      if (isShuttingDown) {
        return;
      }

      console.error(
        JSON.stringify({
          code,
          service: service.name,
          signal,
          status: "exited",
        }),
      );
      shutdown(code ?? 1);
    });
  }

  process.on("SIGINT", () => {
    shutdown(0);
  });
  process.on("SIGTERM", () => {
    shutdown(0);
  });
};

void run();
