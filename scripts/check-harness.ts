import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Failure = {
  check: string;
  message: string;
};

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const requiredFiles = [
  "AGENTS.md",
  "docs/HARNESS.md",
  "docs/PRODUCT.md",
  "docs/ROADMAP.md",
  "docs/ARCHITECTURE.md",
  "docs/DEPLOYMENT.md",
  "docs/FRONTEND.md",
  "docs/RELIABILITY.md",
  "docs/SECURITY.md",
  "docs/QUALITY_SCORE.md",
  "docs/evals/README.md",
  "docs/QA.md",
  "docs/plans/active/README.md",
  ".github/workflows/ci.yml",
];

const qualityScoreMaxAgeDays = 30;

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const readText = async (relativePath: string): Promise<string> =>
  readFile(path.join(repoRoot, relativePath), "utf8");

const extractBacktickPaths = (input: string): string[] =>
  Array.from(input.matchAll(/`([^`]+)`/g), (match) => match[1] ?? "");

const isMarkdownPath = (value: string): boolean =>
  value.endsWith(".md") || value.includes("*.md");

const isDatasetPath = (value: string): boolean => value.endsWith(".jsonl");

const normalizeRelativePath = (value: string): string =>
  value.startsWith("./") ? value.slice(2) : value;

const checkRequiredFiles = async (): Promise<Failure[]> => {
  const failures: Failure[] = [];

  for (const relativePath of requiredFiles) {
    if (!(await fileExists(path.join(repoRoot, relativePath)))) {
      failures.push({
        check: "required_files",
        message: `Missing required file: ${relativePath}`,
      });
    }
  }

  return failures;
};

const checkAgentsReadOrder = async (): Promise<Failure[]> => {
  const agents = await readText("AGENTS.md");
  const failures: Failure[] = [];
  const readOrderLines = agents
    .split("\n")
    .filter((line) => /^\d+\.\s+`/.test(line));
  const paths = readOrderLines
    .flatMap((line) => extractBacktickPaths(line))
    .filter(isMarkdownPath);

  for (const rawPath of paths) {
    const relativePath = normalizeRelativePath(rawPath);

    if (relativePath.includes("*")) {
      const directoryPath = relativePath.slice(0, relativePath.indexOf("*") - 1);
      const absoluteDirectoryPath = path.join(repoRoot, directoryPath);
      const entries = await readdir(absoluteDirectoryPath);
      const matchingEntries = entries.filter(
        (entry) => entry.endsWith(".md") && entry !== "README.md",
      );

      if (matchingEntries.length === 0) {
        failures.push({
          check: "agents_read_order",
          message: `Expected at least one plan file matching ${relativePath}.`,
        });
      }

      continue;
    }

    if (!(await fileExists(path.join(repoRoot, relativePath)))) {
      failures.push({
        check: "agents_read_order",
        message: `AGENTS.md points to a missing file: ${relativePath}`,
      });
    }
  }

  return failures;
};

const checkHarnessScriptLinks = async (): Promise<Failure[]> => {
  const harnessDoc = await readText("docs/HARNESS.md");
  const packageJson = JSON.parse(await readText("package.json")) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};
  const failures: Failure[] = [];
  const scriptNames = Array.from(
    harnessDoc.matchAll(/- `bun run ([^`]+)`/g),
    (match) => match[1] ?? "",
  );

  for (const scriptName of scriptNames) {
    if (!(scriptName in scripts)) {
      failures.push({
        check: "harness_scripts",
        message: `docs/HARNESS.md references missing script bun run ${scriptName}.`,
      });
    }
  }

  return failures;
};

const checkHarnessDocumentLinks = async (): Promise<Failure[]> => {
  const harnessDoc = await readText("docs/HARNESS.md");
  const failures: Failure[] = [];
  const documentPaths = Array.from(
    harnessDoc.matchAll(/- `(docs\/[^`]+\.md)`:/g),
    (match) => match[1] ?? "",
  );

  for (const relativePath of documentPaths) {
    if (!(await fileExists(path.join(repoRoot, relativePath)))) {
      failures.push({
        check: "harness_docs",
        message: `docs/HARNESS.md references missing document ${relativePath}.`,
      });
    }
  }

  return failures;
};

const checkEvalDatasets = async (): Promise<Failure[]> => {
  const evalDoc = await readText("docs/evals/README.md");
  const failures: Failure[] = [];
  const datasetPaths = extractBacktickPaths(evalDoc)
    .filter(isDatasetPath)
    .map((value) =>
      value.startsWith("docs/")
        ? value
        : path.join("docs", "evals", "datasets", value),
    );

  for (const relativePath of datasetPaths) {
    if (!(await fileExists(path.join(repoRoot, relativePath)))) {
      failures.push({
        check: "eval_datasets",
        message: `docs/evals/README.md references missing dataset ${relativePath}.`,
      });
    }
  }

  return failures;
};

const checkActivePlans = async (): Promise<Failure[]> => {
  const plansDirectory = path.join(repoRoot, "docs", "plans", "active");
  const entries = await readdir(plansDirectory);
  const failures: Failure[] = [];
  const planFiles = entries.filter(
    (entry) => entry.endsWith(".md") && entry !== "README.md",
  );

  for (const planFile of planFiles) {
    const relativePath = path.join("docs", "plans", "active", planFile);
    const content = await readText(relativePath);

    for (const heading of ["## Goal", "## Validation"]) {
      if (!content.includes(heading)) {
        failures.push({
          check: "plan_shape",
          message: `${relativePath} is missing required section ${heading}.`,
        });
      }
    }
  }

  return failures;
};

const checkQualityScoreFreshness = async (): Promise<Failure[]> => {
  const content = await readText("docs/QUALITY_SCORE.md");
  const match = content.match(/Status as of `(\d{4}-\d{2}-\d{2})`/);

  if (!match?.[1]) {
    return [
      {
        check: "quality_score_freshness",
        message:
          "docs/QUALITY_SCORE.md is missing a `Status as of `YYYY-MM-DD`` line.",
      },
    ];
  }

  const recordedDate = new Date(`${match[1]}T00:00:00Z`);
  const now = new Date();
  const ageMs = now.getTime() - recordedDate.getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  if (Number.isNaN(recordedDate.getTime()) || ageDays > qualityScoreMaxAgeDays) {
    return [
      {
        check: "quality_score_freshness",
        message: `docs/QUALITY_SCORE.md is stale (${ageDays} days old).`,
      },
    ];
  }

  return [];
};

const run = async (): Promise<void> => {
  const failures = (
    await Promise.all([
      checkRequiredFiles(),
      checkAgentsReadOrder(),
      checkHarnessScriptLinks(),
      checkHarnessDocumentLinks(),
      checkEvalDatasets(),
      checkActivePlans(),
      checkQualityScoreFreshness(),
    ])
  ).flat();

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`${failure.check}: ${failure.message}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify({
      checks: 7,
      status: "passed",
    }),
  );
};

void run();
