import { describe, expect, it } from "vitest";

import type {
  ProductEvent,
  SeedStage,
} from "../src/types/index";
import { derivePrivateAlphaReport } from "../src/metrics/index";

const createSeed = (input: {
  createdAt: string;
  id: string;
  stage: SeedStage;
  userId: string;
}): {
  createdAt: string;
  id: string;
  stage: SeedStage;
  userId: string;
} => input;

const createEvent = (event: ProductEvent): ProductEvent => event;

describe("private alpha report metrics", () => {
  it("derives the private-alpha KPI summary from typed events and seeds", () => {
    const report = derivePrivateAlphaReport({
      events: [
        createEvent({
          actorTag: "user_1",
          occurredAt: "2026-01-01T11:00:00.000Z",
          payload: {
            method: "email_password",
          },
          schemaVersion: "product-event.v1",
          type: "auth.sign_up",
          userId: "user_1",
        }),
        createEvent({
          actorTag: "user_1",
          occurredAt: "2026-01-01T12:00:00.000Z",
          payload: {
            method: "email_password",
          },
          schemaVersion: "product-event.v1",
          sessionId: "session_a",
          type: "auth.sign_in",
          userId: "user_1",
        }),
        createEvent({
          actorTag: "user_1",
          occurredAt: "2026-02-05T12:00:00.000Z",
          payload: {
            hasSentence: true,
            sourceKind: "article",
            stage: "stabilizing",
          },
          schemaVersion: "product-event.v1",
          seedId: "seed_1",
          type: "seed.capture",
          userId: "user_1",
        }),
        createEvent({
          actorTag: "email:deadbeefdeadbeef",
          occurredAt: "2026-01-10T12:01:00.000Z",
          payload: {
            method: "email_password",
            status: 401,
          },
          schemaVersion: "product-event.v1",
          type: "auth.sign_in_failed",
        }),
        createEvent({
          actorTag: "user_1",
          occurredAt: "2026-01-02T09:00:00.000Z",
          payload: {
            hasSentence: true,
            sourceKind: "book",
            stage: "new",
          },
          schemaVersion: "product-event.v1",
          seedId: "seed_1",
          type: "seed.capture",
          userId: "user_1",
        }),
        createEvent({
          actorTag: "user_1",
          occurredAt: "2026-01-03T09:00:00.000Z",
          payload: {
            hasSentence: false,
            sourceKind: null,
            stage: "new",
          },
          schemaVersion: "product-event.v1",
          seedId: "seed_2",
          type: "seed.capture",
          userId: "user_1",
        }),
        createEvent({
          actorTag: "user_1",
          occurredAt: "2026-01-04T12:00:00.000Z",
          payload: {
            cardCount: 2,
            seedIds: [
              "seed_1",
              "seed_missing",
            ],
          },
          reviewSessionId: "review_session_1",
          schemaVersion: "product-event.v1",
          type: "review.session.started",
          userId: "user_1",
        }),
        createEvent({
          actorTag: "user_2",
          occurredAt: "2026-01-06T12:00:00.000Z",
          payload: {
            cardCount: 1,
            seedIds: ["seed_missing_user_2"],
          },
          reviewSessionId: "review_session_2",
          schemaVersion: "product-event.v1",
          type: "review.session.started",
          userId: "user_2",
        }),
        createEvent({
          actorTag: "user_1",
          occurredAt: "2026-01-04T12:02:00.000Z",
          payload: {
            dimension: "recognition",
            exerciseType: "meaning_in_context",
            outcome: "correct",
            seedStage: "stabilizing",
          },
          reviewSessionId: "review_session_1",
          schemaVersion: "product-event.v1",
          seedId: "seed_1",
          type: "review.card.submitted",
          userId: "user_1",
        }),
        createEvent({
          actorTag: "user_1",
          occurredAt: "2026-01-04T12:03:00.000Z",
          payload: {
            dimension: "usage",
            exerciseType: "register_judgment",
            outcome: "correct",
            seedStage: "deepening",
          },
          reviewSessionId: "review_session_1",
          schemaVersion: "product-event.v1",
          seedId: "seed_1",
          type: "review.card.submitted",
          userId: "user_1",
        }),
        createEvent({
          actorTag: "user_1",
          occurredAt: "2026-01-04T12:04:00.000Z",
          payload: {
            dimension: "recognition",
            exerciseType: "meaning_in_context",
            outcome: "correct",
            seedStage: "stabilizing",
          },
          reviewSessionId: "review_session_1",
          schemaVersion: "product-event.v1",
          seedId: "seed_missing",
          type: "review.card.submitted",
          userId: "user_1",
        }),
        createEvent({
          actorTag: "user_1",
          occurredAt: "2026-01-04T12:05:00.000Z",
          payload: {
            answeredCount: 2,
            cardCount: 2,
          },
          reviewSessionId: "review_session_1",
          schemaVersion: "product-event.v1",
          type: "review.session.completed",
          userId: "user_1",
        }),
      ],
      generatedAt: "2026-02-15T12:00:00.000Z",
      seeds: [
        createSeed({
          createdAt: "2026-01-02T09:00:00.000Z",
          id: "seed_1",
          stage: "deepening",
          userId: "user_1",
        }),
        createSeed({
          createdAt: "2026-01-03T09:00:00.000Z",
          id: "seed_2",
          stage: "new",
          userId: "user_1",
        }),
      ],
    });

    expect(report.totals.authSignIns).toBe(1);
    expect(report.totals.authSignInFailures).toBe(1);
    expect(report.totals.captures).toBe(3);
    expect(report.totals.reviewCardsSubmitted).toBe(2);
    expect(report.totals.reviewSessionsCompleted).toBe(1);
    expect(report.totals.usersWithSignIns).toBe(1);
    expect(report.totals.usersWithReviewActivity).toBe(2);
    expect(report.metrics.captureToReviewConversion).toBe(0.5);
    expect(report.metrics.averageReviewsPerSavedWord).toBe(1);
    expect(report.metrics.percentageReachingDeepening).toBe(0.5);
    expect(report.metrics.repeatCaptureRate).toBe(1);
    expect(report.metrics.retention7Day).toBe(0.5);
    expect(report.metrics.retention30Day).toBe(0.5);
  });
});
