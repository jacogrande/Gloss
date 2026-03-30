import {
  createReviewSessionInputSchema,
  reviewQueueResponseSchema,
  reviewSessionResponseSchema,
  reviewSubmissionInputSchema,
  submitReviewCardResponseSchema,
} from "@gloss/shared/contracts";

import type { GlossApp } from "../app";
import type { GlossAuth } from "../lib/auth";
import { jsonSuccess } from "../lib/http";
import { requireSession } from "../lib/session";
import type { RequestRateLimitService } from "../services/request-rate-limit-service";
import type { ReviewService } from "../services/review-service";

type ReviewRouteDependencies = {
  auth: GlossAuth;
  requestRateLimitService: RequestRateLimitService;
  reviewService: ReviewService;
};

export const registerReviewRoutes = (
  app: GlossApp,
  dependencies: ReviewRouteDependencies,
): void => {
  app.get("/review/queue", async (context) => {
    context.set("journey", "review.queue");
    const session = await requireSession({
      auth: dependencies.auth,
      headers: context.req.raw.headers,
      requestId: context.get("requestId"),
    });
    context.set("actorTag", String(session.user.id));
    context.set("sessionId", String(session.session.id));
    const queue = await dependencies.reviewService.getQueueSummary({
      userId: String(session.user.id),
    });

    return jsonSuccess(
      context,
      reviewQueueResponseSchema.parse({
        data: queue,
        ok: true,
      }).data,
    );
  });

  app.post("/review/sessions", async (context) => {
    context.set("journey", "review.session.start");
    const session = await requireSession({
      auth: dependencies.auth,
      headers: context.req.raw.headers,
      requestId: context.get("requestId"),
    });
    context.set("actorTag", String(session.user.id));
    context.set("sessionId", String(session.session.id));
    await dependencies.requestRateLimitService.enforce({
      actorKey: String(session.user.id),
      policyKey: "review.session.start",
      requestId: context.get("requestId"),
    });
    const input = createReviewSessionInputSchema.parse(
      (await context.req.json().catch(() => ({}))) as unknown,
    );
    const reviewSession = await dependencies.reviewService.startOrResumeSession({
      requestId: context.get("requestId"),
      userId: String(session.user.id),
      ...(input.limit === undefined
        ? {}
        : {
            limit: input.limit,
          }),
    });

    return jsonSuccess(
      context,
      reviewSessionResponseSchema.parse({
        data: reviewSession,
        ok: true,
      }).data,
    );
  });

  app.get("/review/sessions/:sessionId", async (context) => {
    context.set("journey", "review.session.read");
    const session = await requireSession({
      auth: dependencies.auth,
      headers: context.req.raw.headers,
      requestId: context.get("requestId"),
    });
    context.set("actorTag", String(session.user.id));
    context.set("sessionId", String(session.session.id));
    const reviewSession = await dependencies.reviewService.getSession({
      requestId: context.get("requestId"),
      sessionId: context.req.param("sessionId"),
      userId: String(session.user.id),
    });

    return jsonSuccess(
      context,
      reviewSessionResponseSchema.parse({
        data: reviewSession,
        ok: true,
      }).data,
    );
  });

  app.post("/review/sessions/:sessionId/cards/:cardId/submit", async (context) => {
    context.set("journey", "review.session.submit");
    const session = await requireSession({
      auth: dependencies.auth,
      headers: context.req.raw.headers,
      requestId: context.get("requestId"),
    });
    context.set("actorTag", String(session.user.id));
    context.set("sessionId", String(session.session.id));
    await dependencies.requestRateLimitService.enforce({
      actorKey: String(session.user.id),
      policyKey: "review.session.submit",
      requestId: context.get("requestId"),
    });
    const input = reviewSubmissionInputSchema.parse(
      (await context.req.json()) as unknown,
    );
    const response = await dependencies.reviewService.submitCardAnswer({
      cardId: context.req.param("cardId"),
      requestId: context.get("requestId"),
      sessionId: context.req.param("sessionId"),
      submission: input,
      userId: String(session.user.id),
    });

    return jsonSuccess(
      context,
      submitReviewCardResponseSchema.parse({
        data: response,
        ok: true,
      }).data,
    );
  });
};
