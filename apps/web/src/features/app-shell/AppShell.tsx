import type { JSX, PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";

type AppShellProps = PropsWithChildren<{
  onSignOut: () => void;
  userEmail: string;
  userName: string;
}>;

export const AppShell = ({
  children,
  onSignOut,
  userEmail,
  userName,
}: AppShellProps): JSX.Element => (
  <div className="shell">
    <header className="shell__header">
      <div className="shell__brand">
        <p className="shell__brand-name">Gloss</p>
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
          <div className="shell__account-copy">
            <p className="shell__account-name">{userName}</p>
            <p className="shell__account-email">{userEmail}</p>
          </div>
          <button className="shell__signout" onClick={onSignOut} type="button">
            Sign out
          </button>
        </div>
      </div>
    </header>

    <main className="shell__content">{children}</main>
  </div>
);
