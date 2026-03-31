import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type JSX,
} from "react";
import { Link, useNavigate } from "react-router-dom";

import type {
  ReviewCard,
  ReviewQueueSummary,
  ReviewSessionDetail,
} from "@gloss/shared/types";

import { getReviewQueueDisplayState } from "../features/review/review-presenters";
import { useSessionState } from "../features/auth/session-provider";
import {
  fetchReviewQueue,
  fetchReviewSession,
  startReviewSession,
  submitReviewCard,
} from "../lib/api-client";
import { webEnv } from "../lib/env";
import { ApiClientError } from "../lib/http";
import { useAsyncResource } from "../lib/use-async-resource";

const getCurrentCard = (
  session: ReviewSessionDetail | null,
): ReviewCard | null =>
  session?.cards.find((card) => card.status === "pending") ?? null;

export const ReviewRoute = (): JSX.Element => {
  const navigate = useNavigate();
  const sessionState = useSessionState();
  const [session, setSession] = useState<ReviewSessionDetail | null>(null);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const cardStartedAt = useRef<number>(Date.now());
  const lastLoadedSessionId = useRef<string | null>(null);

  const {
    data: queue,
    errorMessage,
    isLoading,
  } = useAsyncResource<ReviewQueueSummary>({
    dependencies: [refreshKey],
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : "Unable to load review right now.",
    load: (signal) => fetchReviewQueue(webEnv.VITE_API_BASE_URL, signal),
  });

  const refreshQueue = useEffectEvent((): void => {
    setRefreshKey((current) => current + 1);
  });

  const handleUnauthorized = useEffectEvent(async (): Promise<void> => {
    sessionState.setSession(null);
    await navigate("/login", { replace: true });
  });

  const reconcileSessionConflict = useEffectEvent(
    async (message: string): Promise<void> => {
      if (!session?.session.id) {
        setSession(null);
        setSessionMessage(message);
        refreshQueue();
        return;
      }

      try {
        const nextSession = await fetchReviewSession(
          webEnv.VITE_API_BASE_URL,
          session.session.id,
        );

        setSession(nextSession);
        setSessionMessage(message);
        setSelectedChoiceId(null);
        cardStartedAt.current = Date.now();
        lastLoadedSessionId.current = nextSession.session.id;
        refreshQueue();
      } catch (error) {
        if (
          error instanceof ApiClientError &&
          error.code === "AUTH_UNAUTHORIZED"
        ) {
          await handleUnauthorized();
          return;
        }

        setSession(null);
        setSessionMessage(message);
        refreshQueue();
      }
    },
  );

  const loadSession = useEffectEvent(async (sessionId: string): Promise<void> => {
    try {
      const nextSession = await fetchReviewSession(
        webEnv.VITE_API_BASE_URL,
        sessionId,
      );

      setSession(nextSession);
      setSessionMessage(null);
      setSelectedChoiceId(null);
      cardStartedAt.current = Date.now();
      lastLoadedSessionId.current = sessionId;
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.code === "AUTH_UNAUTHORIZED"
      ) {
        await handleUnauthorized();
        return;
      }

      setSessionMessage(
        error instanceof Error
          ? error.message
          : "Unable to load this review session.",
      );
    }
  });

  useEffect(() => {
    if (!queue?.activeSessionId) {
      if (session?.session.status !== "active") {
        lastLoadedSessionId.current = null;
      }

      return;
    }

    if (lastLoadedSessionId.current === queue.activeSessionId) {
      return;
    }

    void loadSession(queue.activeSessionId);
  }, [loadSession, queue?.activeSessionId, session?.session.status]);

  useEffect(() => {
    cardStartedAt.current = Date.now();
    setSelectedChoiceId(null);
  }, [session?.session.currentCardId]);

  const currentCard = getCurrentCard(session);
  const queueDisplayState = queue ? getReviewQueueDisplayState(queue) : null;

  const startSession = async (): Promise<void> => {
    setIsStarting(true);
    setQueueMessage(null);

    try {
      const nextSession = await startReviewSession(webEnv.VITE_API_BASE_URL);

      setSession(nextSession);
      setSessionMessage(null);
      lastLoadedSessionId.current = nextSession.session.id;
      refreshQueue();
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.code === "AUTH_UNAUTHORIZED"
      ) {
        await handleUnauthorized();
        return;
      }

      setQueueMessage(
        error instanceof Error
          ? error.message
          : "Unable to start review right now.",
      );
    } finally {
      setIsStarting(false);
    }
  };

  const submitCurrentCard = async (): Promise<void> => {
    if (!currentCard || !selectedChoiceId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSessionMessage(null);

    try {
      const response = await submitReviewCard(webEnv.VITE_API_BASE_URL, {
        cardId: currentCard.id,
        sessionId: session?.session.id ?? "",
        submission: {
          choiceId: selectedChoiceId,
          latencyMs: Math.max(Date.now() - cardStartedAt.current, 0),
        },
      });

      setSession(response.session);
      setSelectedChoiceId(null);
      refreshQueue();
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.code === "AUTH_UNAUTHORIZED"
      ) {
        await handleUnauthorized();
        return;
      }

      if (
        error instanceof ApiClientError &&
        error.code === "REVIEW_CONFLICT"
      ) {
        await reconcileSessionConflict(
          "This review changed elsewhere. The latest card is shown here.",
        );
        return;
      }

      setSessionMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit this answer right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !queue && !session) {
    return (
      <section className="panel">
        <p className="panel__copy">Loading review...</p>
      </section>
    );
  }

  if (session && currentCard) {
    return (
      <section className="review">
        <div className="panel panel--compact review__queue-panel">
          <div className="review__queue-header">
            <div>
              <h2>Review</h2>
              <p className="panel__copy">
                Card {currentCard.position + 1} of {session.session.cardCount}
              </p>
            </div>
            <p className="review__queue-summary">
              {session.session.remainingCount} remaining
            </p>
          </div>
        </div>

        <section className="review-card">
          <div className="review-card__header">
            <p className="panel__eyebrow">{currentCard.exerciseType.replaceAll("_", " ")}</p>
            <h2>{currentCard.promptPayload.word}</h2>
          </div>

          {"sentence" in currentCard.promptPayload ? (
            <p className="review-card__sentence">
              {currentCard.promptPayload.sentence}
            </p>
          ) : null}

          <p className="review-card__question">{currentCard.promptPayload.question}</p>

          <div className="review-card__choices" role="radiogroup">
            {currentCard.promptPayload.choices.map((choice) => {
              const isSelected = selectedChoiceId === choice.id;

              return (
                <button
                  aria-checked={isSelected}
                  className={
                    isSelected
                      ? "review-card__choice review-card__choice--selected"
                      : "review-card__choice"
                  }
                  key={choice.id}
                  onClick={() => {
                    setSelectedChoiceId(choice.id);
                  }}
                  role="radio"
                  type="button"
                >
                  <span className="review-card__choice-label">{choice.label}</span>
                  {choice.detail ? (
                    <span className="review-card__choice-detail">{choice.detail}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {sessionMessage ? (
            <p className="capture-form__error" role="alert">
              {sessionMessage}
            </p>
          ) : null}

          <div className="review-card__actions">
            <button
              className="capture-form__submit"
              disabled={!selectedChoiceId || isSubmitting}
              onClick={() => {
                void submitCurrentCard();
              }}
              type="button"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </section>
      </section>
    );
  }

  if (session && session.session.status === "completed") {
    return (
      <section className="review">
        <section className="panel">
          <div className="panel__header">
            <p className="panel__eyebrow">Review complete</p>
            <h2>Session finished</h2>
          </div>
          <p className="panel__copy">
            You completed {session.session.cardCount} review card(s).
          </p>
          <div className="capture-form__actions">
            <button
              className="capture-form__submit"
              onClick={() => {
                setSession(null);
                refreshQueue();
              }}
              type="button"
            >
              Review again
            </button>
          </div>
        </section>
      </section>
    );
  }

  if (errorMessage && !queue) {
    return (
      <section className="review">
        <section className="panel review__queue-panel">
          <div className="review__queue-header">
            <div>
              <p className="panel__eyebrow">Queue</p>
              <h2>Review</h2>
            </div>
          </div>

          <p className="capture-form__error" role="alert">
            {errorMessage}
          </p>

          <div className="capture-form__actions">
            <Link className="capture-form__secondary-link" to="/library">
              Browse your words
            </Link>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="review">
      <section className="panel review__queue-panel">
        <div className="review__queue-header">
          <div>
            <p className="panel__eyebrow">Queue</p>
            <h2>Review</h2>
          </div>
          <p className="review__queue-summary">
            {queue?.dueCount ?? 0} due
          </p>
        </div>

        <div className="review__queue-metrics">
          <div>
            <dt>Recognition</dt>
            <dd>{queue?.dueByDimension.recognition ?? 0}</dd>
          </div>
          <div>
            <dt>Distinction</dt>
            <dd>{queue?.dueByDimension.distinction ?? 0}</dd>
          </div>
          <div>
            <dt>Usage</dt>
            <dd>{queue?.dueByDimension.usage ?? 0}</dd>
          </div>
        </div>

        <p className="panel__copy">{queueDisplayState?.message ?? "Loading review..."}</p>

        {errorMessage ? <p className="capture-form__error">{errorMessage}</p> : null}
        {queueMessage ? <p className="capture-form__error">{queueMessage}</p> : null}

        <div className="capture-form__actions">
          {queueDisplayState?.canStart && queueDisplayState.actionLabel ? (
            <button
              className="capture-form__submit"
              disabled={isStarting}
              onClick={() => {
                void startSession();
              }}
              type="button"
            >
              {isStarting ? "Starting..." : queueDisplayState.actionLabel}
            </button>
          ) : null}
          {queueDisplayState?.secondaryAction ? (
            <Link
              className="capture-form__secondary-link"
              to={queueDisplayState.secondaryAction.href}
            >
              {queueDisplayState.secondaryAction.label}
            </Link>
          ) : null}
        </div>
      </section>
    </section>
  );
};
