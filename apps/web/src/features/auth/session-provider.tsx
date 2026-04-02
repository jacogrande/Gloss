import {
  createContext,
  useContext,
  useEffect,
  useState,
  type JSX,
  type PropsWithChildren,
} from "react";

import type { SessionData } from "@gloss/shared/types";

import { isUnauthorizedAuthError } from "./auth-service";
import { fetchSessionSnapshot } from "../../lib/api-client";
import { webEnv } from "../../lib/env";

type SessionStatus = "loading" | "authenticated" | "anonymous";
type SessionConnectionStatus = "online" | "reconnecting" | "unavailable";

const unavailableSessionMessage =
  "Gloss can’t reach the server right now. Try again in a moment.";
const reconnectingSessionMessage =
  "Gloss is reconnecting. Showing your last saved session for now.";

type SessionContextValue = {
  connectionMessage: string | null;
  connectionStatus: SessionConnectionStatus;
  refreshSession: () => Promise<SessionData | null>;
  session: SessionData | null;
  setSession: (value: SessionData | null) => void;
  status: SessionStatus;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const sessionStorageKey = "gloss.session";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isSessionData = (value: unknown): value is SessionData => {
  if (!isRecord(value) || !isRecord(value.user) || !isRecord(value.session)) {
    return false;
  }

  return (
    typeof value.user.email === "string" &&
    typeof value.user.id === "string" &&
    typeof value.user.name === "string" &&
    typeof value.session.id === "string" &&
    typeof value.session.userId === "string" &&
    typeof value.session.expiresAt === "string" &&
    ("profile" in value
      ? value.profile === null ||
        (isRecord(value.profile) &&
          typeof value.profile.userId === "string" &&
          typeof value.profile.createdAt === "string" &&
          typeof value.profile.updatedAt === "string")
      : false)
  );
};

const readStoredSession = (): SessionData | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(sessionStorageKey);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    return isSessionData(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
};

const writeStoredSession = (value: SessionData | null): void => {
  if (typeof window === "undefined") {
    return;
  }

  if (value === null) {
    window.sessionStorage.removeItem(sessionStorageKey);
    return;
  }

  window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(value));
};

export const SessionProvider = ({
  children,
}: PropsWithChildren): JSX.Element => {
  const [session, setSessionState] = useState<SessionData | null>(() =>
    readStoredSession(),
  );
  const [status, setStatus] = useState<SessionStatus>(() =>
    readStoredSession() ? "authenticated" : "loading",
  );
  const [connectionStatus, setConnectionStatus] =
    useState<SessionConnectionStatus>("online");
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);

  const commitSession = (value: SessionData | null): void => {
    setSessionState(value);
    setStatus(value ? "authenticated" : "anonymous");
    writeStoredSession(value);
  };

  const clearConnectionIssue = (): void => {
    setConnectionStatus("online");
    setConnectionMessage(null);
  };

  const setSession = (value: SessionData | null): void => {
    commitSession(value);
    clearConnectionIssue();
  };

  const refreshSession = async (): Promise<SessionData | null> => {
    try {
      const nextSession = await fetchSessionSnapshot(webEnv.VITE_API_BASE_URL);

      commitSession(nextSession);
      clearConnectionIssue();

      return nextSession;
    } catch (error) {
      if (isUnauthorizedAuthError(error)) {
        commitSession(null);
        clearConnectionIssue();
        return null;
      }

      const storedSession = readStoredSession();

      if (storedSession) {
        commitSession(storedSession);
        setConnectionStatus("reconnecting");
        setConnectionMessage(reconnectingSessionMessage);
        return storedSession;
      }

      commitSession(null);
      setConnectionStatus("unavailable");
      setConnectionMessage(unavailableSessionMessage);
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

        commitSession(nextSession);
        clearConnectionIssue();
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (isUnauthorizedAuthError(error)) {
          commitSession(null);
          clearConnectionIssue();
          return;
        }

        const storedSession = readStoredSession();

        if (storedSession) {
          commitSession(storedSession);
          setConnectionStatus("reconnecting");
          setConnectionMessage(reconnectingSessionMessage);
          return;
        }

        commitSession(null);
        setConnectionStatus("unavailable");
        setConnectionMessage(unavailableSessionMessage);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <SessionContext.Provider
      value={{
        connectionMessage,
        connectionStatus,
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
