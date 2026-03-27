import { spawn } from "node:child_process";

const requiredLiveEnvNames = [
  "OPENAI_API_KEY",
  "MERRIAM_WEBSTER_DICTIONARY_API_KEY",
  "MERRIAM_WEBSTER_THESAURUS_API_KEY",
] as const;

type LiveBrowserMode = "full" | "smoke";

const getMode = (args: string[]): LiveBrowserMode =>
  args.includes("--full") ? "full" : "smoke";

const getForwardedArgs = (args: string[]): string[] =>
  args.filter((arg) => arg !== "--full");

const findMissingEnvNames = (input: NodeJS.ProcessEnv): string[] =>
  requiredLiveEnvNames.filter((name) => {
    const value = input[name];

    return typeof value !== "string" || value.trim().length === 0;
  });

const createLiveEnv = (input: NodeJS.ProcessEnv): NodeJS.ProcessEnv => {
  const missingEnvNames = findMissingEnvNames(input);

  if (missingEnvNames.length > 0) {
    throw new Error(
      [
        "Live browser validation requires real enrichment credentials.",
        `Missing: ${missingEnvNames.join(", ")}`,
        "Set those env vars and rerun `bun run smoke:live` or `bun run test:e2e:live`.",
      ].join(" "),
    );
  }

  return {
    ...input,
    ENRICHMENT_PROVIDER_MODE: "live",
  };
};

const createPlaywrightArgs = (input: {
  forwardedArgs: string[];
  mode: LiveBrowserMode;
}): string[] => [
  "playwright",
  "test",
  ...(input.mode === "smoke" ? ["--grep", "@smoke"] : []),
  ...input.forwardedArgs,
];

const run = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const mode = getMode(args);
  const child = spawn(
    "bunx",
    createPlaywrightArgs({
      forwardedArgs: getForwardedArgs(args),
      mode,
    }),
    {
      cwd: process.cwd(),
      env: createLiveEnv(process.env),
      stdio: "inherit",
    },
  );

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
          `Live browser validation failed with exit code ${code ?? 1}.`,
        ),
      );
    });
  });
};

void run();
