import { spawn } from "node:child_process";
import {
  access,
  mkdir,
  unlink,
} from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const localPostgresDirectory = path.join(repoRoot, ".local", "postgres");
const localPostgresLogPath = path.join(localPostgresDirectory, "postgres.log");
const postmasterPidFileName = "postmaster.pid";

type LocalPostgresConfig = {
  dataDirectory?: string;
  databaseUrl: string;
};

type CommandResult = {
  code: number;
  stderr: string;
  stdout: string;
};

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const runCommand = async (
  command: string,
  args: string[],
  options?: {
    allowFailure?: boolean;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  },
): Promise<CommandResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      env: options?.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      const result = {
        code: code ?? 1,
        stderr: stderr.trim(),
        stdout: stdout.trim(),
      };

      if (result.code !== 0 && options?.allowFailure !== true) {
        reject(
          new Error(
            `Command failed: ${command} ${args.join(" ")}\n${result.stderr || result.stdout}`,
          ),
        );
        return;
      }

      resolve(result);
    });
  });

const resolveBinary = async (binaryName: string): Promise<string> => {
  const envBinaryDirectory = process.env.POSTGRES_BIN_DIR;

  if (envBinaryDirectory) {
    return path.join(envBinaryDirectory, binaryName);
  }

  const result = await runCommand("which", [binaryName], { allowFailure: true });

  if (result.code === 0 && result.stdout.length > 0) {
    return result.stdout.split("\n")[0] ?? binaryName;
  }

  throw new Error(
    `Unable to find PostgreSQL binary "${binaryName}". Set POSTGRES_BIN_DIR or add PostgreSQL to PATH.`,
  );
};

const parseDatabaseUrl = (databaseUrl: string): {
  databaseName: string;
  host: string;
  port: number;
  username: string;
} => {
  const url = new URL(databaseUrl);

  return {
    databaseName: url.pathname.replace(/^\//, ""),
    host: url.hostname || "127.0.0.1",
    port: url.port.length > 0 ? Number.parseInt(url.port, 10) : 5432,
    username: decodeURIComponent(url.username || "gloss"),
  };
};

const initClusterIfNeeded = async (config: {
  dataDirectory: string;
  username: string;
}): Promise<void> => {
  const versionPath = path.join(config.dataDirectory, "PG_VERSION");

  if (await pathExists(versionPath)) {
    return;
  }

  await mkdir(config.dataDirectory, { recursive: true });

  const initdb = await resolveBinary("initdb");

  await runCommand(initdb, [
    "-D",
    config.dataDirectory,
    "--auth=trust",
    `--username=${config.username}`,
    "--encoding=UTF8",
    "--locale=C",
  ]);
};

const clearStalePostmasterPid = async (dataDirectory: string): Promise<void> => {
  const postmasterPidPath = path.join(dataDirectory, postmasterPidFileName);

  if (!(await pathExists(postmasterPidPath))) {
    return;
  }

  await unlink(postmasterPidPath);
};

const isServerRunning = async (dataDirectory: string): Promise<boolean> => {
  const pgCtl = await resolveBinary("pg_ctl");
  const result = await runCommand(pgCtl, ["-D", dataDirectory, "status"], {
    allowFailure: true,
  });

  return result.code === 0;
};

const canConnectToServer = async (config: {
  host: string;
  port: number;
  username: string;
}): Promise<boolean> => {
  const psql = await resolveBinary("psql");
  const result = await runCommand(
    psql,
    [
      "-h",
      config.host,
      "-p",
      String(config.port),
      "-U",
      config.username,
      "-d",
      "postgres",
      "-tAc",
      "SELECT 1",
    ],
    {
      allowFailure: true,
      env: {
        ...process.env,
        PGCONNECT_TIMEOUT: "2",
      },
    },
  );

  return result.code === 0 && result.stdout.includes("1");
};

const waitForServer = async (config: {
  host: string;
  port: number;
  username: string;
}): Promise<void> => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await canConnectToServer(config)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Timed out waiting for local PostgreSQL to accept connections.");
};

export const ensureLocalPostgresStarted = async (
  config: LocalPostgresConfig,
): Promise<void> => {
  const connection = parseDatabaseUrl(config.databaseUrl);
  const dataDirectory = config.dataDirectory ?? localPostgresDirectory;

  await initClusterIfNeeded({
    dataDirectory,
    username: connection.username,
  });

  if (
    (await isServerRunning(dataDirectory)) ||
    (await canConnectToServer(connection))
  ) {
    return;
  }

  const pgCtl = await resolveBinary("pg_ctl");
  const startServer = async (): Promise<CommandResult> =>
    runCommand(
      pgCtl,
      [
        "-D",
        dataDirectory,
        "-l",
        localPostgresLogPath,
        "-o",
        `-h ${connection.host} -p ${connection.port} -c shared_memory_type=mmap -c dynamic_shared_memory_type=posix`,
        "start",
      ],
      { allowFailure: true },
    );

  let startResult = await startServer();

  try {
    await waitForServer(connection);
  } catch (error) {
    const alreadyRunningMessage = `${startResult.stderr}\n${startResult.stdout}`.includes(
      "another server might be running",
    );

    if (
      alreadyRunningMessage &&
      !(await isServerRunning(dataDirectory)) &&
      !(await canConnectToServer(connection))
    ) {
      await clearStalePostmasterPid(dataDirectory);
      startResult = await startServer();

      try {
        await waitForServer(connection);
        return;
      } catch (retryError) {
        if (startResult.code !== 0) {
          throw new Error(startResult.stderr || startResult.stdout, {
            cause: retryError,
          });
        }

        throw retryError;
      }
    }

    if (
      alreadyRunningMessage &&
      ((await isServerRunning(dataDirectory)) ||
        (await canConnectToServer(connection)))
    ) {
      return;
    }

    if (startResult.code !== 0) {
      throw new Error(startResult.stderr || startResult.stdout, { cause: error });
    }

    throw error;
  }
};

export const ensureLocalDatabaseExists = async (
  databaseUrl: string,
): Promise<void> => {
  const connection = parseDatabaseUrl(databaseUrl);
  const psql = await resolveBinary("psql");
  const createdb = await resolveBinary("createdb");

  const existsResult = await runCommand(
    psql,
    [
      "-h",
      connection.host,
      "-p",
      String(connection.port),
      "-U",
      connection.username,
      "-d",
      "postgres",
      "-tAc",
      `SELECT 1 FROM pg_database WHERE datname = '${connection.databaseName}'`,
    ],
    { allowFailure: true },
  );

  if (existsResult.stdout.trim() === "1") {
    return;
  }

  const createResult = await runCommand(
    createdb,
    [
      "-h",
      connection.host,
      "-p",
      String(connection.port),
      "-U",
      connection.username,
      connection.databaseName,
    ],
    { allowFailure: true },
  );

  if (
    createResult.code !== 0 &&
    !createResult.stderr.includes("already exists")
  ) {
    throw new Error(createResult.stderr || createResult.stdout);
  }
};

export const stopLocalPostgres = async (
  dataDirectory = localPostgresDirectory,
): Promise<void> => {
  if (!(await pathExists(path.join(dataDirectory, "PG_VERSION")))) {
    return;
  }

  if (!(await isServerRunning(dataDirectory))) {
    return;
  }

  const pgCtl = await resolveBinary("pg_ctl");

  await runCommand(pgCtl, ["-D", dataDirectory, "stop", "-m", "fast"]);
};
