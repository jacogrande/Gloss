import type { JSX } from "react";
import type { SessionData } from "@gloss/shared/types";

type SessionPanelProps = {
  onSignOut: () => void;
  profile: SessionData;
  status: "idle" | "loading" | "ready";
};

export const SessionPanel = ({
  onSignOut,
  profile,
  status,
}: SessionPanelProps): JSX.Element => (
  <section className="session-panel">
    <header className="session-panel__header">
      <div>
        <p className="session-panel__eyebrow">Authenticated shell</p>
        <h1>{profile.user.name}</h1>
        <p className="session-panel__copy">{profile.user.email}</p>
      </div>

      <button className="session-panel__signout" onClick={onSignOut} type="button">
        Sign out
      </button>
    </header>

    <dl className="session-panel__grid">
      <div>
        <dt>Auth user id</dt>
        <dd>{profile.user.id}</dd>
      </div>
      <div>
        <dt>Profile row</dt>
        <dd>{profile.profile?.userId ?? "Missing"}</dd>
      </div>
      <div>
        <dt>Session id</dt>
        <dd>{profile.session.id}</dd>
      </div>
      <div>
        <dt>API sync</dt>
        <dd>{status === "ready" ? "Loaded" : "Refreshing"}</dd>
      </div>
    </dl>
  </section>
);
