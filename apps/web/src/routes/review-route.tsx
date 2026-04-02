import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type JSX,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import type {
  ReviewCard,
  ReviewSessionDetail,
  ReviewSubmissionInput,
  ReviewSubmissionResult,
} from "@gloss/shared/types";

import {
  formatReviewExerciseLabel,
  formatReviewProgressLabel,
  formatReviewRemainingLabel,
  getReviewCardHeading,
  getReviewCompletionDisplayState,
  getReviewFeedbackDisplayState,
  getReviewQueueDisplayState,
  getReviewRouteState,
  type ReviewFeedbackSnapshot,
} from "../features/review/review-presenters";
import {
  getCurrentAppPath,
  getLoginPath,
} from "../features/auth/post-auth";
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

type SubmitSuccess = {
  result: ReviewSubmissionResult;
  session: ReviewSessionDetail;
};

const createFeedbackSnapshot = (input: {
  response: SubmitSuccess;
  submission: ReviewSubmissionInput;
}): ReviewFeedbackSnapshot | null => {
  const answeredCard = input.response.session.cards.find(
    (card) => card.id === input.response.result.cardId,
  );

  if (!answeredCard) {
    return null;
  }

  return {
    card: answeredCard,
    result: input.response.result,
    submission: input.submission,
  };
};

export const ReviewRoute = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionState = useSessionState();
  const [session, setSession] = useState<ReviewSessionDetail | null>(null);
  const [feedbackState, setFeedbackState] = useState<ReviewFeedbackSnapshot | null>(
    null,
  );
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const cardStartedAt = useRef<number>(Date.now());
  const lastLoadedSessionId = useRef<string | null>(null);

  const {
    data: queue,
    errorMessage,
    isLoading,
  } = useAsyncResource({
    dependencies: [refreshKey],
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : "Unable to load review right now.",
    load: (signal) => fetchReviewQueue(webEnv.VITE_API_BASE_URL, signal),
  });

  const refreshQueue = useEffectEvent((): void => {
    setRefreshKey((current) => current + 1);
  });

  const handleUnauthorized = useEffectEvent(async (): Promise<void> => {
    setFeedbackState(null);
    sessionState.setSession(null);
    await navigate(
      getLoginPath({
        returnTo: getCurrentAppPath(location),
      }),
      { replace: true },
    );
  });

  const reconcileSessionConflict = useEffectEvent(
    async (message: string): Promise<void> => {
      if (!session?.session.id) {
        setFeedbackState(null);
        setSession(null);
        setSessionError(null);
        setSessionNotice(message);
        refreshQueue();
        return;
      }

      try {
        const nextSession = await fetchReviewSession(
          webEnv.VITE_API_BASE_URL,
          session.session.id,
        );

      setFeedbackState(null);
      setSession(nextSession);
      setSessionError(null);
      setSessionNotice(message);
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

        setFeedbackState(null);
        setSession(null);
        setSessionError("Unable to load the latest review session.");
        setSessionNotice(message);
        lastLoadedSessionId.current = null;
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

      setFeedbackState(null);
      setSession(nextSession);
      setSessionError(null);
      setSessionNotice(null);
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

      setFeedbackState(null);
      setSession(null);
      setSessionNotice(null);
      setSessionError(
        error instanceof Error
          ? error.message
          : "Unable to load this review session.",
      );
      lastLoadedSessionId.current = null;
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
    if (feedbackState) {
      return;
    }

    cardStartedAt.current = Date.now();
    setSelectedChoiceId(null);
    setTextAnswer("");
  }, [feedbackState, session?.session.currentCardId]);

  const startSession = async (): Promise<void> => {
    setIsStarting(true);
    setQueueMessage(null);
    setSessionError(null);
    setSessionNotice(null);

    try {
      const nextSession = await startReviewSession(webEnv.VITE_API_BASE_URL);

      setFeedbackState(null);
      setSession(nextSession);
      setSessionError(null);
      setSessionNotice(null);
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

  const submitCurrentCard = async (card: ReviewCard): Promise<void> => {
    const submission: ReviewSubmissionInput =
      card.promptPayload.type === "cloze_recall"
        ? {
            latencyMs: Math.max(Date.now() - cardStartedAt.current, 0),
            text: textAnswer.trim(),
            type: "text",
          }
        : {
            choiceId: selectedChoiceId ?? "",
            latencyMs: Math.max(Date.now() - cardStartedAt.current, 0),
            type: "choice",
          };

    if (
      isSubmitting ||
      (submission.type === "choice" && submission.choiceId.length === 0) ||
      (submission.type === "text" && submission.text.length === 0)
    ) {
      return;
    }

    setIsSubmitting(true);
    setSessionError(null);

    try {
      const response = await submitReviewCard(webEnv.VITE_API_BASE_URL, {
        cardId: card.id,
        sessionId: session?.session.id ?? "",
        submission,
      });

      setSession(response.session);
      setFeedbackState(
        createFeedbackSnapshot({
          response,
          submission,
        }),
      );
      setSessionNotice(null);
      setSelectedChoiceId(null);
      setTextAnswer("");
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

      setSessionError(
        error instanceof Error
          ? error.message
          : "Unable to submit this answer right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSessionState = (): void => {
    setFeedbackState(null);
    setSelectedChoiceId(null);
    setSessionError(null);
    setSessionNotice(null);
    setSession(null);
    lastLoadedSessionId.current = null;
    refreshQueue();
  };

  const resumeActiveSession = async (): Promise<void> => {
    if (!queue?.activeSessionId) {
      return;
    }

    setIsStarting(true);
    setSessionError(null);

    try {
      await loadSession(queue.activeSessionId);
    } finally {
      setIsStarting(false);
    }
  };

  const reviewState = getReviewRouteState({
    feedback: feedbackState,
    isInitialLoading: isLoading && !queue && !session,
    session,
  });

  if (reviewState.kind === "loading") {
    return (
      <section className="panel">
        <p className="panel__copy">Loading review...</p>
      </section>
    );
  }

  if (reviewState.kind === "card") {
    return (
      <section className="review">
        <div className="panel panel--compact review__queue-panel">
          <div className="review__queue-header">
            <div>
              <h2>Review</h2>
              <p className="panel__copy">
                {formatReviewProgressLabel({
                  card: reviewState.card,
                  session: reviewState.session.session,
                })}
              </p>
            </div>
            <p className="review__queue-summary">
              {formatReviewRemainingLabel({
                context: "answering",
                session: reviewState.session.session,
              })}
            </p>
          </div>
        </div>

        <form
          className="review-card"
          onSubmit={(event) => {
            event.preventDefault();
            void submitCurrentCard(reviewState.card);
          }}
        >
          <div className="review-card__header">
            <p className="panel__eyebrow">
              {formatReviewExerciseLabel(reviewState.card.exerciseType)}
            </p>
            <h2>{getReviewCardHeading(reviewState.card)}</h2>
          </div>

          {"sentence" in reviewState.card.promptPayload ? (
            <p className="review-card__sentence">
              {reviewState.card.promptPayload.sentence}
            </p>
          ) : null}

          <p className="review-card__question">
            {reviewState.card.promptPayload.question}
          </p>

          {"choices" in reviewState.card.promptPayload ? (
            <div className="review-card__choices" role="radiogroup">
              {reviewState.card.promptPayload.choices.map((choice) => {
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
          ) : (
            <div className="capture-form__field">
              <label htmlFor="review-text-answer">Your answer</label>
              <input
                autoComplete="off"
                autoFocus
                id="review-text-answer"
                onChange={(event) => {
                  setTextAnswer(event.target.value);
                }}
                placeholder="Type the saved word"
                type="text"
                value={textAnswer}
              />
            </div>
          )}

          {sessionError ? (
            <p className="capture-form__error" role="alert">
              {sessionError}
            </p>
          ) : null}
          {sessionNotice ? (
            <p className="capture-form__hint">{sessionNotice}</p>
          ) : null}

          <div className="review-card__actions">
            <button
              className="capture-form__submit"
              disabled={
                isSubmitting ||
                ("choices" in reviewState.card.promptPayload
                  ? !selectedChoiceId
                  : textAnswer.trim().length === 0)
              }
              type="submit"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </section>
    );
  }

  if (reviewState.kind === "feedback") {
    const feedbackDisplay = getReviewFeedbackDisplayState(reviewState.feedback);

    return (
      <section className="review">
        <div className="panel panel--compact review__queue-panel">
          <div className="review__queue-header">
            <div>
              <h2>Review</h2>
              <p className="panel__copy">
                {formatReviewProgressLabel({
                  card: reviewState.feedback.card,
                  session: reviewState.session.session,
                })}
              </p>
            </div>
            <p className="review__queue-summary">
              {formatReviewRemainingLabel({
                context: "feedback",
                session: reviewState.session.session,
              })}
            </p>
          </div>
        </div>

        <section className={`review-card review-feedback review-feedback--${feedbackDisplay.status}`}>
          <div className="review-card__header">
            <p className="panel__eyebrow">
              {formatReviewExerciseLabel(reviewState.feedback.card.exerciseType)}
            </p>
            <h2>{feedbackDisplay.title}</h2>
            <p className="panel__copy">{feedbackDisplay.message}</p>
          </div>

          {"word" in reviewState.feedback.card.promptPayload ? (
            <p className="review-feedback__word">
              {reviewState.feedback.card.promptPayload.word}
            </p>
          ) : null}

          {"sentence" in reviewState.feedback.card.promptPayload ? (
            <p className="review-card__sentence">
              {reviewState.feedback.card.promptPayload.sentence}
            </p>
          ) : null}

          <div className="review-feedback__grid">
            {feedbackDisplay.submittedAnswerLabel &&
            !reviewState.feedback.result.correct ? (
              <section className="review-feedback__choice-block">
                <h3>Your answer</h3>
                <p>{feedbackDisplay.submittedAnswerLabel}</p>
              </section>
            ) : null}

            <section className="review-feedback__choice-block">
              <h3>Correct answer</h3>
              <p>{feedbackDisplay.correctAnswerLabel}</p>
            </section>
          </div>

          <p className="review-feedback__explanation">
            {feedbackDisplay.explanation}
          </p>

          <div className="review-card__actions">
            <button
              className="capture-form__submit"
              onClick={() => {
                setFeedbackState(null);
              }}
              type="button"
            >
              Continue
            </button>
          </div>
        </section>
      </section>
    );
  }

  if (reviewState.kind === "complete") {
    const completionState = getReviewCompletionDisplayState({
      session: reviewState.session,
    });

    return (
      <section className="review">
        <section className="panel">
          <div className="panel__header">
            <p className="panel__eyebrow">Review complete</p>
            <h2>{completionState.title}</h2>
            <p className="panel__copy">{completionState.summary}</p>
          </div>
          <p className="panel__copy">{completionState.message}</p>
          <div className="capture-form__actions">
            <button
              className="capture-form__submit"
              onClick={() => {
                clearSessionState();
              }}
              type="button"
            >
              {completionState.actionLabel}
            </button>
            <Link
              className="capture-form__secondary-link"
              to={completionState.secondaryAction.href}
            >
              {completionState.secondaryAction.label}
            </Link>
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

  const queueDisplayState = getReviewQueueDisplayState(queue);

  return (
    <section className="review">
      <section className="panel review__queue-panel">
        <div className="review__queue-header">
          <div>
            <p className="panel__eyebrow">Queue</p>
            <h2>Review</h2>
          </div>
          <p className="review__queue-summary">{queueDisplayState.summary}</p>
        </div>

        {queueDisplayState.facts.length > 0 ? (
          <dl className="review__queue-facts">
            {queueDisplayState.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <p className="panel__copy">{queueDisplayState.message}</p>

        {errorMessage ? <p className="capture-form__error">{errorMessage}</p> : null}
        {sessionError ? <p className="capture-form__error">{sessionError}</p> : null}
        {sessionNotice ? <p className="capture-form__hint">{sessionNotice}</p> : null}
        {queueMessage ? <p className="capture-form__error">{queueMessage}</p> : null}

        <div className="capture-form__actions">
          {queue?.activeSessionId && !session ? (
            <button
              className="capture-form__submit"
              disabled={isStarting}
              onClick={() => {
                void resumeActiveSession();
              }}
              type="button"
            >
              {isStarting ? "Loading..." : "Resume review"}
            </button>
          ) : queueDisplayState.canStart && queueDisplayState.actionLabel ? (
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
          {queueDisplayState.secondaryAction ? (
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
