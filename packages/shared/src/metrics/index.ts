import type {
  ProductEvent,
  ProductEventType,
  SeedStage,
} from "../types/index";
import { productEventTypeValues } from "../values/index";

export type PrivateAlphaSeedSnapshot = {
  createdAt: string;
  id: string;
  stage: SeedStage;
  userId: string;
};

export type PrivateAlphaReport = {
  activity: {
    activeUsers: number;
    daysWithActivity: number;
    firstEventAt: string | null;
    lastEventAt: string | null;
  };
  eventCounts: Array<{
    count: number;
    type: ProductEventType;
  }>;
  generatedAt: string;
  metrics: {
    averageReviewsPerSavedWord: number | null;
    captureToReviewConversion: number | null;
    percentageReachingDeepening: number | null;
    repeatCaptureRate: number | null;
    retention30Day: number | null;
    retention7Day: number | null;
  };
  signals: Array<{
    id:
      | "auth_activity"
      | "capture_activity"
      | "enrichment_activity"
      | "review_activity"
      | "capture_to_review"
      | "session_completion";
    message: string;
    status: "pass" | "warn";
  }>;
  totals: {
    authSignInFailures: number;
    authSignIns: number;
    captures: number;
    reviewCardsSubmitted: number;
    reviewSessionsCompleted: number;
    reviewSessionsStarted: number;
    seeds: number;
    usersWithCaptures: number;
    usersWithReviewActivity: number;
    usersWithSignIns: number;
  };
};

const roundMetric = (value: number): number =>
  Math.round(value * 10_000) / 10_000;

const toRate = (numerator: number, denominator: number): number | null =>
  denominator <= 0 ? null : roundMetric(numerator / denominator);

const toDayKey = (timestamp: string): string => timestamp.slice(0, 10);

const parseUtcDay = (dayKey: string): Date => new Date(`${dayKey}T00:00:00.000Z`);

const buildUserDayIndex = (
  events: ProductEvent[],
): Map<string, Set<string>> => {
  const index = new Map<string, Set<string>>();

  for (const event of events) {
    if (!("userId" in event) || !event.userId) {
      continue;
    }

    const current = index.get(event.userId) ?? new Set<string>();
    current.add(toDayKey(event.occurredAt));
    index.set(event.userId, current);
  }

  return index;
};

const computeRetentionRate = (input: {
  events: ProductEvent[];
  now: Date;
  windowDays: number;
}): number | null => {
  const userDayIndex = buildUserDayIndex(
    input.events.filter((event) => "userId" in event && Boolean(event.userId)),
  );
  const currentDay = parseUtcDay(toDayKey(input.now.toISOString()));
  let eligibleUsers = 0;
  let retainedUsers = 0;

  for (const [, dayKeys] of userDayIndex) {
    const sorted = Array.from(dayKeys)
      .slice()
      .sort((left, right) => left.localeCompare(right));
    const firstSeenDay = sorted[0];

    if (!firstSeenDay) {
      continue;
    }

    const retentionBoundary = parseUtcDay(firstSeenDay);
    retentionBoundary.setUTCDate(retentionBoundary.getUTCDate() + input.windowDays);

    if (retentionBoundary.getTime() > currentDay.getTime()) {
      continue;
    }

    eligibleUsers += 1;

    if (
      sorted.some(
        (dayKey) => parseUtcDay(dayKey).getTime() >= retentionBoundary.getTime(),
      )
    ) {
      retainedUsers += 1;
    }
  }

  return toRate(retainedUsers, eligibleUsers);
};

const buildEventCounts = (
  events: ProductEvent[],
): Array<{
  count: number;
  type: ProductEventType;
}> =>
  productEventTypeValues.map((type) => ({
    count: events.filter((event) => event.type === type).length,
    type,
  }));

const hasUserId = (
  event: ProductEvent,
): event is ProductEvent & {
  userId: string;
} => "userId" in event && typeof event.userId === "string" && event.userId.length > 0;

export const derivePrivateAlphaReport = (input: {
  events: ProductEvent[];
  generatedAt: string;
  seeds: PrivateAlphaSeedSnapshot[];
}): PrivateAlphaReport => {
  const authoritativeSeedIds = new Set(input.seeds.map((seed) => seed.id));
  const signUpEvents = input.events.filter((event) => event.type === "auth.sign_up");
  const captureEvents = input.events.filter((event) => event.type === "seed.capture");
  const signInEvents = input.events.filter((event) => event.type === "auth.sign_in");
  const signInFailureEvents = input.events.filter(
    (event) => event.type === "auth.sign_in_failed",
  );
  const enrichmentRequestedEvents = input.events.filter(
    (event) => event.type === "seed.enrichment.requested",
  );
  const enrichmentReadyEvents = input.events.filter(
    (event) => event.type === "seed.enrichment.ready",
  );
  const enrichmentFailedEvents = input.events.filter(
    (event) => event.type === "seed.enrichment.failed",
  );
  const reviewCardEvents = input.events.filter((event) => {
    if (event.type !== "review.card.submitted") {
      return false;
    }

    return "seedId" in event && authoritativeSeedIds.has(event.seedId);
  });
  const reviewStartedSeedIds = new Set(
    input.events
      .filter((event) => event.type === "review.session.started")
      .flatMap((event) =>
        event.payload.seedIds.filter((seedId) => authoritativeSeedIds.has(seedId)),
      ),
  );
  const reviewSessionStartedEvents = input.events.filter(
    (event) => event.type === "review.session.started",
  );
  const reviewSessionCompletedEvents = input.events.filter(
    (event) => event.type === "review.session.completed",
  );
  const reviewedSeedIds = new Set(
    reviewCardEvents
      .filter((event) => "seedId" in event)
      .map((event) => event.seedId),
  );
  const reviewTouchedSeedIds = new Set([
    ...reviewStartedSeedIds,
    ...reviewedSeedIds,
  ]);
  const captureDaySetsByUser = captureEvents.reduce<Map<string, Set<string>>>(
    (current, event) => {
      if (!("userId" in event) || !event.userId) {
        return current;
      }

      const daySet = current.get(event.userId) ?? new Set<string>();
      daySet.add(toDayKey(event.occurredAt));
      current.set(event.userId, daySet);

      return current;
    },
    new Map<string, Set<string>>(),
  );
  const usersWithRepeatCapture = Array.from(captureDaySetsByUser.values()).filter(
    (daySet) => daySet.size >= 2,
  ).length;
  const deepeningSeedCount = input.seeds.filter(
    (seed) => seed.stage === "deepening" || seed.stage === "mature",
  ).length;
  const usersWithReviewActivity = new Set(
    input.events
      .filter(
        (event) =>
          (event.type === "review.session.started" ||
            event.type === "review.card.submitted") &&
          "userId" in event,
      )
      .map((event) => event.userId),
  );
  const activityDayKeys = new Set(input.events.map((event) => toDayKey(event.occurredAt)));
  const sortedOccurredAt = input.events
    .map((event) => event.occurredAt)
    .slice()
    .sort((left, right) => left.localeCompare(right));
  const usersWithActivity = new Set(
    input.events
      .filter(hasUserId)
      .map((event) => event.userId),
  );
  const eventCounts = buildEventCounts(input.events);
  const settledEnrichmentCount =
    enrichmentReadyEvents.length + enrichmentFailedEvents.length;
  const signals: PrivateAlphaReport["signals"] = [
    {
      id: "auth_activity",
      message:
        signInEvents.length > 0 || signUpEvents.length > 0
          ? `Observed ${String(signUpEvents.length)} sign-up(s) and ${String(signInEvents.length)} sign-in(s).`
          : "No successful sign-up or sign-in events have been recorded yet.",
      status: signInEvents.length > 0 || signUpEvents.length > 0 ? "pass" : "warn",
    },
    {
      id: "capture_activity",
      message:
        captureEvents.length > 0
          ? `Observed ${String(captureEvents.length)} capture event(s) across ${String(captureDaySetsByUser.size)} user(s).`
          : "No seed capture events have been recorded yet.",
      status: captureEvents.length > 0 ? "pass" : "warn",
    },
    {
      id: "enrichment_activity",
      message:
        settledEnrichmentCount > 0
          ? `Observed ${String(settledEnrichmentCount)} settled enrichment event(s) from ${String(enrichmentRequestedEvents.length)} request(s).`
          : "No settled enrichment events have been recorded yet.",
      status: settledEnrichmentCount > 0 ? "pass" : "warn",
    },
    {
      id: "review_activity",
      message:
        reviewSessionStartedEvents.length > 0 && reviewCardEvents.length > 0
          ? `Observed ${String(reviewSessionStartedEvents.length)} review session start(s) and ${String(reviewCardEvents.length)} card submission(s).`
          : "Review activity is still missing either session starts or card submissions.",
      status:
        reviewSessionStartedEvents.length > 0 && reviewCardEvents.length > 0
          ? "pass"
          : "warn",
    },
    {
      id: "capture_to_review",
      message:
        reviewTouchedSeedIds.size > 0
          ? `${String(reviewTouchedSeedIds.size)} saved word(s) have reached review activity.`
          : "Captured words have not yet converted into review activity.",
      status: reviewTouchedSeedIds.size > 0 ? "pass" : "warn",
    },
    {
      id: "session_completion",
      message:
        reviewSessionStartedEvents.length === 0
          ? "No review sessions have been started yet."
          : reviewSessionCompletedEvents.length > 0
            ? `${String(reviewSessionCompletedEvents.length)} review session(s) have completed.`
            : "Review sessions have started, but none have completed yet.",
      status:
        reviewSessionStartedEvents.length > 0 &&
        reviewSessionCompletedEvents.length > 0
          ? "pass"
          : "warn",
    },
  ];

  return {
    activity: {
      activeUsers: usersWithActivity.size,
      daysWithActivity: activityDayKeys.size,
      firstEventAt: sortedOccurredAt[0] ?? null,
      lastEventAt: sortedOccurredAt.at(-1) ?? null,
    },
    eventCounts,
    generatedAt: input.generatedAt,
    metrics: {
      averageReviewsPerSavedWord: toRate(
        reviewCardEvents.length,
        input.seeds.length,
      ),
      captureToReviewConversion: toRate(
        reviewTouchedSeedIds.size,
        input.seeds.length,
      ),
      percentageReachingDeepening: toRate(
        deepeningSeedCount,
        input.seeds.length,
      ),
      repeatCaptureRate: toRate(
        usersWithRepeatCapture,
        captureDaySetsByUser.size,
      ),
      retention30Day: computeRetentionRate({
        events: input.events,
        now: new Date(input.generatedAt),
        windowDays: 30,
      }),
      retention7Day: computeRetentionRate({
        events: input.events,
        now: new Date(input.generatedAt),
        windowDays: 7,
      }),
    },
    signals,
    totals: {
      authSignInFailures: signInFailureEvents.length,
      authSignIns: signInEvents.length,
      captures: captureEvents.length,
      reviewCardsSubmitted: reviewCardEvents.length,
      reviewSessionsCompleted: reviewSessionCompletedEvents.length,
      reviewSessionsStarted: reviewSessionStartedEvents.length,
      seeds: input.seeds.length,
      usersWithCaptures: captureDaySetsByUser.size,
      usersWithReviewActivity: usersWithReviewActivity.size,
      usersWithSignIns: new Set(
        signInEvents
          .filter((event) => "userId" in event)
          .map((event) => event.userId),
      ).size,
    },
  };
};
