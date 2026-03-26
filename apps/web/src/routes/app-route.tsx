import { useEffect, useState, useTransition, type JSX } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import type { SessionData } from "@gloss/shared/types";

import { fetchSessionSnapshot } from "../lib/api-client";
import { webEnv } from "../lib/env";
import { SessionPanel } from "../features/app-shell/SessionPanel";
import { authClient } from "../features/auth/auth-client";
import { signOutCurrentSession } from "../features/auth/auth-service";

export const AppRoute = (): JSX.Element => {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const [snapshot, setSnapshot] = useState<SessionData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!session.data) {
      return;
    }

    let isActive = true;

    void fetchSessionSnapshot(webEnv.VITE_API_BASE_URL)
      .then((data) => {
        if (isActive) {
          setSnapshot(data);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadError(error instanceof Error ? error.message : "Unable to load /api/me.");
        }
      });

    return () => {
      isActive = false;
    };
  }, [session.data]);

  if (session.isPending) {
    return <main className="screen screen--centered">Loading session...</main>;
  }

  if (!session.data) {
    return <Navigate replace to="/login" />;
  }

  return (
    <main className="screen screen--app">
      <section className="hero-panel">
        <p className="hero-panel__eyebrow">Sprint 1</p>
        <h1>Gloss foundation is alive.</h1>
        <p className="hero-panel__copy">
          Better Auth owns the session, Hono owns the API, and the authenticated
          shell is reading a real profile from the backend.
        </p>
      </section>

      {snapshot ? (
        <SessionPanel
          onSignOut={() => {
            startTransition(() => {
              void (async () => {
                await signOutCurrentSession();
                await navigate("/login", { replace: true });
              })();
            });
          }}
          profile={snapshot}
          status={isPending ? "loading" : "ready"}
        />
      ) : (
        <section className="session-panel">
          <p className="session-panel__eyebrow">API bootstrap</p>
          <h1>{loadError ?? "Loading /api/me..."}</h1>
        </section>
      )}
    </main>
  );
};
