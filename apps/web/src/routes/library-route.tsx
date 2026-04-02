import {
  useEffect,
  useMemo,
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
  const [allStageTotal, setAllStageTotal] = useState<number | null>(null);
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const {
    data,
    error,
    errorMessage,
    isLoading,
    isRefreshing,
    reload,
  } = useAsyncResource<{
    items: SeedSummary[];
    requestedStage: StageFilter;
    total: number;
  }>({
    dependencies: [stageFilter],
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : "Unable to load the library.",
    load: async (signal) => {
      if (stageFilter === "all") {
        const response = await fetchSeedList(
          webEnv.VITE_API_BASE_URL,
          {},
          signal,
        );

        return {
          items: response.items,
          requestedStage: stageFilter,
          total: response.total,
        };
      }

      const filteredResponse = await fetchSeedList(
        webEnv.VITE_API_BASE_URL,
        {
          stage: stageFilter,
        },
        signal,
      );

      return {
        items: filteredResponse.items,
        requestedStage: stageFilter,
        total: filteredResponse.total,
      };
    },
    preserveDataOnError: "reload-only",
  });
  const isCurrentStageSnapshot = data?.requestedStage === stageFilter;
  const items = isCurrentStageSnapshot ? (data?.items ?? []) : [];
  const total = isCurrentStageSnapshot ? (data?.total ?? 0) : 0;

  useEffect(() => {
    if (stageFilter !== "all" || !data) {
      return;
    }

    setAllStageTotal(data.total);
  }, [data, stageFilter]);

  const hasAnyWords = useMemo(() => {
    if (stageFilter === "all") {
      return total > 0;
    }

    return (allStageTotal ?? 0) > 0;
  }, [allStageTotal, stageFilter, total]);

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
    hasAnyWords,
    stage: stageFilter,
  });
  const showLibraryControls = stageFilter !== "all" || hasAnyWords;

  return (
    <section className="page page--list library">
      <div className="surface surface--primary panel panel--compact">
        <div className="library__header">
          <div>
            <h2>Your words</h2>
          </div>

          {showLibraryControls ? (
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
              {showLibraryControls ? (
                <button
                  className="button button--ghost"
                  onClick={() => {
                    reload();
                  }}
                  type="button"
                >
                  Refresh
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {isLoading && items.length === 0 ? (
        <section className="surface surface--primary panel">
          <p className="panel__copy">Loading your library...</p>
        </section>
      ) : null}

      {isRefreshing && items.length > 0 ? (
        <section className="surface surface--notice panel panel--compact" aria-live="polite">
          <p className="panel__copy">Refreshing your library...</p>
        </section>
      ) : null}

      {errorMessage && items.length === 0 ? (
        <section className="surface surface--primary panel">
          <p className="capture-form__error" role="alert">
            {errorMessage}
          </p>
          <div className="action-row panel__actions">
            <button
              className="button button--primary"
              onClick={() => {
                reload();
              }}
              type="button"
            >
              Try again
            </button>
          </div>
        </section>
      ) : null}

      {errorMessage && items.length > 0 ? (
        <section className="surface surface--notice panel panel--compact" role="alert">
          <p className="panel__eyebrow">Couldn’t refresh</p>
          <p className="panel__copy">
            {errorMessage} Showing the last loaded library for now.
          </p>
          <div className="action-row panel__actions">
            <button
              className="button button--ghost"
              onClick={() => {
                reload();
              }}
              type="button"
            >
              Try again
            </button>
          </div>
        </section>
      ) : null}

      {items.length === 0 && !errorMessage && !isLoading ? (
        <section className="surface surface--primary panel">
          <h3>{emptyState.title}</h3>
          <p className="panel__copy">{emptyState.message}</p>
          <div className="action-row panel__actions">
            {emptyState.primaryAction.kind === "link" ? (
              <Link
                className="button button--primary"
                to={emptyState.primaryAction.href}
              >
                {emptyState.primaryAction.label}
              </Link>
            ) : (
              <button
                className="button button--primary"
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
                className="button button--ghost"
                to={emptyState.secondaryAction.href}
              >
                {emptyState.secondaryAction.label}
              </Link>
            ) : emptyState.secondaryAction?.kind === "reset-filter" ? (
              <button
                className="button button--ghost"
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
      ) : null}

      {items.length > 0 ? (
        <section className="library__grid">
          {items.map((seed) => (
            <SeedCard key={seed.id} seed={seed} />
          ))}
        </section>
      ) : null}
    </section>
  );
};
