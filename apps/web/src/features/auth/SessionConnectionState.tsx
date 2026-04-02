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
    <section className="panel panel--status">
      <div className="panel__header">
        <p className="panel__eyebrow">Connection</p>
        <h2>Gloss is unavailable</h2>
        <p className="panel__copy">{message}</p>
      </div>

      <div className="panel__actions">
        <button
          className="capture-form__submit"
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
    className="panel panel--compact shell__connection-banner"
  >
    <p className="panel__eyebrow">Connection</p>
    <p className="panel__copy">{message}</p>
    <button
      className="capture-form__secondary-link"
      disabled={isRetrying}
      onClick={onRetry}
      type="button"
    >
      {isRetrying ? "Trying again..." : "Retry now"}
    </button>
  </section>
);
