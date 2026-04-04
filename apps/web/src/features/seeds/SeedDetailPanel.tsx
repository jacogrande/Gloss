import type { UpdateSeedInput } from "@gloss/shared/types";
import type { JSX } from "react";
import { Link } from "react-router-dom";

import type { SeedDetail } from "@gloss/shared/types";

import { InkDoodle } from "../ui/InkDoodle";
import { SeedContextEditor } from "./SeedContextEditor";
import { SeedEnrichmentPanel } from "./SeedEnrichmentPanel";
import {
  formatAnnotationDate,
  formatSourceEvidence,
  getSeedCompareItems,
  getSeedActionState,
  getSeedStageBadge,
  type SeedCaptureNotice,
  getAdditionalContexts,
  type SeedRecoveryState,
} from "./seed-presenters";

type SeedDetailPanelProps = {
  captureNotice: SeedCaptureNotice | null;
  contextUpdateErrorMessage: string | null;
  contextUpdateMessage: string | null;
  enrichmentErrorMessage: string | null;
  isEnriching: boolean;
  isRefreshingEnrichmentStatus: boolean;
  loadNotice: SeedCaptureNotice | null;
  showPendingRefreshFallback: boolean;
  isUpdatingContext: boolean;
  onRefreshEnrichmentStatus: () => void;
  onSaveContext: (value: UpdateSeedInput) => void;
  onRetryEnrichment: () => void;
  recoveryState: SeedRecoveryState | null;
  seed: SeedDetail;
};

export const SeedDetailPanel = ({
  captureNotice,
  contextUpdateErrorMessage,
  contextUpdateMessage,
  enrichmentErrorMessage,
  isEnriching,
  isRefreshingEnrichmentStatus,
  loadNotice,
  showPendingRefreshFallback,
  isUpdatingContext,
  onRefreshEnrichmentStatus,
  onSaveContext,
  onRetryEnrichment,
  recoveryState,
  seed,
}: SeedDetailPanelProps): JSX.Element => {
  const payload =
    seed.enrichment?.status === "ready" ? seed.enrichment.payload : null;
  const additionalContexts = getAdditionalContexts(seed);
  const actionState = getSeedActionState({ seed });
  const compareItems = getSeedCompareItems(payload);
  const sourceEvidence = formatSourceEvidence(seed.source);
  const stageBadge = getSeedStageBadge(seed.stage);

  return (
    <section className="page page--detail seed-detail">
      <div className="seed-detail__topline">
        <Link className="seed-detail__back" to="/library">
          Back to library
        </Link>
      </div>

      <header className="seed-detail__hero">
        <div className="section-heading">
          <InkDoodle className="section-heading__mark" variant="underline" />
          <p className="panel__eyebrow">Word</p>
        </div>
        <div className="seed-detail__title-row">
          <h1>{seed.word}</h1>
          {stageBadge ? (
            <p className="seed-detail__status-badge" data-stage={seed.stage}>
              {stageBadge}
            </p>
          ) : null}
        </div>
      </header>

      {seed.primarySentence || seed.source ? (
        <section className="seed-detail__evidence">
          <h2 className="seed-detail__evidence-title">From your reading</h2>
          {seed.primarySentence ? (
            <p className="seed-detail__sentence">{seed.primarySentence}</p>
          ) : null}
          {sourceEvidence ? (
            <p className="seed-detail__source-evidence">{sourceEvidence}</p>
          ) : null}
        </section>
      ) : null}

      {captureNotice ? (
        <section className="panel panel--compact seed-detail__notice">
          <p className="panel__eyebrow">{captureNotice.title}</p>
          <p className="panel__copy">{captureNotice.message}</p>
        </section>
      ) : null}

      {loadNotice ? (
        <section
          className="panel panel--compact seed-detail__notice"
          role="alert"
        >
          <p className="panel__eyebrow">{loadNotice.title}</p>
          <p className="panel__copy">{loadNotice.message}</p>
        </section>
      ) : null}

      <section className="surface surface--primary seed-detail__definition-panel">
        <SeedEnrichmentPanel
          enrichment={seed.enrichment}
          errorMessage={enrichmentErrorMessage}
          isEnriching={isEnriching}
          isRefreshing={isRefreshingEnrichmentStatus}
          onRefresh={onRefreshEnrichmentStatus}
          onRetry={onRetryEnrichment}
          primarySentence={seed.primarySentence}
          showManualRefresh={showPendingRefreshFallback}
          word={seed.word}
        />
      </section>

      {recoveryState ? (
        <SeedContextEditor
          errorMessage={contextUpdateErrorMessage}
          helperMessage={recoveryState.message}
          isPending={isUpdatingContext}
          onSubmit={onSaveContext}
          submitLabel={recoveryState.actionLabel}
          sentenceLabel={recoveryState.sentenceLabel}
          sentencePlaceholder={recoveryState.sentencePlaceholder}
          seed={seed}
          statusMessage={contextUpdateMessage}
          title={recoveryState.title}
        />
      ) : null}

      {compareItems.length > 0 ? (
        <section className="seed-detail__compare-panel">
          <h2 className="seed-detail__panel-title">Compare</h2>
          <dl className="seed-detail__compare-list">
            {compareItems.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>
                  {item.word ? (
                    <span className="seed-detail__compare-word">{item.word}</span>
                  ) : null}
                  <span className="seed-detail__compare-note">{item.note}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {actionState ? (
        <section className="action-row seed-detail__actions">
          <Link
            className="button button--primary seed-detail__action-primary"
            to={actionState.primary.href}
          >
            {actionState.primary.label}
          </Link>
          {actionState.secondary ? (
            <Link
              className="button button--secondary seed-detail__action-secondary"
              to={actionState.secondary.href}
            >
              {actionState.secondary.label}
            </Link>
          ) : null}
        </section>
      ) : null}

      <div className="seed-detail__details-group">
        {payload?.morphologyNote ? (
          <details className="seed-detail__details">
            <summary>Roots</summary>
            <p className="seed-detail__copy">{payload.morphologyNote.note}</p>
          </details>
        ) : null}

        {seed.primarySentence || seed.source ? (
          <details className="seed-detail__details">
            <summary>Source details</summary>
            <dl className="seed-detail__meta">
              {seed.source?.url ? (
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
              {seed.updatedAt !== seed.createdAt ? (
                <div>
                  <dt>Updated</dt>
                  <dd>{formatAnnotationDate(seed.updatedAt)}</dd>
                </div>
              ) : null}
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
