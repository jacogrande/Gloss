import { useState, type JSX } from "react";

import type {
  SeedStage,
  SeedSummary,
} from "@gloss/shared/types";

import { SeedCard } from "../features/seeds/SeedCard";
import { fetchSeedList } from "../lib/api-client";
import { webEnv } from "../lib/env";
import { useAsyncResource } from "../lib/use-async-resource";

type StageFilter = SeedStage | "all";

const stageOptions: StageFilter[] = [
  "all",
  "new",
  "stabilizing",
  "deepening",
  "mature",
];

export const LibraryRoute = (): JSX.Element => {
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const {
    data,
    errorMessage,
    isLoading,
  } = useAsyncResource<{
    items: SeedSummary[];
    total: number;
  }>({
    dependencies: [stageFilter],
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : "Unable to load the library.",
    load: (signal) =>
      fetchSeedList(
        webEnv.VITE_API_BASE_URL,
        {
          stage: stageFilter === "all" ? undefined : stageFilter,
        },
        signal,
      ),
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <section className="library">
      <div className="panel panel--compact">
        <div className="library__header">
          <div>
            <h2>Your words</h2>
          </div>

          <div className="library__controls">
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

            <p className="library__summary">{total} word(s)</p>
          </div>
        </div>
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
          <h3>No words yet.</h3>
          <p className="panel__copy">Save a word to see it here.</p>
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
