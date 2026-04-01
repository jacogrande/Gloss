import type { JSX } from "react";

import type { SeedEnrichment } from "@gloss/shared/types";

import {
  shouldShowContextualGloss,
  toDictionaryDefinition,
} from "../../lib/contextual-gloss";
import {
  getSeedEnrichmentFallbackView,
} from "./seed-presenters";

type SeedEnrichmentPanelProps = {
  enrichment: SeedEnrichment | null | undefined;
  errorMessage: string | null;
  isEnriching: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  showManualRefresh: boolean;
};

export const SeedEnrichmentPanel = ({
  enrichment,
  errorMessage,
  isEnriching,
  onRefresh,
  onRetry,
  showManualRefresh,
}: SeedEnrichmentPanelProps): JSX.Element => {
  const fallbackView = getSeedEnrichmentFallbackView({
    enrichment,
    errorMessage,
    isEnriching,
    showManualRefresh,
  });

  if (fallbackView) {
    return (
      <section className={`seed-enrichment seed-enrichment--${fallbackView.variant}`}>
        <p className="seed-enrichment__kicker">{fallbackView.title}</p>
        <p className="seed-enrichment__state-copy">{fallbackView.message}</p>
        {fallbackView.canAct && fallbackView.actionLabel ? (
          <button
            className={
              fallbackView.actionKind === "refresh"
                ? "seed-enrichment__refresh-link"
                : "seed-enrichment__retry"
            }
            onClick={
              fallbackView.actionKind === "refresh" ? onRefresh : onRetry
            }
            type="button"
          >
            {fallbackView.actionLabel}
          </button>
        ) : null}
      </section>
    );
  }

  const payload = enrichment?.status === "ready" ? enrichment.payload : null;

  if (!payload) {
    return (
      <section className="seed-enrichment seed-enrichment--failed">
        <p className="seed-enrichment__kicker">Definition</p>
        <p className="seed-enrichment__state-copy">No definition available.</p>
      </section>
    );
  }
  const dictionaryDefinition = toDictionaryDefinition(payload.gloss);
  const showContextualGloss = shouldShowContextualGloss(
    dictionaryDefinition,
    payload.gloss,
  );

  return (
    <section className="seed-enrichment seed-enrichment--ready">
      <p className="seed-enrichment__kicker">Definition</p>
      <p className="seed-enrichment__gloss">{dictionaryDefinition}</p>
      {showContextualGloss ? (
        <article className="seed-enrichment__item seed-enrichment__contextual">
          <h2 className="seed-detail__section-title">In context</h2>
          <p>{payload.gloss}</p>
        </article>
      ) : null}
    </section>
  );
};
