import {
  createContext,
  useContext,
  useEffect,
  useState,
  type JSX,
  type PropsWithChildren,
} from "react";

import type { SessionData } from "@gloss/shared/types";

import { fetchSessionSnapshot } from "../../lib/api-client";
import { ApiClientError } from "../../lib/http";
import { webEnv } from "../../lib/env";

type SessionStatus = "loading" | "authenticated" | "anonymous";

type SessionContextValue = {
  refreshSession: () => Promise<SessionData | null>;
  session: SessionData | null;
  setSession: (value: SessionData | null) => void;
  status: SessionStatus;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const isUnauthorized = (value: unknown): boolean =>
  value instanceof ApiClientError && value.code === "AUTH_UNAUTHORIZED";

export const SessionProvider = ({
  children,
}: PropsWithChildren): JSX.Element => {
  const [session, setSessionState] = useState<SessionData | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  const setSession = (value: SessionData | null): void => {
    setSessionState(value);
    setStatus(value ? "authenticated" : "anonymous");
  };

  const refreshSession = async (): Promise<SessionData | null> => {
    try {
      const nextSession = await fetchSessionSnapshot(webEnv.VITE_API_BASE_URL);

      setSession(nextSession);

      return nextSession;
    } catch (error) {
      if (isUnauthorized(error)) {
        setSession(null);
        return null;
      }

      setSession(null);
      throw error;
    }
  };

  useEffect(() => {
    let isCancelled = false;

    void (async () => {
      try {
        const nextSession = await fetchSessionSnapshot(webEnv.VITE_API_BASE_URL);

        if (isCancelled) {
          return;
        }

        setSession(nextSession);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (isUnauthorized(error)) {
          setSession(null);
          return;
        }

        setSession(null);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <SessionContext.Provider
      value={{
        refreshSession,
        session,
        setSession,
        status,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionState = (): SessionContextValue => {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("SessionProvider is required before using session state.");
  }

  return context;
};
