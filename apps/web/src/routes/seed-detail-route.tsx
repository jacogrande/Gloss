import { useEffect, useState, type JSX } from "react";
import { Link, useParams } from "react-router-dom";

import type { SeedDetail } from "@gloss/shared/types";

import { SeedDetailPanel } from "../features/seeds/SeedDetailPanel";
import { fetchSeedDetail } from "../lib/api-client";
import { webEnv } from "../lib/env";

export const SeedDetailRoute = (): JSX.Element => {
  const { seedId } = useParams<{ seedId: string }>();
  const [seed, setSeed] = useState<SeedDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!seedId) {
      setErrorMessage("Missing seed id.");
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();

    setIsLoading(true);
    setErrorMessage(null);

    void fetchSeedDetail(webEnv.VITE_API_BASE_URL, seedId, abortController.signal)
      .then((data) => {
        setSeed(data);
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load this seed.",
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
  }, [seedId]);

  if (isLoading) {
    return (
      <section className="panel">
        <p className="panel__copy">Loading this seed...</p>
      </section>
    );
  }

  if (errorMessage || !seed) {
    return (
      <section className="panel">
        <p className="panel__eyebrow">Seed Detail</p>
        <h2>{errorMessage ?? "Seed unavailable."}</h2>
        <p className="panel__copy">
          Return to the <Link to="/library">library</Link> and choose another seed.
        </p>
      </section>
    );
  }

  return <SeedDetailPanel seed={seed} />;
};
