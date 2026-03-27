import type { JSX } from "react";

import type { SeedEnrichment } from "@gloss/shared/types";

type SeedEnrichmentPanelProps = {
  enrichment: SeedEnrichment | null | undefined;
  errorMessage: string | null;
  isEnriching: boolean;
  onRetry: () => void;
};

const getFailedMessage = (enrichment: SeedEnrichment | null | undefined): string => {
  if (!enrichment || enrichment.status !== "failed") {
    return "Not available yet.";
  }

  switch (enrichment.errorCode) {
    case "ENRICHMENT_EVIDENCE_UNAVAILABLE":
      return "Not enough context yet.";
    case "ENRICHMENT_SCHEMA_INVALID":
      return "The response was invalid.";
    case "ENRICHMENT_PROVIDER_ERROR":
      return "The provider did not return a usable result.";
    default:
      return "Not available yet.";
  }
};

export const SeedEnrichmentPanel = ({
  enrichment,
  errorMessage,
  isEnriching,
  onRetry,
}: SeedEnrichmentPanelProps): JSX.Element => {
  if (errorMessage && !isEnriching && !enrichment) {
    return (
      <section className="seed-enrichment seed-enrichment--failed">
        <p className="seed-enrichment__label">Definition</p>
        <p className="seed-enrichment__state-copy">{errorMessage}</p>
        <button
          className="seed-enrichment__retry"
          onClick={onRetry}
          type="button"
        >
          Try again
        </button>
      </section>
    );
  }

  if (isEnriching || enrichment?.status === "pending" || !enrichment) {
    return (
      <section className="seed-enrichment seed-enrichment--pending">
        <p className="seed-enrichment__label">Definition</p>
        <p className="seed-enrichment__state-copy">Loading definition...</p>
        {enrichment?.status === "pending" ? (
          <button
            className="seed-enrichment__retry"
            onClick={onRetry}
            type="button"
          >
            Refresh
          </button>
        ) : null}
      </section>
    );
  }

  if (enrichment.status === "failed") {
    return (
      <section className="seed-enrichment seed-enrichment--failed">
        <p className="seed-enrichment__label">Definition</p>
        <p className="seed-enrichment__state-copy">
          {errorMessage ?? getFailedMessage(enrichment)}
        </p>
        <button
          className="seed-enrichment__retry"
          onClick={onRetry}
          type="button"
        >
          Try again
        </button>
      </section>
    );
  }

  if (!enrichment.payload) {
    return (
      <section className="seed-enrichment seed-enrichment--failed">
        <p className="seed-enrichment__label">Definition</p>
        <p className="seed-enrichment__state-copy">
          No definition available.
        </p>
      </section>
    );
  }

  const payload = enrichment.payload;

  return (
    <section className="seed-enrichment seed-enrichment--ready">
      <div className="seed-enrichment__header">
        <p className="seed-enrichment__label">Definition</p>
      </div>
      <p className="seed-enrichment__gloss">{payload.gloss}</p>
      <div className="seed-enrichment__grid">
        
        {payload.registerNote ? (
          <article className="seed-enrichment__item">
            <h4>Register</h4>
            <p>{payload.registerNote}</p>
          </article>
        ) : null}

        {payload.relatedWord ? (
          <article className="seed-enrichment__item">
            <h4>Related Word</h4>
            <p className="seed-enrichment__relation-word">{payload.relatedWord.word}</p>
            <p>{payload.relatedWord.note}</p>
          </article>
        ) : null}

        {payload.contrastiveWord ? (
          <article className="seed-enrichment__item">
            <h4>Contrastive Word</h4>
            <p className="seed-enrichment__relation-word">
              {payload.contrastiveWord.word}
            </p>
            <p>{payload.contrastiveWord.note}</p>
          </article>
        ) : null}

        {payload.morphologyNote ? (
          <article className="seed-enrichment__item">
            <h4>Morphology</h4>
            <p>{payload.morphologyNote.note}</p>
          </article>
        ) : null}
      </div>
    </section>
  );
};
