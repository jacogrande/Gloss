import type { JSX } from "react";
import { Link } from "react-router-dom";

import type { SeedSummary } from "@gloss/shared/types";

import {
  formatAnnotationDate,
  formatSeedStageLabel,
  formatSourceKindLabel,
} from "./seed-presenters";

type SeedCardProps = {
  seed: SeedSummary;
};

export const SeedCard = ({ seed }: SeedCardProps): JSX.Element => (
  <article className="seed-card">
    <div className="seed-card__header">
      <div className="seed-card__annotations">
        <p className="seed-card__stage" data-stage={seed.stage}>
          {formatSeedStageLabel(seed.stage)}
        </p>
        <p className="seed-card__date">{formatAnnotationDate(seed.createdAt)}</p>
      </div>
      <h3>
        <Link to={`/seeds/${seed.id}`}>{seed.word}</Link>
      </h3>
    </div>

    {seed.primarySentence ? <p className="seed-card__sentence">{seed.primarySentence}</p> : null}

    {seed.source ? (
      <dl className="seed-card__meta">
        {seed.source.title ? (
          <div>
            <dt>Source</dt>
            <dd>{seed.source.title}</dd>
          </div>
        ) : null}
        <div>
          <dt>Type</dt>
          <dd>{formatSourceKindLabel(seed.source.kind)}</dd>
        </div>
      </dl>
    ) : null}
  </article>
);
