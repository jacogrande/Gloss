import { useEffect, useState, type JSX } from "react";

import type {
  SeedStage,
  SeedSummary,
} from "@gloss/shared/types";

import { SeedCard } from "../features/seeds/SeedCard";
import { fetchSeedList } from "../lib/api-client";
import { webEnv } from "../lib/env";

type StageFilter = SeedStage | "all";

const stageOptions: StageFilter[] = [
  "all",
  "new",
  "stabilizing",
  "deepening",
  "mature",
];

export const LibraryRoute = (): JSX.Element => {
  const [items, setItems] = useState<SeedSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();

    setIsLoading(true);
    setErrorMessage(null);

    void fetchSeedList(
      webEnv.VITE_API_BASE_URL,
      {
        stage: stageFilter === "all" ? undefined : stageFilter,
      },
      abortController.signal,
    )
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load the library.",
        );
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [stageFilter]);

  return (
    <section className="library">
      <div className="panel panel--compact">
        <div className="library__header">
          <div>
            <p className="panel__eyebrow">Library</p>
            <h2>Your Word Seeds</h2>
            <p className="panel__copy">
              Browse captured words by stage. Sprint 2 keeps the library narrow and
              personal.
            </p>
          </div>

          <label className="library__filter">
            <span>Stage</span>
            <select
              onChange={(event) => {
                setStageFilter(event.target.value as StageFilter);
              }}
              value={stageFilter}
            >
              {stageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="library__summary">{total} seed(s) in view</p>
      </div>

      {isLoading ? (
        <section className="panel">
          <p className="panel__copy">Loading your library...</p>
        </section>
      ) : errorMessage ? (
        <section className="panel">
          <p className="capture-form__error">{errorMessage}</p>
        </section>
      ) : items.length === 0 ? (
        <section className="panel">
          <p className="panel__eyebrow">Empty State</p>
          <h3>No seeds yet.</h3>
          <p className="panel__copy">
            Capture a word from your reading life and it will appear here.
          </p>
        </section>
      ) : (
        <section className="library__grid">
          {items.map((seed) => (
            <SeedCard key={seed.id} seed={seed} />
          ))}
        </section>
      )}
    </section>
  );
};
