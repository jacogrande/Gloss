export type EvalFailure = {
  caseId: string;
  category: string;
  journey: string;
  message: string;
  severity: "critical" | "warning";
};

export type EvalSummary = {
  categories: Record<string, number>;
  failed: number;
  failures: EvalFailure[];
  passed: number;
  status: "failed" | "passed";
  total: number;
};

export const buildEvalSummary = (input: {
  failures: EvalFailure[];
  total: number;
}): EvalSummary => {
  const categories = input.failures.reduce<Record<string, number>>(
    (current, failure) => ({
      ...current,
      [failure.category]: (current[failure.category] ?? 0) + 1,
    }),
    {},
  );
  const failed = input.failures.length;

  return {
    categories,
    failed,
    failures: input.failures,
    passed: input.total - failed,
    status: failed === 0 ? "passed" : "failed",
    total: input.total,
  };
};
