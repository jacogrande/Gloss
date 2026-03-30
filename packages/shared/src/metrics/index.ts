import type {
  ProductEvent,
  SeedStage,
} from "../types/index";

export type PrivateAlphaSeedSnapshot = {
  createdAt: string;
  id: string;
  stage: SeedStage;
  userId: string;
};

export type PrivateAlphaReport = {
  generatedAt: string;
  metrics: {
    averageReviewsPerSavedWord: number | null;
    captureToReviewConversion: number | null;
    percentageReachingDeepening: number | null;
    repeatCaptureRate: number | null;
    retention30Day: number | null;
    retention7Day: number | null;
  };
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

export const derivePrivateAlphaReport = (input: {
  events: ProductEvent[];
  generatedAt: string;
  seeds: PrivateAlphaSeedSnapshot[];
}): PrivateAlphaReport => {
  const authoritativeSeedIds = new Set(input.seeds.map((seed) => seed.id));
  const captureEvents = input.events.filter((event) => event.type === "seed.capture");
  const signInEvents = input.events.filter((event) => event.type === "auth.sign_in");
  const signInFailureEvents = input.events.filter(
    (event) => event.type === "auth.sign_in_failed",
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

  return {
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
