import {
  useEffect,
  useState,
  type JSX,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import type {
  SeedStage,
  SeedSummary,
} from "@gloss/shared/types";

import {
  formatStageFilterLabel,
  getLibraryEmptyState,
} from "../features/seeds/library-presenters";
import { isUnauthorizedAuthError } from "../features/auth/auth-service";
import {
  getCurrentAppPath,
  getLoginPath,
} from "../features/auth/post-auth";
import { useSessionState } from "../features/auth/session-provider";
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
  const navigate = useNavigate();
  const location = useLocation();
  const sessionState = useSessionState();
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [allStageTotal, setAllStageTotal] = useState<number>(0);
  const {
    data,
    error,
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

  useEffect(() => {
    if (stageFilter === "all" && data) {
      setAllStageTotal(data.total);
    }
  }, [data, stageFilter]);

  useEffect(() => {
    if (!isUnauthorizedAuthError(error)) {
      return;
    }

    sessionState.setSession(null);
    void navigate(
      getLoginPath({
        returnTo: getCurrentAppPath(location),
      }),
      { replace: true },
    );
  }, [error, location, navigate, sessionState]);

  const emptyState = getLibraryEmptyState({
    hasAnyWords: stageFilter === "all" ? total > 0 : allStageTotal > 0,
    stage: stageFilter,
  });

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
                    {formatStageFilterLabel(option)}
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
          <h3>{emptyState.title}</h3>
          <p className="panel__copy">{emptyState.message}</p>
          <div className="panel__actions">
            {emptyState.primaryAction.kind === "link" ? (
              <Link className="capture-form__submit" to={emptyState.primaryAction.href}>
                {emptyState.primaryAction.label}
              </Link>
            ) : (
              <button
                className="capture-form__submit"
                onClick={() => {
                  setStageFilter("all");
                }}
                type="button"
              >
                {emptyState.primaryAction.label}
              </button>
            )}

            {emptyState.secondaryAction?.kind === "link" ? (
              <Link
                className="capture-form__secondary-link"
                to={emptyState.secondaryAction.href}
              >
                {emptyState.secondaryAction.label}
              </Link>
            ) : emptyState.secondaryAction?.kind === "reset-filter" ? (
              <button
                className="capture-form__secondary-link"
                onClick={() => {
                  setStageFilter("all");
                }}
                type="button"
              >
                {emptyState.secondaryAction.label}
              </button>
            ) : null}
          </div>
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
