import { useState, useTransition, type JSX } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { AuthForm } from "../features/auth/AuthForm";
import { SessionUnavailablePanel } from "../features/auth/SessionConnectionState";
import {
  getAuthErrorMessage,
  signInWithPassword,
  signUpWithPassword,
} from "../features/auth/auth-service";
import {
  resolvePostAuthPath,
  markCaptureOnboardingPending,
} from "../features/auth/post-auth";
import { useSessionState } from "../features/auth/session-provider";

type AuthMode = "sign-in" | "sign-up";

export const LoginRoute = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSessionState();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRetryingConnection, setIsRetryingConnection] = useState(false);
  const [isPending, startTransition] = useTransition();
  const resolvedPostAuthPath = resolvePostAuthPath({
    preferOnboarding: true,
    search: location.search,
  });

  if (session.status === "loading") {
    return <main className="screen screen--centered">Checking your session...</main>;
  }

  if (session.session) {
    return <Navigate replace to={resolvedPostAuthPath} />;
  }

  if (session.connectionStatus === "unavailable") {
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

  return (
    <main className="screen screen--auth">
      <AuthForm
        errorMessage={errorMessage}
        isPending={isPending}
        mode={mode}
        onModeChange={(nextMode) => {
          setErrorMessage(null);
          setMode(nextMode);
        }}
        onSubmit={(fields) => {
          setErrorMessage(null);

          startTransition(() => {
            void (async () => {
              try {
                let nextPath = resolvePostAuthPath({
                  search: location.search,
                });

                if (mode === "sign-in") {
                  await signInWithPassword(fields);
                } else {
                  await signUpWithPassword(fields);
                  markCaptureOnboardingPending();
                  nextPath = resolvePostAuthPath({
                    preferOnboarding: true,
                    search: location.search,
                  });
                }

                await session.refreshSession();
                await navigate(nextPath, {
                  replace: true,
                });
              } catch (error) {
                setErrorMessage(getAuthErrorMessage(error));
              }
            })();
          });
        }}
      />
    </main>
  );
};
