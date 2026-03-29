import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Failure = {
  file: string;
  importSource: string;
  rule: string;
};

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const apiRoot = path.join(repoRoot, "apps", "api");
const apiSrcRoot = path.join(apiRoot, "src");
const webRoot = path.join(repoRoot, "apps", "web");
const webSrcRoot = path.join(webRoot, "src");
const sharedRoot = path.join(repoRoot, "packages", "shared");
const sharedSrcRoot = path.join(sharedRoot, "src");

const walk = async (directoryPath: string): Promise<string[]> => {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        return walk(absolutePath);
      }

      if (!/\.(ts|tsx)$/u.test(entry.name)) {
        return [];
      }

      return [absolutePath];
    }),
  );

  return nested.flat();
};

const extractImportSources = (content: string): string[] => {
  const matches = [
    ...content.matchAll(/from\s+["']([^"']+)["']/g),
    ...content.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g),
  ];

  return Array.from(new Set(matches.map((match) => match[1] ?? ""))).filter(
    (value) => value.length > 0,
  );
};

const normalizePath = (value: string): string => path.normalize(value);

const resolveImportPath = (
  filePath: string,
  importSource: string,
): string | null => {
  if (!importSource.startsWith(".")) {
    return null;
  }

  return normalizePath(path.resolve(path.dirname(filePath), importSource));
};

const isInside = (targetPath: string | null, parentPath: string): boolean =>
  targetPath !== null &&
  (targetPath === parentPath || targetPath.startsWith(`${parentPath}${path.sep}`));

const checkFile = async (filePath: string): Promise<Failure[]> => {
  const content = await readFile(filePath, "utf8");
  const importSources = extractImportSources(content);
  const failures: Failure[] = [];
  const resolvedSources = importSources.map((importSource) => ({
    importSource,
    resolvedPath: resolveImportPath(filePath, importSource),
  }));

  for (const { importSource, resolvedPath } of resolvedSources) {
    if (
      isInside(filePath, webRoot) &&
      (isInside(resolvedPath, apiRoot) || importSource.includes("apps/api"))
    ) {
      failures.push({
        file: path.relative(repoRoot, filePath),
        importSource,
        rule: "web_must_not_depend_on_api",
      });
    }

    if (
      isInside(filePath, apiRoot) &&
      (isInside(resolvedPath, webRoot) || importSource.includes("apps/web"))
    ) {
      failures.push({
        file: path.relative(repoRoot, filePath),
        importSource,
        rule: "api_must_not_depend_on_web",
      });
    }

    if (
      isInside(filePath, sharedRoot) &&
      (isInside(resolvedPath, apiRoot) ||
        isInside(resolvedPath, webRoot) ||
        importSource.includes("apps/api") ||
        importSource.includes("apps/web"))
    ) {
      failures.push({
        file: path.relative(repoRoot, filePath),
        importSource,
        rule: "shared_must_not_depend_on_apps",
      });
    }

    if (
      (isInside(filePath, apiSrcRoot) || isInside(filePath, webSrcRoot)) &&
      isInside(resolvedPath, sharedSrcRoot) &&
      !importSource.startsWith("@gloss/shared")
    ) {
      failures.push({
        file: path.relative(repoRoot, filePath),
        importSource,
        rule: "shared_imports_must_use_workspace_alias",
      });
    }

    if (
      isInside(filePath, path.join(apiSrcRoot, "routes")) &&
      (isInside(resolvedPath, path.join(apiSrcRoot, "repositories")) ||
        isInside(resolvedPath, path.join(apiSrcRoot, "db")))
    ) {
      failures.push({
        file: path.relative(repoRoot, filePath),
        importSource,
        rule: "routes_must_not_import_repositories_or_db",
      });
    }

    if (
      isInside(filePath, path.join(apiSrcRoot, "services")) &&
      isInside(resolvedPath, path.join(apiSrcRoot, "routes"))
    ) {
      failures.push({
        file: path.relative(repoRoot, filePath),
        importSource,
        rule: "services_must_not_import_routes",
      });
    }
  }

  return failures;
};

const run = async (): Promise<void> => {
  const sourceFiles = [
    ...(await walk(apiSrcRoot)),
    ...(await walk(webSrcRoot)),
    ...(await walk(sharedSrcRoot)),
  ];
  const failures = (await Promise.all(sourceFiles.map(checkFile))).flat();

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(
        `${failure.rule}: ${failure.file} imports ${failure.importSource}`,
      );
    }

    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify({
      checkedFiles: sourceFiles.length,
      status: "passed",
    }),
  );
};

void run();
