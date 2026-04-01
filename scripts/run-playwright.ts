import { createServer } from "node:net";
import { spawn } from "node:child_process";

const findFreePort = async (preferredPort: number): Promise<number> =>
  await new Promise<number>((resolve, reject) => {
    const server = createServer();

    server.once("error", (error) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "EADDRINUSE"
      ) {
        const retryServer = createServer();

        retryServer.once("error", (retryError) => {
          reject(retryError);
        });

        retryServer.listen(0, "127.0.0.1", () => {
          const address = retryServer.address();

          if (!address || typeof address === "string") {
            reject(new Error("Failed to resolve a free Playwright port."));
            return;
          }

          retryServer.close((closeError) => {
            if (closeError) {
              reject(closeError);
              return;
            }

            resolve(address.port);
          });
        });

        return;
      }

      reject(error);
    });

    server.listen(preferredPort, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Failed to reserve the preferred Playwright port."));
        return;
      }

      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(address.port);
      });
    });
  });

const run = async (): Promise<void> => {
  const [apiPort, webPort] = await Promise.all([
    findFreePort(8878),
    findFreePort(4174),
  ]);
  const args = process.argv.slice(2);
  const child = spawn("bunx", ["playwright", "test", ...args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ENRICHMENT_PROVIDER_MODE: process.env.ENRICHMENT_PROVIDER_MODE ?? "live",
      PLAYWRIGHT_API_PORT: String(apiPort),
      PLAYWRIGHT_WEB_PORT: String(webPort),
    },
    stdio: "inherit",
  });

  await new Promise<void>((resolve, reject) => {
    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(`Playwright validation failed with exit code ${code ?? 1}.`),
      );
    });
  });
};

void run();
