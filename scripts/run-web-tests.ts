import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const webDirectory = path.join(repoRoot, "apps", "web");
const vitestEntrypoint = path.join(
  repoRoot,
  "node_modules",
  "vitest",
  "vitest.mjs",
);

const createEnvArgs = (input: NodeJS.ProcessEnv): string[] => {
  const pathValue = input.PATH;
  const homeValue = input.HOME;

  if (!pathValue || !homeValue) {
    throw new Error("PATH and HOME must be defined to run web tests.");
  }

  const envArgs = [
    "-i",
    `PATH=${pathValue}`,
    `HOME=${homeValue}`,
    `TERM=${input.TERM ?? "dumb"}`,
    "node",
    vitestEntrypoint,
    "run",
  ];

  if (typeof input.CI === "string" && input.CI.length > 0) {
    envArgs.splice(4, 0, `CI=${input.CI}`);
  }

  if (
    typeof input.FORCE_COLOR === "string" &&
    input.FORCE_COLOR.length > 0
  ) {
    envArgs.splice(4, 0, `FORCE_COLOR=${input.FORCE_COLOR}`);
  }

  return envArgs;
};

const run = async (): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn("env", createEnvArgs(process.env), {
      cwd: webDirectory,
      stdio: "inherit",
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Web tests failed with exit code ${code ?? 1}.`));
    });
  });

void run();
