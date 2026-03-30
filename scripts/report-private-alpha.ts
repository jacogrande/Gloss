import { derivePrivateAlphaReport } from "@gloss/shared/metrics";

import { createDatabaseClient } from "../apps/api/src/lib/db";
import {
  ensureLocalDatabaseExists,
  ensureLocalPostgresStarted,
} from "../apps/api/src/lib/local-postgres";
import { createProductEventService } from "../apps/api/src/services/product-event-service";
import { resolveScriptEnv } from "./lib/env";

const isLocalDatabaseUrl = (databaseUrl: string): boolean => {
  const hostname = new URL(databaseUrl).hostname;

  return hostname === "127.0.0.1" || hostname === "localhost";
};

const formatRate = (value: number | null): string =>
  value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;

const renderPrettyReport = (
  report: ReturnType<typeof derivePrivateAlphaReport>,
): string => {
  const lines = [
    "Private Alpha Report",
    `Generated: ${report.generatedAt}`,
    "",
    "Activity",
    `- active users: ${String(report.activity.activeUsers)}`,
    `- days with activity: ${String(report.activity.daysWithActivity)}`,
    `- first event: ${report.activity.firstEventAt ?? "n/a"}`,
    `- last event: ${report.activity.lastEventAt ?? "n/a"}`,
    "",
    "Signals",
    ...report.signals.map(
      (signal) =>
        `- [${signal.status.toUpperCase()}] ${signal.id}: ${signal.message}`,
    ),
    "",
    "Totals",
    `- sign-ins: ${String(report.totals.authSignIns)}`,
    `- sign-in failures: ${String(report.totals.authSignInFailures)}`,
    `- captures: ${String(report.totals.captures)}`,
    `- seeds: ${String(report.totals.seeds)}`,
    `- review sessions started: ${String(report.totals.reviewSessionsStarted)}`,
    `- review sessions completed: ${String(report.totals.reviewSessionsCompleted)}`,
    `- review cards submitted: ${String(report.totals.reviewCardsSubmitted)}`,
    "",
    "Metrics",
    `- capture to review conversion: ${formatRate(report.metrics.captureToReviewConversion)}`,
    `- average reviews per saved word: ${
      report.metrics.averageReviewsPerSavedWord === null
        ? "n/a"
        : report.metrics.averageReviewsPerSavedWord.toFixed(2)
    }`,
    `- percentage reaching deepening: ${formatRate(report.metrics.percentageReachingDeepening)}`,
    `- repeat capture rate: ${formatRate(report.metrics.repeatCaptureRate)}`,
    `- 7-day retention: ${formatRate(report.metrics.retention7Day)}`,
    `- 30-day retention: ${formatRate(report.metrics.retention30Day)}`,
    "",
    "Event Counts",
    ...report.eventCounts.map(
      (eventCount) => `- ${eventCount.type}: ${String(eventCount.count)}`,
    ),
  ];

  return lines.join("\n");
};

const run = async (): Promise<void> => {
  const format = process.argv.includes("--pretty") ? "pretty" : "json";
  const env = resolveScriptEnv();

  if (isLocalDatabaseUrl(env.DATABASE_URL)) {
    await ensureLocalPostgresStarted({
      databaseUrl: env.DATABASE_URL,
    });
    await ensureLocalDatabaseExists(env.DATABASE_URL);
  }

  const database = createDatabaseClient(env.DATABASE_URL);
  const productEventService = createProductEventService(database.db);

  try {
    const [events, seeds] = await Promise.all([
      productEventService.listEvents(),
      productEventService.listSeedSnapshots(),
    ]);
    const report = derivePrivateAlphaReport({
      events,
      generatedAt: new Date().toISOString(),
      seeds,
    });

    console.log(
      format === "pretty"
        ? renderPrettyReport(report)
        : JSON.stringify(report, null, 2),
    );
  } finally {
    await database.pool.end();
  }
};

void run();
