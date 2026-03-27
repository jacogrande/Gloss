import type { JSX } from "react";

import type { SeedDetail } from "@gloss/shared/types";

import { SeedEnrichmentPanel } from "./SeedEnrichmentPanel";
import {
  formatAnnotationDate,
  formatSeedStageLabel,
  formatSourceKindLabel,
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
}: SeedDetailPanelProps): JSX.Element => (
  <section className="seed-detail">
    <header className="seed-detail__hero">
      <p className="seed-detail__eyebrow" data-stage={seed.stage}>
        {formatSeedStageLabel(seed.stage)}
      </p>
      <h2>{seed.word}</h2>
    </header>

    <SeedEnrichmentPanel
      enrichment={seed.enrichment}
      errorMessage={enrichmentErrorMessage}
      isEnriching={isEnriching}
      onRetry={onRetryEnrichment}
    />

    <div className="seed-detail__grid">
      <section className="seed-detail__section">
        <p className="seed-detail__section-label">Sentence</p>
        <p className="seed-detail__sentence">
          {seed.primarySentence ?? "No sentence saved."}
        </p>
      </section>

      {seed.source ? (
        <section className="seed-detail__section">
          <p className="seed-detail__section-label">Source</p>
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
                <dt>URL</dt>
                <dd>
                  <a href={seed.source.url} rel="noreferrer" target="_blank">
                    {seed.source.url}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}
    </div>

    <section className="seed-detail__section">
      <div className="seed-detail__meta-inline">
        <div>
          <p className="seed-detail__section-label">Captured</p>
          <p>{formatAnnotationDate(seed.createdAt)}</p>
        </div>
        <div>
          <p className="seed-detail__section-label">Updated</p>
          <p>{formatAnnotationDate(seed.updatedAt)}</p>
        </div>
      </div>
    </section>

    {seed.contexts.length > 0 ? (
      <section className="seed-detail__section">
        <p className="seed-detail__section-label">Context</p>
        <ul className="seed-detail__contexts">
          {seed.contexts.map((context) => (
            <li key={context.id}>
              <strong>{context.kind}</strong>
              <p>{context.text}</p>
            </li>
          ))}
        </ul>
      </section>
    ) : null}
  </section>
);
