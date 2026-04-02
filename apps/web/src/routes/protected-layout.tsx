import { useState, useTransition, type JSX } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { AppShell } from "../features/app-shell/AppShell";
import {
  getAuthErrorMessage,
  signOutCurrentSession,
} from "../features/auth/auth-service";
import {
  SessionConnectionBanner,
  SessionUnavailablePanel,
} from "../features/auth/SessionConnectionState";
import {
  getCurrentAppPath,
  getLoginPath,
} from "../features/auth/post-auth";
import { useSessionState } from "../features/auth/session-provider";

export const ProtectedLayout = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSessionState();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isRetryingConnection, setIsRetryingConnection] = useState(false);
  const [isPending, startTransition] = useTransition();
  const loginPath = getLoginPath({
    returnTo: getCurrentAppPath(location),
  });

  if (session.status === "loading") {
    return <main className="screen screen--centered">Opening Gloss...</main>;
  }

  if (!session.session && session.connectionStatus === "unavailable") {
    return (
      <SessionUnavailablePanel
        isRetrying={isRetryingConnection}
        message={
          session.connectionMessage ??
          "Gloss can’t reach the server right now. Try again in a moment."
        }
        onRetry={() => {
          setIsRetryingConnection(true);
          void session
            .refreshSession()
            .catch(() => null)
            .finally(() => {
              setIsRetryingConnection(false);
            });
        }}
      />
    );
  }

  if (!session.session) {
    return <Navigate replace to={loginPath} />;
  }

  return (
    <AppShell
      onSignOut={() => {
        setSignOutError(null);

        startTransition(() => {
          void (async () => {
            try {
              await signOutCurrentSession();
              session.setSession(null);
              await navigate("/login", { replace: true });
            } catch (error) {
              setSignOutError(getAuthErrorMessage(error));
            }
          })();
        });
      }}
      userEmail={session.session.user.email}
      userName={session.session.user.name}
    >
      {session.connectionStatus === "reconnecting" && session.connectionMessage ? (
        <SessionConnectionBanner
          isRetrying={isRetryingConnection}
          message={session.connectionMessage}
          onRetry={() => {
            setIsRetryingConnection(true);
            void session
              .refreshSession()
              .catch(() => null)
              .finally(() => {
                setIsRetryingConnection(false);
              });
          }}
        />
      ) : null}
      {isPending ? <p className="shell__status">Signing out...</p> : null}
      {signOutError ? <p className="capture-form__error">{signOutError}</p> : null}
      <Outlet />
    </AppShell>
  );
};
