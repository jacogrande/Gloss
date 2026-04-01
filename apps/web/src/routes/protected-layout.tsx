import { useState, useTransition, type JSX } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { AppShell } from "../features/app-shell/AppShell";
import {
  getAuthErrorMessage,
  signOutCurrentSession,
} from "../features/auth/auth-service";
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
  const [isPending, startTransition] = useTransition();
  const loginPath = getLoginPath({
    returnTo: getCurrentAppPath(location),
  });

  if (session.status === "loading") {
    return <main className="screen screen--centered">Loading...</main>;
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
      {isPending ? <p className="shell__status">Signing out...</p> : null}
      {signOutError ? <p className="capture-form__error">{signOutError}</p> : null}
      <Outlet />
    </AppShell>
  );
};
