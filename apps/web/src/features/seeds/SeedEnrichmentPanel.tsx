import type { JSX } from "react";

import type { SeedEnrichment } from "@gloss/shared/types";

import {
  shouldShowContextualGloss,
  toDictionaryDefinition,
} from "./seed-presenters";

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
        <p className="seed-enrichment__kicker">Meaning</p>
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
        <p className="seed-enrichment__kicker">Meaning</p>
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
        <p className="seed-enrichment__kicker">Meaning</p>
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
        <p className="seed-enrichment__kicker">Meaning</p>
        <p className="seed-enrichment__state-copy">
          No definition available.
        </p>
      </section>
    );
  }

  const payload = enrichment.payload;
  const dictionaryDefinition = toDictionaryDefinition(payload.gloss);
  const showContextualGloss = shouldShowContextualGloss(
    dictionaryDefinition,
    payload.gloss,
  );

  return (
    <section className="seed-enrichment seed-enrichment--ready">
      <p className="seed-enrichment__kicker">Meaning</p>
      <p className="seed-enrichment__gloss">{dictionaryDefinition}</p>
      {showContextualGloss ? (
        <article className="seed-enrichment__item seed-enrichment__contextual">
          <h2 className="seed-detail__section-title">Meaning here</h2>
          <p>{payload.gloss}</p>
        </article>
      ) : null}
    </section>
  );
};
