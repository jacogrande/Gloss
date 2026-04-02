import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type JSX,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import type {
  SeedDetail,
  UpdateSeedInput,
} from "@gloss/shared/types";

import { SeedDetailPanel } from "../features/seeds/SeedDetailPanel";
import { isUnauthorizedAuthError } from "../features/auth/auth-service";
import {
  getCurrentAppPath,
  getLoginPath,
} from "../features/auth/post-auth";
import { mergeSeedDetailState } from "../features/seeds/seed-detail-state";
import { useSessionState } from "../features/auth/session-provider";
import {
  getSeedCaptureNotice,
  getSeedLoadNotice,
  getSeedRecoveryState,
} from "../features/seeds/seed-presenters";
import {
  fetchSeedDetail,
  requestSeedEnrichment,
  updateSeed,
} from "../lib/api-client";
import { webEnv } from "../lib/env";
import { useAsyncResource } from "../lib/use-async-resource";

export const SeedDetailRoute = (): JSX.Element => {
  const navigate = useNavigate();
  const { seedId } = useParams<{ seedId: string }>();
  const location = useLocation();
  const sessionState = useSessionState();
  const initialSeed =
    (location.state as
      | {
          initialSeed?: SeedDetail;
          showSavedNotice?: boolean;
        }
      | null
      | undefined)?.initialSeed ?? null;
  const [seed, setSeed] = useState<SeedDetail | null>(initialSeed);
  const [contextUpdateErrorMessage, setContextUpdateErrorMessage] = useState<string | null>(
    null,
  );
  const [contextUpdateMessage, setContextUpdateMessage] = useState<string | null>(null);
  const [enrichmentErrorMessage, setEnrichmentErrorMessage] = useState<string | null>(
    null,
  );
  const [isEnriching, setIsEnriching] = useState(false);
  const [isRefreshingEnrichmentStatus, setIsRefreshingEnrichmentStatus] = useState(false);
  const [pendingRefreshCycle, setPendingRefreshCycle] = useState(0);
  const [showPendingRefreshFallback, setShowPendingRefreshFallback] = useState(false);
  const [isUpdatingContext, setIsUpdatingContext] = useState(false);
  const [showSavedNotice, setShowSavedNotice] = useState<boolean>(
    Boolean(
      (location.state as
        | {
            initialSeed?: SeedDetail;
            showSavedNotice?: boolean;
          }
        | null
        | undefined)?.showSavedNotice,
    ),
  );
  const autoRequestedSeedId = useRef<string | null>(null);

  const {
    data: loadedSeed,
    error,
    errorMessage,
    isLoading,
  } = useAsyncResource<SeedDetail>({
    dependencies: [seedId],
    enabled: Boolean(seedId),
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : "Unable to load this seed.",
    load: (signal) =>
      fetchSeedDetail(webEnv.VITE_API_BASE_URL, seedId ?? "", signal),
  });

  const redirectToLogin = useEffectEvent(async (): Promise<void> => {
    sessionState.setSession(null);
    await navigate(
      getLoginPath({
        returnTo: getCurrentAppPath(location),
      }),
      { replace: true },
    );
  });

  const refreshSeedDetail = useEffectEvent(async (): Promise<SeedDetail | null> => {
    if (!seedId) {
      return null;
    }

    setIsRefreshingEnrichmentStatus(true);

    try {
      const loadedSeed = await fetchSeedDetail(webEnv.VITE_API_BASE_URL, seedId);
      let nextSeed = loadedSeed;

      setSeed((currentSeed) => {
        nextSeed = currentSeed
          ? mergeSeedDetailState(currentSeed, loadedSeed)
          : loadedSeed;
        return nextSeed;
      });

      if (nextSeed.enrichment?.status !== "failed") {
        setEnrichmentErrorMessage(null);
      }

      return nextSeed;
    } catch (error) {
      if (isUnauthorizedAuthError(error)) {
        await redirectToLogin();
        return null;
      }

      setEnrichmentErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to refresh this seed right now.",
      );

      return null;
    } finally {
      setIsRefreshingEnrichmentStatus(false);
    }
  });

  useEffect(() => {
    if (!loadedSeed) {
      return;
    }

    let nextSeed = loadedSeed;
    setSeed((currentSeed) => {
      nextSeed = currentSeed
        ? mergeSeedDetailState(currentSeed, loadedSeed)
        : loadedSeed;
      return nextSeed;
    });
    setContextUpdateErrorMessage(null);
    setContextUpdateMessage(null);
    setEnrichmentErrorMessage(null);
    setIsEnriching(false);
    setIsRefreshingEnrichmentStatus(false);
    setPendingRefreshCycle(0);
    setShowPendingRefreshFallback(false);
    autoRequestedSeedId.current =
      nextSeed.enrichment?.status === "pending" ? nextSeed.id : null;
  }, [loadedSeed]);

  useEffect(() => {
    if (!isUnauthorizedAuthError(error)) {
      return;
    }

    void redirectToLogin();
  }, [error, redirectToLogin]);

  useEffect(() => {
    if (
      seed?.enrichment?.status === "ready" ||
      seed?.enrichment?.status === "failed"
    ) {
      setShowSavedNotice(false);
    }
  }, [seed?.enrichment?.status]);

  const runEnrichment = async (options?: {
    force?: boolean;
  }): Promise<SeedDetail["enrichment"] | null> => {
    if (!seedId) {
      return null;
    }

    setIsEnriching(true);
    setEnrichmentErrorMessage(null);
    setPendingRefreshCycle(0);
    setShowPendingRefreshFallback(false);

    try {
      const enrichment = await requestSeedEnrichment(
        webEnv.VITE_API_BASE_URL,
        seedId,
        options,
      );

      setSeed((currentSeed) =>
        currentSeed
          ? {
              ...currentSeed,
              enrichment,
            }
          : currentSeed,
      );
      return enrichment;
    } catch (error) {
      if (isUnauthorizedAuthError(error)) {
        await redirectToLogin();
        return null;
      }

      setEnrichmentErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to enrich this seed right now.",
      );
      setShowSavedNotice(false);
      return null;
    } finally {
      setIsEnriching(false);
    }
  };

  const saveContext = async (value: UpdateSeedInput): Promise<void> => {
    if (!seedId) {
      return;
    }

    setIsUpdatingContext(true);
    setContextUpdateErrorMessage(null);
    setContextUpdateMessage(null);

    try {
      const updatedSeed = await updateSeed(webEnv.VITE_API_BASE_URL, seedId, value);

      setSeed(updatedSeed);
      setContextUpdateMessage("Context saved.");
      setShowSavedNotice(false);

      const shouldForceEnrichment =
        seed?.enrichment?.status === "pending" ||
        seed?.enrichment?.status === "ready";
      const shouldRefreshEnrichment =
        shouldForceEnrichment ||
        updatedSeed.enrichment?.status === "failed" ||
        updatedSeed.enrichment === null;

      if (shouldRefreshEnrichment) {
        autoRequestedSeedId.current = updatedSeed.id;
        const refreshedEnrichment = await runEnrichment({
          force: shouldForceEnrichment,
        });

        setContextUpdateMessage(
          refreshedEnrichment?.status === "pending"
            ? "Context saved. Gloss is trying again now."
            : "Context saved.",
        );
      }
    } catch (error) {
      if (isUnauthorizedAuthError(error)) {
        await redirectToLogin();
        return;
      }

      setContextUpdateErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save context right now.",
      );
    } finally {
      setIsUpdatingContext(false);
    }
  };

  useEffect(() => {
    if (!seed || !seedId) {
      return;
    }

    if (seed.enrichment?.status === "ready" || seed.enrichment?.status === "failed") {
      return;
    }

    if (autoRequestedSeedId.current === seed.id) {
      return;
    }

    autoRequestedSeedId.current = seed.id;
    void runEnrichment();
  }, [seed, seedId]);

  useEffect(() => {
    if (seed?.enrichment?.status !== "pending" || isEnriching) {
      return;
    }

    let isCancelled = false;

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const nextSeed = await refreshSeedDetail();

        if (!isCancelled && nextSeed?.enrichment?.status === "pending") {
          setPendingRefreshCycle((current) => current + 1);
        }
      })();
    }, 1_500);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isEnriching, pendingRefreshCycle, seed?.enrichment?.status, seed?.id]);

  useEffect(() => {
    if (seed?.enrichment?.status !== "pending" || isEnriching) {
      setShowPendingRefreshFallback(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowPendingRefreshFallback(true);
    }, 6_000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isEnriching, seed?.enrichment?.status, seed?.id]);

  if (isLoading && !seed) {
    return (
      <section className="panel">
        <p className="panel__copy">Loading this word...</p>
      </section>
    );
  }

  if (!seedId || (!seed && errorMessage) || !seed) {
    return (
      <section className="panel">
        <h2>{errorMessage ?? (!seedId ? "Missing seed id." : "Seed unavailable.")}</h2>
        <p className="panel__copy">
          Return to the <Link to="/library">library</Link> and choose another seed.
        </p>
      </section>
    );
  }

  const captureNotice = getSeedCaptureNotice({
    savedFromCapture: showSavedNotice,
    seed,
  });
  const loadNotice = getSeedLoadNotice(errorMessage);
  const recoveryState = getSeedRecoveryState({
    seed,
  });

  return (
    <SeedDetailPanel
      captureNotice={captureNotice}
      contextUpdateErrorMessage={contextUpdateErrorMessage}
      contextUpdateMessage={contextUpdateMessage}
      enrichmentErrorMessage={enrichmentErrorMessage}
      isEnriching={isEnriching}
      isRefreshingEnrichmentStatus={isRefreshingEnrichmentStatus}
      loadNotice={loadNotice}
      showPendingRefreshFallback={showPendingRefreshFallback}
      isUpdatingContext={isUpdatingContext}
      onRefreshEnrichmentStatus={() => {
        void refreshSeedDetail();
      }}
      onSaveContext={(value) => {
        void saveContext(value);
      }}
      onRetryEnrichment={() => {
        autoRequestedSeedId.current = seed.id;
        void runEnrichment();
      }}
      recoveryState={recoveryState}
      seed={seed}
    />
  );
};
