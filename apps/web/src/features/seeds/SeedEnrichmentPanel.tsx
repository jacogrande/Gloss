import type {
  CSSProperties,
  JSX,
} from "react";

import type { SeedEnrichment } from "@gloss/shared/types";

import {
  shouldShowContextualGloss,
  toDictionaryDefinition,
} from "../../lib/contextual-gloss";
import {
  getSeedEnrichmentFallbackView,
  getSeedEnrichmentLoadingNarrative,
  getSeedEnrichmentLoadingSteps,
} from "./seed-presenters";

type SeedEnrichmentPanelProps = {
  enrichment: SeedEnrichment | null | undefined;
  errorMessage: string | null;
  isEnriching: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  primarySentence: string | null;
  showManualRefresh: boolean;
  word: string;
};

const SeedEnrichmentLoadingWizard = (input: {
  isRefreshing: boolean;
  lexicalPreview: SeedEnrichment["lexicalPreview"];
  onRefresh: () => void;
  primarySentence: string | null;
  showManualRefresh: boolean;
  word: string;
}): JSX.Element => {
  const steps = getSeedEnrichmentLoadingSteps({
    isRefreshing: input.isRefreshing,
    lexicalPreview: input.lexicalPreview ?? null,
    primarySentence: input.primarySentence,
  });
  const narrative = getSeedEnrichmentLoadingNarrative({
    isRefreshing: input.isRefreshing,
    lexicalPreview: input.lexicalPreview ?? null,
    primarySentence: input.primarySentence,
    word: input.word,
  });
  const completedSteps = steps.filter((step) => step.status === "complete").length;
  const activeStepIndex = Math.max(
    steps.findIndex((step) => step.status === "active"),
    0,
  );
  const progressRatio =
    steps.length === 0
      ? 0
      : (completedSteps + (steps[activeStepIndex]?.status === "active" ? 0.6 : 0)) /
        steps.length;

  return (
    <section aria-live="polite" className="seed-enrichment__wizard">
      <header className="seed-enrichment__wizard-header">
        <div className="seed-enrichment__wizard-copy">
          <p className="seed-enrichment__kicker">{narrative.phaseLabel}</p>
          <h2 className="seed-enrichment__wizard-heading">{narrative.title}</h2>
          <p className="seed-enrichment__wizard-intro">{narrative.intro}</p>
        </div>
        <div
          aria-hidden="true"
          className="seed-enrichment__wizard-progress"
          style={{
            "--seed-enrichment-progress": `${Math.min(
              Math.max(progressRatio, 0.08),
              1,
            )}`,
          } as CSSProperties}
        />
      </header>
      <ol className="seed-enrichment__wizard-steps">
        {steps.map((step, index) => (
          <li
            className="seed-enrichment__wizard-step"
            data-status={step.status}
            key={`${step.title}-${index}`}
          >
            <span aria-hidden="true" className="seed-enrichment__wizard-marker" />
            <div className="seed-enrichment__wizard-copy">
              <p className="seed-enrichment__wizard-title">{step.title}</p>
              {step.status === "active" ? (
                <p className="seed-enrichment__wizard-body">{step.body}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <p className="seed-enrichment__wizard-note">{narrative.reassurance}</p>
      {input.showManualRefresh ? (
        <button
          className="button button--ghost seed-enrichment__refresh-link"
          disabled={input.isRefreshing}
          onClick={input.onRefresh}
          type="button"
        >
          {input.isRefreshing ? "Checking..." : "Check again"}
        </button>
      ) : null}
    </section>
  );
};

export const SeedEnrichmentPanel = ({
  enrichment,
  errorMessage,
  isEnriching,
  isRefreshing,
  onRefresh,
  onRetry,
  primarySentence,
  showManualRefresh,
  word,
}: SeedEnrichmentPanelProps): JSX.Element => {
  const lexicalPreview = enrichment?.lexicalPreview ?? null;
  const payload = enrichment?.status === "ready" ? enrichment.payload : null;
  const primaryDefinition =
    lexicalPreview?.definition ?? (payload ? toDictionaryDefinition(payload.gloss) : null);
  const primaryDefinitionPartOfSpeech = lexicalPreview?.partOfSpeech ?? null;
  const showContextualGloss =
    payload && primaryDefinition && Boolean(primarySentence?.trim())
      ? shouldShowContextualGloss(primaryDefinition, payload.gloss)
      : false;
  const shouldShowPendingWizard =
    isEnriching ||
    enrichment?.status === "pending" ||
    (!enrichment && !errorMessage);

  if (shouldShowPendingWizard) {
    const fallbackView = getSeedEnrichmentFallbackView({
      enrichment,
      errorMessage,
      isEnriching,
      primarySentence,
      showManualRefresh,
    });

    return (
      <section className="seed-enrichment seed-enrichment--pending">
        <p className="seed-enrichment__kicker">Definition</p>
        {primaryDefinition ? (
          <div className="seed-enrichment__dictionary-entry">
            <p className="seed-enrichment__source-line">
              Merriam-Webster
              {primaryDefinitionPartOfSpeech
                ? ` · ${primaryDefinitionPartOfSpeech}`
                : ""}
            </p>
            <div className="seed-enrichment__sense-row">
              <span className="seed-enrichment__sense-index">1</span>
              <p className="seed-enrichment__gloss">{primaryDefinition}</p>
            </div>
          </div>
        ) : (
          <div aria-hidden="true" className="seed-enrichment__definition-skeleton">
            <span className="seed-enrichment__definition-skeleton-line seed-enrichment__definition-skeleton-line--meta" />
            <span className="seed-enrichment__definition-skeleton-line seed-enrichment__definition-skeleton-line--sense" />
            <span className="seed-enrichment__definition-skeleton-line seed-enrichment__definition-skeleton-line--detail" />
          </div>
        )}
        <SeedEnrichmentLoadingWizard
          isRefreshing={isRefreshing}
          lexicalPreview={lexicalPreview}
          onRefresh={onRefresh}
          primarySentence={primarySentence}
          showManualRefresh={showManualRefresh}
          word={word}
        />
        {fallbackView?.variant === "pending" && Boolean(errorMessage) ? (
          <p className="seed-enrichment__state-copy">{fallbackView.message}</p>
        ) : null}
      </section>
    );
  }

  const fallbackView = getSeedEnrichmentFallbackView({
    enrichment,
    errorMessage,
    isEnriching,
    primarySentence,
    showManualRefresh,
  });

  if (fallbackView) {
    return (
      <section className={`seed-enrichment seed-enrichment--${fallbackView.variant}`}>
        <p className="seed-enrichment__kicker">{fallbackView.title}</p>
        {primaryDefinition ? (
          <div className="seed-enrichment__dictionary-entry">
            <p className="seed-enrichment__source-line">
              Merriam-Webster
              {primaryDefinitionPartOfSpeech
                ? ` · ${primaryDefinitionPartOfSpeech}`
                : ""}
            </p>
            <div className="seed-enrichment__sense-row">
              <span className="seed-enrichment__sense-index">1</span>
              <p className="seed-enrichment__gloss">{primaryDefinition}</p>
            </div>
          </div>
        ) : null}
        <p className="seed-enrichment__state-copy">
          {fallbackView.variant === "pending" && isRefreshing
            ? "Checking again for the reading-specific pass..."
            : fallbackView.message}
        </p>
        {fallbackView.variant === "pending" && isRefreshing ? (
          <p aria-live="polite" className="capture-form__hint">
            Gloss is still working in the background.
          </p>
        ) : null}
        {fallbackView.canAct && fallbackView.actionLabel ? (
          <button
            className={
              fallbackView.actionKind === "refresh"
                ? "button button--ghost seed-enrichment__refresh-link"
                : "button button--primary seed-enrichment__retry"
            }
            disabled={fallbackView.actionKind === "refresh" && isRefreshing}
            onClick={
              fallbackView.actionKind === "refresh" ? onRefresh : onRetry
            }
            type="button"
          >
            {fallbackView.actionKind === "refresh" && isRefreshing
              ? "Checking..."
              : fallbackView.actionLabel}
          </button>
        ) : null}
      </section>
    );
  }

  if (!payload) {
    return (
      <section className="seed-enrichment seed-enrichment--failed">
        <p className="seed-enrichment__kicker">Definition</p>
        <p className="seed-enrichment__state-copy">No definition available.</p>
      </section>
    );
  }

  return (
    <section className="seed-enrichment seed-enrichment--ready">
      <p className="seed-enrichment__kicker">Definition</p>
      {primaryDefinition ? (
        <div className="seed-enrichment__dictionary-entry">
          <p className="seed-enrichment__source-line">
            Merriam-Webster
            {primaryDefinitionPartOfSpeech
              ? ` · ${primaryDefinitionPartOfSpeech}`
              : ""}
          </p>
          <div className="seed-enrichment__sense-row">
            <span className="seed-enrichment__sense-index">1</span>
            <p className="seed-enrichment__gloss">{primaryDefinition}</p>
          </div>
        </div>
      ) : null}
      {showContextualGloss ? (
        <article className="seed-enrichment__item seed-enrichment__contextual">
          <h2 className="seed-detail__section-title">In your sentence</h2>
          <p>{payload.gloss}</p>
        </article>
      ) : null}
    </section>
  );
};
