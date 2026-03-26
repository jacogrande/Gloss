import { useState, useTransition, type JSX } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { AuthForm } from "../features/auth/AuthForm";
import {
  getAuthErrorMessage,
  signInWithPassword,
  signUpWithPassword,
} from "../features/auth/auth-service";
import { authClient } from "../features/auth/auth-client";

type AuthMode = "sign-in" | "sign-up";

export const LoginRoute = (): JSX.Element => {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (session.isPending) {
    return <main className="screen screen--centered">Checking session...</main>;
  }

  if (session.data) {
    return <Navigate replace to="/library" />;
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
                }

                await navigate("/library", { replace: true });
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
