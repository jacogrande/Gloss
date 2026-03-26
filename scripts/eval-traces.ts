import { apiErrorResponseSchema } from "@gloss/shared/schemas";

import {
  buildEvalSummary,
  type EvalFailure,
} from "./lib/eval";
import {
  prepareLocalHarness,
  signUpHarnessUser,
} from "./lib/harness";

type TraceCheck = {
  id: string;
  run: () => Promise<EvalFailure | null>;
};

const getHeader = (response: Response, name: string): string | null =>
  response.headers.get(name);

export const runTraceEvaluations = async (): Promise<void> => {
  const failures: EvalFailure[] = [];
  const { env, runtime } = prepareLocalHarness();

  try {
    const cookie = await signUpHarnessUser({
      app: runtime.app,
      apiOrigin: env.API_ORIGIN,
      email: "trace@gloss.local",
      name: "Trace User",
      webOrigin: env.WEB_ORIGIN,
    });

    const checks: TraceCheck[] = [
      {
        id: "auth_preflight_cors",
        run: async () => {
          const response = await runtime.app.request(
            new URL("/api/auth/sign-in/email", `${env.API_ORIGIN}/`).toString(),
            {
              headers: {
                "access-control-request-headers": "content-type",
                "access-control-request-method": "POST",
                origin: env.WEB_ORIGIN,
              },
              method: "OPTIONS",
            },
          );

          return getHeader(response, "access-control-allow-origin") === env.WEB_ORIGIN &&
            getHeader(response, "access-control-allow-credentials") === "true"
            ? null
            : {
                caseId: "auth_preflight_cors",
                category: "cors",
                journey: "auth.boundary",
                message:
                  "Expected Better Auth sign-in preflight to expose split-origin credentialed CORS headers.",
                severity: "critical",
              };
        },
      },
      {
        id: "capture_preflight_cors",
        run: async () => {
          const response = await runtime.app.request(
            new URL("/capture/seeds", `${env.API_ORIGIN}/`).toString(),
            {
              headers: {
                "access-control-request-headers": "content-type",
                "access-control-request-method": "POST",
                origin: env.WEB_ORIGIN,
              },
              method: "OPTIONS",
            },
          );

          return getHeader(response, "access-control-allow-origin") === env.WEB_ORIGIN &&
            getHeader(response, "access-control-allow-credentials") === "true"
            ? null
            : {
                caseId: "capture_preflight_cors",
                category: "cors",
                journey: "http.boundary",
                message:
                  "Expected product route preflight to expose split-origin credentialed CORS headers.",
                severity: "critical",
              };
        },
      },
      {
        id: "seed_list_response_headers",
        run: async () => {
          const response = await runtime.app.request(
            new URL("/seeds", `${env.API_ORIGIN}/`).toString(),
            {
              headers: {
                cookie,
                origin: env.WEB_ORIGIN,
              },
            },
          );

          return response.status === 200 &&
            getHeader(response, "access-control-allow-origin") === env.WEB_ORIGIN &&
            getHeader(response, "x-request-id")
            ? null
            : {
                caseId: "seed_list_response_headers",
                category: "http_headers",
                journey: "http.boundary",
                message:
                  "Expected authenticated seed list responses to expose CORS and request-id headers.",
                severity: "critical",
              };
        },
      },
      {
        id: "unauthorized_seed_error_code",
        run: async () => {
          const response = await runtime.app.request(
            new URL("/seeds", `${env.API_ORIGIN}/`).toString(),
            {
              headers: {
                origin: env.WEB_ORIGIN,
              },
            },
          );
          const body = apiErrorResponseSchema.parse((await response.json()) as unknown);

          return response.status === 401 &&
            body.error.code === "AUTH_UNAUTHORIZED" &&
            typeof body.error.requestId === "string"
            ? null
            : {
                caseId: "unauthorized_seed_error_code",
                category: "error_contract",
                journey: "auth.boundary",
                message:
                  "Expected unauthenticated seed list requests to return AUTH_UNAUTHORIZED with a request id.",
                severity: "critical",
              };
        },
      },
      {
        id: "capture_validation_error_code",
        run: async () => {
          const response = await runtime.app.request(
            new URL("/capture/seeds", `${env.API_ORIGIN}/`).toString(),
            {
              body: JSON.stringify({
                word: "",
              }),
              headers: {
                "content-type": "application/json",
                cookie,
                origin: env.WEB_ORIGIN,
              },
              method: "POST",
            },
          );
          const body = apiErrorResponseSchema.parse((await response.json()) as unknown);

          return response.status === 400 &&
            body.error.code === "VALIDATION_ERROR" &&
            typeof body.error.requestId === "string"
            ? null
            : {
                caseId: "capture_validation_error_code",
                category: "error_contract",
                journey: "capture.create",
                message:
                  "Expected invalid capture payloads to return VALIDATION_ERROR with a request id.",
                severity: "critical",
              };
        },
      },
    ];

    for (const check of checks) {
      const failure = await check.run();

      if (failure) {
        failures.push(failure);
      }
    }

    const summary = buildEvalSummary({
      failures,
      total: checks.length,
    });

    console.log(
      JSON.stringify({
        dataset: "http_boundary_checks",
        ...summary,
      }),
    );

    if (summary.failed > 0) {
      throw new Error("Trace evals failed.");
    }
  } finally {
    await runtime.close();
  }
};

if (import.meta.main) {
  await runTraceEvaluations();
}
