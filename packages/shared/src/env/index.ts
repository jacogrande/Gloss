import { z } from "zod";

const nonEmptyStringSchema = z.string().trim().min(1);

const nodeEnvSchema = z.enum(["development", "test", "production"]);

const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

const enrichmentProviderModeSchema = z.enum(["fixture", "live"]);

const cookieDomainSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) =>
      /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(
        value,
      ),
    {
      message:
        "COOKIE_DOMAIN must be a bare registrable domain or subdomain such as gloss.test or preview.gloss.test.",
    },
  );

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
  COOKIE_DOMAIN: cookieDomainSchema.optional(),
  DATABASE_URL: nonEmptyStringSchema,
  ENRICHMENT_PROVIDER_MODE: enrichmentProviderModeSchema.default("live"),
  LOG_LEVEL: logLevelSchema.default("info"),
  MERRIAM_WEBSTER_DICTIONARY_API_KEY: nonEmptyStringSchema.optional(),
  MERRIAM_WEBSTER_THESAURUS_API_KEY: nonEmptyStringSchema.optional(),
  NODE_ENV: nodeEnvSchema.default("development"),
  OPENAI_API_KEY: nonEmptyStringSchema.optional(),
  OPENAI_MODEL: nonEmptyStringSchema.default("gpt-5-mini-2025-08-07"),
  PORT: portSchema,
  WEB_ORIGIN: z.url(),
}).superRefine((value, context) => {
  if (value.ENRICHMENT_PROVIDER_MODE !== "live") {
    return;
  }

  if (!value.OPENAI_API_KEY) {
    context.addIssue({
      code: "custom",
      message: "OPENAI_API_KEY is required when ENRICHMENT_PROVIDER_MODE=live.",
      path: ["OPENAI_API_KEY"],
    });
  }

  if (!value.MERRIAM_WEBSTER_DICTIONARY_API_KEY) {
    context.addIssue({
      code: "custom",
      message:
        "MERRIAM_WEBSTER_DICTIONARY_API_KEY is required when ENRICHMENT_PROVIDER_MODE=live.",
      path: ["MERRIAM_WEBSTER_DICTIONARY_API_KEY"],
    });
  }

  if (!value.MERRIAM_WEBSTER_THESAURUS_API_KEY) {
    context.addIssue({
      code: "custom",
      message:
        "MERRIAM_WEBSTER_THESAURUS_API_KEY is required when ENRICHMENT_PROVIDER_MODE=live.",
      path: ["MERRIAM_WEBSTER_THESAURUS_API_KEY"],
    });
  }
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export type EnrichmentProviderMode = z.infer<typeof enrichmentProviderModeSchema>;

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
