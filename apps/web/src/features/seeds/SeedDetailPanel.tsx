import type { JSX } from "react";

import type { SeedDetail } from "@gloss/shared/types";

type SeedDetailPanelProps = {
  seed: SeedDetail;
};

export const SeedDetailPanel = ({ seed }: SeedDetailPanelProps): JSX.Element => (
  <section className="seed-detail">
    <div className="seed-detail__hero">
      <p className="seed-detail__eyebrow">{seed.stage}</p>
      <h2>{seed.word}</h2>
      <p className="seed-detail__copy">
        This is the captured reading moment. Sprint 3 will layer enrichment on top
        of this preserved context rather than replacing it.
      </p>
    </div>

    <div className="seed-detail__grid">
      <section className="panel">
        <p className="panel__eyebrow">Primary Context</p>
        <h3>Sentence</h3>
        <p className="seed-detail__sentence">
          {seed.primarySentence ?? "No sentence was captured for this seed."}
        </p>
      </section>

      <section className="panel">
        <p className="panel__eyebrow">Source</p>
        <h3>Metadata</h3>
        <dl className="seed-detail__meta">
          <div>
            <dt>Kind</dt>
            <dd>{seed.source?.kind ?? "None"}</dd>
          </div>
          <div>
            <dt>Title</dt>
            <dd>{seed.source?.title ?? "None"}</dd>
          </div>
          <div>
            <dt>Author</dt>
            <dd>{seed.source?.author ?? "None"}</dd>
          </div>
          <div>
            <dt>URL</dt>
            <dd>{seed.source?.url ?? "None"}</dd>
          </div>
        </dl>
      </section>
    </div>

    <section className="panel">
      <p className="panel__eyebrow">Captured Contexts</p>
      <h3>Stored Evidence</h3>
      <ul className="seed-detail__contexts">
        {seed.contexts.length === 0 ? (
          <li>No contextual text was stored for this seed.</li>
        ) : (
          seed.contexts.map((context) => (
            <li key={context.id}>
              <strong>{context.kind}</strong>
              <p>{context.text}</p>
            </li>
          ))
        )}
      </ul>
    </section>

    <section className="panel panel--muted">
      <p className="panel__eyebrow">Coming Next</p>
      <h3>Constrained Enrichment</h3>
      <p className="panel__copy">
        Gloss, register, related contrast, and morphology notes arrive in Sprint 3.
      </p>
    </section>
  </section>
);
