import { z } from "zod";

const nonEmptyStringSchema = z.string().trim().min(1);

const nodeEnvSchema = z.enum(["development", "test", "production"]);

const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

const portSchema = z
  .string()
  .optional()
  .transform((value): string => value ?? "8787")
  .pipe(
    z
      .string()
      .regex(/^\d+$/)
      .transform((value: string) => Number.parseInt(value, 10))
      .pipe(z.number().int().min(1).max(65_535)),
  );

const formatIssues = (issues: z.core.$ZodIssue[]): string =>
  issues
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");

const parseWithSchema = <TEnv>(
  name: string,
  schema: z.ZodType<TEnv>,
  input: Record<string, string | undefined>,
): TEnv => {
  const parsed = schema.safeParse(input);

  if (parsed.success) {
    return parsed.data;
  }

  throw new Error(`Invalid ${name}: ${formatIssues(parsed.error.issues)}`);
};

export const serverEnvSchema = z.object({
  API_ORIGIN: z.url(),
  BETTER_AUTH_SECRET: nonEmptyStringSchema,
  BETTER_AUTH_URL: z.url(),
  COOKIE_DOMAIN: nonEmptyStringSchema.optional(),
  DATABASE_URL: nonEmptyStringSchema,
  LOG_LEVEL: logLevelSchema.default("info"),
  NODE_ENV: nodeEnvSchema.default("development"),
  PORT: portSchema,
  WEB_ORIGIN: z.url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const webEnvSchema = z.object({
  MODE: nodeEnvSchema.default("development"),
  VITE_API_BASE_URL: z.url(),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export const parseServerEnv = (
  input: Record<string, string | undefined>,
): ServerEnv => parseWithSchema("server environment", serverEnvSchema, input);

export const parseWebEnv = (
  input: Record<string, string | undefined>,
): WebEnv => parseWithSchema("web environment", webEnvSchema, input);
