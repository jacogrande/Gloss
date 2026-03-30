import type {
  ServerEnv,
  WebEnv,
} from "../env/index";

export type DeploymentEnvironment = "local" | "preview" | "staging" | "private-alpha";

export type DeploymentTarget = "api" | "web" | "combined";

export type DeploymentCheck = {
  id:
    | "api_env_valid"
    | "web_env_valid"
    | "api_origin_matches_auth_url"
    | "web_api_alignment"
    | "hosted_origins_are_secure"
    | "hosted_origins_are_not_local"
    | "cookie_domain_alignment";
  message: string;
  status: "fail" | "pass" | "warn";
};

export type DeploymentEnvReport = {
  checks: DeploymentCheck[];
  environment: DeploymentEnvironment;
  status: "fail" | "pass" | "warn";
  target: DeploymentTarget;
};

const normalizeOrigin = (value: string): string => new URL(value).origin;

const isHostedEnvironment = (environment: DeploymentEnvironment): boolean =>
  environment !== "local";

const isLocalHost = (hostname: string): boolean =>
  hostname === "127.0.0.1" || hostname === "localhost";

const matchesCookieDomain = (
  hostname: string,
  cookieDomain: string,
): boolean =>
  hostname === cookieDomain || hostname.endsWith(`.${cookieDomain}`);

const buildValidityCheck = (input: {
  id: "api_env_valid" | "web_env_valid";
  issues: string[];
  label: string;
}): DeploymentCheck => ({
  id: input.id,
  message:
    input.issues.length === 0
      ? `${input.label} variables are present and valid.`
      : `${input.label} validation failed: ${input.issues.join("; ")}`,
  status: input.issues.length === 0 ? "pass" : "fail",
});

export const deriveDeploymentEnvReport = (input: {
  apiEnv: ServerEnv | null;
  apiIssues?: string[];
  environment: DeploymentEnvironment;
  target: DeploymentTarget;
  webEnv: WebEnv | null;
  webIssues?: string[];
}): DeploymentEnvReport => {
  const checks: DeploymentCheck[] = [];

  if (input.target === "api" || input.target === "combined") {
    checks.push(
      buildValidityCheck({
        id: "api_env_valid",
        issues: input.apiIssues ?? [],
        label: "API environment",
      }),
    );
  }

  if (input.target === "web" || input.target === "combined") {
    checks.push(
      buildValidityCheck({
        id: "web_env_valid",
        issues: input.webIssues ?? [],
        label: "Web environment",
      }),
    );
  }

  if (input.apiEnv) {
    checks.push({
      id: "api_origin_matches_auth_url",
      message:
        normalizeOrigin(input.apiEnv.API_ORIGIN) ===
        normalizeOrigin(input.apiEnv.BETTER_AUTH_URL)
          ? "API_ORIGIN matches BETTER_AUTH_URL."
          : "API_ORIGIN must match BETTER_AUTH_URL exactly.",
      status:
        normalizeOrigin(input.apiEnv.API_ORIGIN) ===
        normalizeOrigin(input.apiEnv.BETTER_AUTH_URL)
          ? "pass"
          : "fail",
    });
  }

  if (input.apiEnv && input.webEnv && input.target === "combined") {
    checks.push({
      id: "web_api_alignment",
      message:
        normalizeOrigin(input.webEnv.VITE_API_BASE_URL) ===
        normalizeOrigin(input.apiEnv.API_ORIGIN)
          ? "VITE_API_BASE_URL matches the API origin."
          : "VITE_API_BASE_URL must match API_ORIGIN for split-origin browser requests.",
      status:
        normalizeOrigin(input.webEnv.VITE_API_BASE_URL) ===
        normalizeOrigin(input.apiEnv.API_ORIGIN)
          ? "pass"
          : "fail",
    });
  }

  if (isHostedEnvironment(input.environment)) {
    const origins = [
      input.apiEnv?.API_ORIGIN,
      input.apiEnv?.BETTER_AUTH_URL,
      input.apiEnv?.WEB_ORIGIN,
      input.webEnv?.VITE_API_BASE_URL,
    ].filter((value): value is string => typeof value === "string");

    checks.push({
      id: "hosted_origins_are_secure",
      message:
        origins.every((value) => new URL(value).protocol === "https:")
          ? "Hosted origins use HTTPS."
          : "Preview, staging, and private-alpha origins must use HTTPS.",
      status:
        origins.every((value) => new URL(value).protocol === "https:")
          ? "pass"
          : "fail",
    });
    checks.push({
      id: "hosted_origins_are_not_local",
      message:
        origins.every((value) => !isLocalHost(new URL(value).hostname))
          ? "Hosted origins do not point at localhost."
          : "Hosted environments must not point at localhost origins.",
      status:
        origins.every((value) => !isLocalHost(new URL(value).hostname))
          ? "pass"
          : "fail",
    });
  }

  if (input.apiEnv?.COOKIE_DOMAIN) {
    const hosts = [
      new URL(input.apiEnv.API_ORIGIN).hostname,
      new URL(input.apiEnv.BETTER_AUTH_URL).hostname,
      new URL(input.apiEnv.WEB_ORIGIN).hostname,
      input.webEnv ? new URL(input.webEnv.VITE_API_BASE_URL).hostname : null,
    ].filter((value): value is string => typeof value === "string");
    const aligned = hosts.every((hostname) =>
      matchesCookieDomain(hostname, input.apiEnv!.COOKIE_DOMAIN!),
    );

    checks.push({
      id: "cookie_domain_alignment",
      message: aligned
        ? "COOKIE_DOMAIN aligns with the configured web and API hosts."
        : "COOKIE_DOMAIN must match or parent the configured web and API hosts.",
      status: aligned ? "pass" : "fail",
    });
  } else if (isHostedEnvironment(input.environment)) {
    checks.push({
      id: "cookie_domain_alignment",
      message:
        "COOKIE_DOMAIN is unset. This is acceptable unless the deployed domain strategy requires cross-subdomain cookies.",
      status: "warn",
    });
  }

  const status = checks.some((check) => check.status === "fail")
    ? "fail"
    : checks.some((check) => check.status === "warn")
      ? "warn"
      : "pass";

  return {
    checks,
    environment: input.environment,
    status,
    target: input.target,
  };
};
