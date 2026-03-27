import {
  useEffect,
  useRef,
  useState,
  type JSX,
} from "react";
import { Link, useParams } from "react-router-dom";

import type { SeedDetail } from "@gloss/shared/types";

import { SeedDetailPanel } from "../features/seeds/SeedDetailPanel";
import {
  fetchSeedDetail,
  requestSeedEnrichment,
} from "../lib/api-client";
import { webEnv } from "../lib/env";
import { useAsyncResource } from "../lib/use-async-resource";

export const SeedDetailRoute = (): JSX.Element => {
  const { seedId } = useParams<{ seedId: string }>();
  const [seed, setSeed] = useState<SeedDetail | null>(null);
  const [enrichmentErrorMessage, setEnrichmentErrorMessage] = useState<string | null>(
    null,
  );
  const [isEnriching, setIsEnriching] = useState(false);
  const autoRequestedSeedId = useRef<string | null>(null);

  const {
    data: loadedSeed,
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

  useEffect(() => {
    setSeed(loadedSeed ?? null);
    setEnrichmentErrorMessage(null);
    setIsEnriching(false);
    autoRequestedSeedId.current = null;
  }, [loadedSeed]);

  const runEnrichment = async (): Promise<void> => {
    if (!seedId) {
      return;
    }

    setIsEnriching(true);
    setEnrichmentErrorMessage(null);

    try {
      const enrichment = await requestSeedEnrichment(
        webEnv.VITE_API_BASE_URL,
        seedId,
      );

      setSeed((currentSeed) =>
        currentSeed
          ? {
              ...currentSeed,
              enrichment,
            }
          : currentSeed,
      );
    } catch (error) {
      setEnrichmentErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to enrich this seed right now.",
      );
    } finally {
      setIsEnriching(false);
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

  if (isLoading) {
    return (
      <section className="panel">
        <p className="panel__copy">Loading this seed...</p>
      </section>
    );
  }

  if (!seedId || errorMessage || !seed) {
    return (
      <section className="panel">
        <p className="panel__eyebrow">Seed Detail</p>
        <h2>{errorMessage ?? (!seedId ? "Missing seed id." : "Seed unavailable.")}</h2>
        <p className="panel__copy">
          Return to the <Link to="/library">library</Link> and choose another seed.
        </p>
      </section>
    );
  }

  return (
    <SeedDetailPanel
      enrichmentErrorMessage={enrichmentErrorMessage}
      isEnriching={isEnriching}
      onRetryEnrichment={() => {
        autoRequestedSeedId.current = seed.id;
        void runEnrichment();
      }}
      seed={seed}
    />
  );
};
