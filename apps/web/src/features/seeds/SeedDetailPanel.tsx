import type { JSX } from "react";
import { Link } from "react-router-dom";

import type { SeedDetail } from "@gloss/shared/types";

import { SeedEnrichmentPanel } from "./SeedEnrichmentPanel";
import {
  formatAnnotationDate,
  formatSeedStageLabel,
  formatSourceKindLabel,
  getAdditionalContexts,
} from "./seed-presenters";

type SeedDetailPanelProps = {
  enrichmentErrorMessage: string | null;
  isEnriching: boolean;
  onRetryEnrichment: () => void;
  seed: SeedDetail;
};

export const SeedDetailPanel = ({
  enrichmentErrorMessage,
  isEnriching,
  onRetryEnrichment,
  seed,
}: SeedDetailPanelProps): JSX.Element => {
  const payload =
    seed.enrichment?.status === "ready" ? seed.enrichment.payload : null;
  const additionalContexts = getAdditionalContexts(seed);
  const showCompare =
    Boolean(payload?.registerNote) ||
    Boolean(payload?.relatedWord) ||
    Boolean(payload?.contrastiveWord);

  return (
    <section className="seed-detail">
      <div className="seed-detail__topline">
        <Link className="seed-detail__back" to="/library">
          Back to library
        </Link>
      </div>

      <header className="seed-detail__hero">
        <div className="seed-detail__title-row">
          <h1>{seed.word}</h1>
          <p className="seed-detail__status-badge" data-stage={seed.stage}>
            {formatSeedStageLabel(seed.stage)}
          </p>
        </div>
      </header>

      <section className="seed-detail__reading-block">
        <SeedEnrichmentPanel
          enrichment={seed.enrichment}
          errorMessage={enrichmentErrorMessage}
          isEnriching={isEnriching}
          onRetry={onRetryEnrichment}
        />

        {seed.primarySentence ? (
          <article className="seed-detail__example">
            <h2 className="seed-detail__section-title">Example</h2>
            <p className="seed-detail__sentence">{seed.primarySentence}</p>
          </article>
        ) : null}
      </section>

      {showCompare ? (
        <section className="seed-detail__compare-panel">
          <h2 className="seed-detail__panel-title">Compare</h2>
          <dl className="seed-detail__stack">
            {payload?.registerNote ? (
              <div>
                <dt>Tone</dt>
                <dd>{payload.registerNote}</dd>
              </div>
            ) : null}
            {payload?.relatedWord ? (
              <div>
                <dt>Similar</dt>
                <dd>
                  <span className="seed-detail__term">
                    {payload.relatedWord.word}
                  </span>
                  <span>{payload.relatedWord.note}</span>
                </dd>
              </div>
            ) : null}
            {payload?.contrastiveWord ? (
              <div>
                <dt>Contrast</dt>
                <dd>
                  <span className="seed-detail__term">
                    {payload.contrastiveWord.word}
                  </span>
                  <span>{payload.contrastiveWord.note}</span>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <div className="seed-detail__details-group">
        {payload?.morphologyNote ? (
          <details className="seed-detail__details">
            <summary>Roots</summary>
            <p className="seed-detail__copy">{payload.morphologyNote.note}</p>
          </details>
        ) : null}

        {seed.source ? (
          <details className="seed-detail__details">
            <summary>Source details</summary>
            <dl className="seed-detail__meta">
              <div>
                <dt>Type</dt>
                <dd>{formatSourceKindLabel(seed.source.kind)}</dd>
              </div>
              {seed.source.title ? (
                <div>
                  <dt>Title</dt>
                  <dd>{seed.source.title}</dd>
                </div>
              ) : null}
              {seed.source.author ? (
                <div>
                  <dt>Author</dt>
                  <dd>{seed.source.author}</dd>
                </div>
              ) : null}
              {seed.source.url ? (
                <div>
                  <dt>Link</dt>
                  <dd>
                    <a href={seed.source.url} rel="noreferrer" target="_blank">
                      {seed.source.url}
                    </a>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Captured</dt>
                <dd>{formatAnnotationDate(seed.createdAt)}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatAnnotationDate(seed.updatedAt)}</dd>
              </div>
            </dl>
          </details>
        ) : null}

        {additionalContexts.length > 0 ? (
          <details className="seed-detail__details">
            <summary>Saved context</summary>
            <ul className="seed-detail__contexts">
              {additionalContexts.map((context) => (
                <li key={context.id}>
                  <strong>{context.kind}</strong>
                  <p>{context.text}</p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </section>
  );
};
