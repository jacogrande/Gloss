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
    return "Gloss could not enrich this seed yet.";
  }

  switch (enrichment.errorCode) {
    case "ENRICHMENT_EVIDENCE_UNAVAILABLE":
      return "The lexical evidence was too thin to generate a safe enrichment.";
    case "ENRICHMENT_SCHEMA_INVALID":
      return "The enrichment output did not pass validation.";
    case "ENRICHMENT_PROVIDER_ERROR":
      return "The enrichment provider did not return a usable result.";
    default:
      return "Gloss could not enrich this seed yet.";
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
      <section className="panel seed-enrichment">
        <p className="panel__eyebrow">Constrained Enrichment</p>
        <h3>Enrichment paused</h3>
        <p className="panel__copy">{errorMessage}</p>
        <button
          className="seed-enrichment__retry"
          onClick={onRetry}
          type="button"
        >
          Retry enrichment
        </button>
      </section>
    );
  }

  if (isEnriching || enrichment?.status === "pending" || !enrichment) {
    return (
      <section className="panel seed-enrichment">
        <p className="panel__eyebrow">Constrained Enrichment</p>
        <h3>Building lexical scaffolding</h3>
        <p className="panel__copy">
          Gloss is assembling evidence and generating a compact learning block for
          this seed.
        </p>
        {enrichment?.status === "pending" ? (
          <button
            className="seed-enrichment__retry"
            onClick={onRetry}
            type="button"
          >
            Refresh enrichment
          </button>
        ) : null}
      </section>
    );
  }

  if (enrichment.status === "failed") {
    return (
      <section className="panel seed-enrichment">
        <p className="panel__eyebrow">Constrained Enrichment</p>
        <h3>Enrichment paused</h3>
        <p className="panel__copy">{errorMessage ?? getFailedMessage(enrichment)}</p>
        <button
          className="seed-enrichment__retry"
          onClick={onRetry}
          type="button"
        >
          Retry enrichment
        </button>
      </section>
    );
  }

  if (!enrichment.payload) {
    return (
      <section className="panel seed-enrichment">
        <p className="panel__eyebrow">Constrained Enrichment</p>
        <h3>Enrichment unavailable</h3>
        <p className="panel__copy">
          Gloss did not receive a usable enrichment payload for this seed.
        </p>
      </section>
    );
  }

  const payload = enrichment.payload;

  return (
    <section className="panel seed-enrichment">
      <p className="panel__eyebrow">Constrained Enrichment</p>
      <h3>Lexical scaffolding</h3>
      <div className="seed-enrichment__grid">
        <article className="seed-enrichment__item">
          <h4>Gloss</h4>
          <p>{payload.gloss}</p>
        </article>

        {payload.registerNote ? (
          <article className="seed-enrichment__item">
            <h4>Register</h4>
            <p>{payload.registerNote}</p>
          </article>
        ) : null}

        {payload.relatedWord ? (
          <article className="seed-enrichment__item">
            <h4>Related Word</h4>
            <p>
              <strong>{payload.relatedWord.word}</strong>
            </p>
            <p>{payload.relatedWord.note}</p>
          </article>
        ) : null}

        {payload.contrastiveWord ? (
          <article className="seed-enrichment__item">
            <h4>Contrastive Word</h4>
            <p>
              <strong>{payload.contrastiveWord.word}</strong>
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
