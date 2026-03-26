import { execFileSync } from "node:child_process";

export default async (): Promise<void> => {
  execFileSync("bun", ["run", "db:reset"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
};
