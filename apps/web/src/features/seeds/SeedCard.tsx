import type { JSX } from "react";
import { Link } from "react-router-dom";

import type { SeedSummary } from "@gloss/shared/types";

type SeedCardProps = {
  seed: SeedSummary;
};

export const SeedCard = ({ seed }: SeedCardProps): JSX.Element => (
  <article className="seed-card">
    <div className="seed-card__header">
      <p className="seed-card__stage">{seed.stage}</p>
      <h3>
        <Link to={`/seeds/${seed.id}`}>{seed.word}</Link>
      </h3>
    </div>

    <p className="seed-card__sentence">
      {seed.primarySentence ?? "Saved without a sentence. Ready for later context."}
    </p>

    <dl className="seed-card__meta">
      <div>
        <dt>Source</dt>
        <dd>{seed.source?.title ?? "No source metadata"}</dd>
      </div>
      <div>
        <dt>Captured</dt>
        <dd>{new Date(seed.createdAt).toLocaleDateString()}</dd>
      </div>
    </dl>
  </article>
);
