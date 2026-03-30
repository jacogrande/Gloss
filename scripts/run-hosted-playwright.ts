import { spawn } from "node:child_process";

const parseFlagValue = (
  args: string[],
  flag: "--api-origin" | "--web-origin",
): string | undefined => {
  const index = args.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
};

const stripRunnerFlags = (args: string[]): string[] => {
  const stripped: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === undefined) {
      continue;
    }

    if (current === "--api-origin" || current === "--web-origin") {
      index += 1;
      continue;
    }

    stripped.push(current);
  }

  return stripped;
};

const assertUrl = (label: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`${label} is required. Pass it with the CLI flag or environment.`);
  }

  return new URL(value).origin;
};

const run = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const webOrigin = assertUrl(
    "Hosted web origin",
    parseFlagValue(args, "--web-origin") ?? process.env.PLAYWRIGHT_HOSTED_WEB_ORIGIN,
  );
  const apiOrigin = assertUrl(
    "Hosted API origin",
    parseFlagValue(args, "--api-origin") ?? process.env.PLAYWRIGHT_HOSTED_API_ORIGIN,
  );
  const forwardedArgs = stripRunnerFlags(args);
  const child = spawn("bunx", ["playwright", "test", ...forwardedArgs], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PLAYWRIGHT_API_ORIGIN: apiOrigin,
      PLAYWRIGHT_BASE_URL: webOrigin,
      PLAYWRIGHT_HOSTED: "1",
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
        new Error(
          `Hosted Playwright validation failed with exit code ${code ?? 1}.`,
        ),
      );
    });
  });
};

void run();
