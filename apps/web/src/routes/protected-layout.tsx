import { useTransition, type JSX } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";

import { AppShell } from "../features/app-shell/AppShell";
import { authClient } from "../features/auth/auth-client";
import { signOutCurrentSession } from "../features/auth/auth-service";

export const ProtectedLayout = (): JSX.Element => {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const [isPending, startTransition] = useTransition();

  if (session.isPending) {
    return <main className="screen screen--centered">Loading session...</main>;
  }

  if (!session.data) {
    return <Navigate replace to="/login" />;
  }

  return (
    <AppShell
      onSignOut={() => {
        startTransition(() => {
          void (async () => {
            await signOutCurrentSession();
            await navigate("/login", { replace: true });
          })();
        });
      }}
      userEmail={session.data.user.email}
      userName={session.data.user.name}
    >
      {isPending ? <p className="shell__status">Signing out...</p> : null}
      <Outlet />
    </AppShell>
  );
};
