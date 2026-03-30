import {
  deriveDeploymentEnvReport,
  serverEnvSchema,
  webEnvSchema,
  type DeploymentEnvironment,
  type DeploymentTarget,
} from "@gloss/shared";

const environmentValues = [
  "local",
  "preview",
  "staging",
  "private-alpha",
] as const satisfies DeploymentEnvironment[];

const targetValues = [
  "api",
  "web",
  "combined",
] as const satisfies DeploymentTarget[];

const parseFlagValue = (
  flag: "--environment" | "--target",
): string | undefined => {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
};

const parseEnvironment = (): DeploymentEnvironment => {
  const value = parseFlagValue("--environment");

  if (!value) {
    return "preview";
  }

  if (environmentValues.includes(value as DeploymentEnvironment)) {
    return value as DeploymentEnvironment;
  }

  throw new Error(
    `Invalid --environment value. Expected one of: ${environmentValues.join(", ")}.`,
  );
};

const parseTarget = (): DeploymentTarget => {
  const value = parseFlagValue("--target");

  if (!value) {
    return "combined";
  }

  if (targetValues.includes(value as DeploymentTarget)) {
    return value as DeploymentTarget;
  }

  throw new Error(
    `Invalid --target value. Expected one of: ${targetValues.join(", ")}.`,
  );
};

const formatIssues = (
  issues: Array<{
    message: string;
    path: Array<PropertyKey>;
  }>,
): string[] =>
  issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`);

const renderPrettyReport = (
  report: ReturnType<typeof deriveDeploymentEnvReport>,
): string => {
  const lines = [
    "Deployment Environment Report",
    `Environment: ${report.environment}`,
    `Target: ${report.target}`,
    `Status: ${report.status.toUpperCase()}`,
    "",
    "Checks",
    ...report.checks.map(
      (check) => `- [${check.status.toUpperCase()}] ${check.id}: ${check.message}`,
    ),
  ];

  return lines.join("\n");
};

const run = async (): Promise<void> => {
  const environment = parseEnvironment();
  const target = parseTarget();
  const pretty = process.argv.includes("--pretty");
  const apiResult = serverEnvSchema.safeParse(process.env);
  const webResult = webEnvSchema.safeParse(process.env);
  const report = deriveDeploymentEnvReport({
    apiEnv: apiResult.success ? apiResult.data : null,
    apiIssues: apiResult.success ? [] : formatIssues(apiResult.error.issues),
    environment,
    target,
    webEnv: webResult.success ? webResult.data : null,
    webIssues: webResult.success ? [] : formatIssues(webResult.error.issues),
  });

  console.log(
    pretty ? renderPrettyReport(report) : JSON.stringify(report, null, 2),
  );

  if (report.status === "fail") {
    process.exitCode = 1;
  }
};

void run();
