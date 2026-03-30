import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type DatasetKey =
  | "capture"
  | "enrichment"
  | "enrichment-live"
  | "review"
  | "mvp";

type ParsedArgs = {
  category: string | null;
  dataset: DatasetKey | null;
  expected: string | null;
  id: string | null;
  input: string | null;
  journey: string | null;
  note: string | null;
  printTemplate: boolean;
};

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const datasetPathByKey: Record<DatasetKey, string> = {
  capture: path.join(
    repoRoot,
    "docs",
    "evals",
    "datasets",
    "capture_journeys.jsonl",
  ),
  enrichment: path.join(
    repoRoot,
    "docs",
    "evals",
    "datasets",
    "enrichment_journeys.jsonl",
  ),
  "enrichment-live": path.join(
    repoRoot,
    "docs",
    "evals",
    "datasets",
    "enrichment_journeys_live.jsonl",
  ),
  review: path.join(
    repoRoot,
    "docs",
    "evals",
    "datasets",
    "review_journeys.jsonl",
  ),
  mvp: path.join(
    repoRoot,
    "docs",
    "evals",
    "datasets",
    "mvp_seed_journeys.jsonl",
  ),
};

const parseArgs = (argv: string[]): ParsedArgs => {
  const result: ParsedArgs = {
    category: null,
    dataset: null,
    expected: null,
    id: null,
    input: null,
    journey: null,
    note: null,
    printTemplate: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current || !current.startsWith("--")) {
      continue;
    }

    const [rawKey, inlineValue] = current.slice(2).split("=", 2);
    const nextValue = inlineValue ?? argv[index + 1];
    const hasExplicitValue = inlineValue !== undefined || nextValue !== undefined;
    const value =
      inlineValue !== undefined
        ? inlineValue
        : argv[index + 1]?.startsWith("--")
          ? undefined
          : nextValue;

    if (inlineValue === undefined && value !== undefined) {
      index += 1;
    }

    switch (rawKey) {
      case "category":
        result.category = value ?? null;
        break;
      case "dataset":
        result.dataset =
          value === "capture" ||
          value === "enrichment" ||
          value === "enrichment-live" ||
          value === "review" ||
          value === "mvp"
            ? value
            : null;
        break;
      case "id":
        result.id = value ?? null;
        break;
      case "journey":
        result.journey = value ?? null;
        break;
      case "input":
        result.input = value ?? null;
        break;
      case "expected":
        result.expected = value ?? null;
        break;
      case "note":
        result.note = value ?? null;
        break;
      case "print-template":
        result.printTemplate = !hasExplicitValue || value !== "false";
        break;
      default:
        throw new Error(`Unknown flag --${rawKey}.`);
    }
  }

  return result;
};

const parseJson = (label: "expected" | "input", rawValue: string): unknown => {
  try {
    return JSON.parse(rawValue) as unknown;
  } catch (error) {
    throw new Error(
      `Invalid ${label} JSON: ${error instanceof Error ? error.message : "unknown error"}`,
      {
        cause: error,
      },
    );
  }
};

const printTemplate = (dataset: DatasetKey = "enrichment"): void => {
  const template = {
    category:
      dataset === "capture"
        ? "capture_regression"
        : dataset === "review"
          ? "review_regression"
          : "enrichment_regression",
    expected: {
      ...(dataset === "review"
        ? {
            due_count_at_least: 1,
            error_code: null,
            status: "reviewable",
          }
        : {
            status: dataset === "capture" ? "n/a" : "ready",
          }),
    },
    id: "replace_me",
    input: {
      word: "replace_me",
    },
    journey: "replace_me",
    note: "Add the production failure or regression this case protects against.",
  };

  console.log(JSON.stringify(template, null, 2));
};

const run = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));

  if (args.printTemplate) {
    printTemplate(args.dataset ?? undefined);
    return;
  }

  if (
    !args.category ||
    !args.dataset ||
    !args.id ||
    !args.journey ||
    !args.input ||
    !args.expected ||
    !args.note
  ) {
    throw new Error(
      "Missing required flags. Use --dataset, --category, --id, --journey, --input, --expected, and --note.",
    );
  }

  const datasetPath = datasetPathByKey[args.dataset];

  if (!datasetPath) {
    throw new Error(`Unsupported dataset ${args.dataset}.`);
  }

  const existingLines = (await readFile(datasetPath, "utf8"))
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const duplicate = existingLines.some((line) => {
    const parsed = JSON.parse(line) as { id?: string };

    return parsed.id === args.id;
  });

  if (duplicate) {
    throw new Error(`Dataset ${args.dataset} already contains case id ${args.id}.`);
  }

  const nextRow = {
    category: args.category,
    expected: parseJson("expected", args.expected),
    id: args.id,
    input: parseJson("input", args.input),
    journey: args.journey,
    note: args.note,
  };

  await appendFile(datasetPath, `${JSON.stringify(nextRow)}\n`, "utf8");

  console.log(
    JSON.stringify({
      dataset: args.dataset,
      id: args.id,
      status: "appended",
    }),
  );
};

void run();
