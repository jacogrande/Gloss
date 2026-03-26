import type { JSX } from "react";
import { Link, useParams } from "react-router-dom";

import type { SeedDetail } from "@gloss/shared/types";

import { SeedDetailPanel } from "../features/seeds/SeedDetailPanel";
import { fetchSeedDetail } from "../lib/api-client";
import { webEnv } from "../lib/env";
import { useAsyncResource } from "../lib/use-async-resource";

export const SeedDetailRoute = (): JSX.Element => {
  const { seedId } = useParams<{ seedId: string }>();

  const {
    data: seed,
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

  return <SeedDetailPanel seed={seed} />;
};
