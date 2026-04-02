import type { JSX } from "react";

type SessionUnavailablePanelProps = {
  isRetrying: boolean;
  message: string;
  onRetry: () => void;
};

export const SessionUnavailablePanel = ({
  isRetrying,
  message,
  onRetry,
}: SessionUnavailablePanelProps): JSX.Element => (
  <main className="screen screen--centered">
    <section className="page page--notice surface surface--notice panel panel--status">
      <div className="panel__header">
        <p className="panel__eyebrow">Connection</p>
        <h2>Gloss is unavailable</h2>
        <p className="panel__copy">{message}</p>
      </div>

      <div className="action-row panel__actions">
        <button
          className="button button--primary"
          disabled={isRetrying}
          onClick={onRetry}
          type="button"
        >
          {isRetrying ? "Trying again..." : "Try again"}
        </button>
      </div>
    </section>
  </main>
);

type SessionConnectionBannerProps = {
  isRetrying: boolean;
  message: string;
  onRetry: () => void;
};

export const SessionConnectionBanner = ({
  isRetrying,
  message,
  onRetry,
}: SessionConnectionBannerProps): JSX.Element => (
  <section
    aria-live="polite"
    className="surface surface--notice panel panel--compact shell__connection-banner"
  >
    <div className="shell__connection-copy">
      <p className="panel__eyebrow">Connection</p>
      <p className="panel__copy">{message}</p>
    </div>
    <button
      className="button button--ghost"
      disabled={isRetrying}
      onClick={onRetry}
      type="button"
    >
      {isRetrying ? "Trying again..." : "Retry now"}
    </button>
  </section>
);
