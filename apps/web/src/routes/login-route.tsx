import { useState, useTransition, type JSX } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { AuthForm } from "../features/auth/AuthForm";
import {
  getAuthErrorMessage,
  signInWithPassword,
  signUpWithPassword,
} from "../features/auth/auth-service";
import {
  getPostAuthPath,
  markCaptureOnboardingPending,
} from "../features/auth/post-auth";
import { useSessionState } from "../features/auth/session-provider";

type AuthMode = "sign-in" | "sign-up";

export const LoginRoute = (): JSX.Element => {
  const navigate = useNavigate();
  const session = useSessionState();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (session.status === "loading") {
    return <main className="screen screen--centered">Checking session...</main>;
  }

  if (session.session) {
    return <Navigate replace to={getPostAuthPath()} />;
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
                if (mode === "sign-in") {
                  await signInWithPassword(fields);
                } else {
                  await signUpWithPassword(fields);
                  markCaptureOnboardingPending();
                }

                await session.refreshSession();
                await navigate(getPostAuthPath(), {
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
