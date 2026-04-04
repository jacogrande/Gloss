import type { JSX, PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";

import { InkDoodle } from "../ui/InkDoodle";

type AppShellProps = PropsWithChildren<{
  onSignOut: () => void;
  userEmail: string;
  userName: string;
}>;

export const AppShell = ({
  children,
  onSignOut,
  userEmail: _userEmail,
  userName: _userName,
}: AppShellProps): JSX.Element => {
  return (
    <div className="shell">
      <header className="shell__header">
        <div className="shell__brand">
          <div className="shell__brand-lockup">
            <div className="shell__brand-row">
              <InkDoodle className="shell__brand-mark" variant="spark" />
              <p className="shell__brand-name">Gloss</p>
            </div>
            <InkDoodle className="shell__brand-underline" variant="underline" />
          </div>
        </div>

        <div className="shell__rail">
          <nav className="shell__nav" aria-label="Primary">
            <NavLink
              className={({ isActive }) =>
                isActive
                  ? "shell__nav-link shell__nav-link--active"
                  : "shell__nav-link"
              }
              to="/capture"
            >
              Capture
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                isActive
                  ? "shell__nav-link shell__nav-link--active"
                  : "shell__nav-link"
              }
              to="/library"
            >
              Library
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                isActive
                  ? "shell__nav-link shell__nav-link--active"
                  : "shell__nav-link"
              }
              to="/review"
            >
              Review
            </NavLink>
          </nav>

          <div className="shell__account">
            <button
              className="button button--ghost shell__signout"
              onClick={onSignOut}
              type="button"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="shell__content">{children}</main>
    </div>
  );
};
