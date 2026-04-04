import { useState, type JSX } from "react";

import { getAuthHelperCopy } from "../../lib/product-loop-copy";
import { InkDoodle } from "../ui/InkDoodle";

type AuthMode = "sign-in" | "sign-up";

type AuthFormProps = {
  errorMessage: string | null;
  isPending: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (fields: {
    email: string;
    name: string;
    password: string;
  }) => void;
};

export const AuthForm = ({
  errorMessage,
  isPending,
  mode,
  onModeChange,
  onSubmit,
}: AuthFormProps): JSX.Element => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const helperCopy = getAuthHelperCopy(mode);

  return (
    <section className="page page--form surface surface--primary auth-card" data-mode={mode}>
      <header className="auth-card__header">
        <div className="section-heading">
          <InkDoodle className="section-heading__mark" variant="spark" />
          <p className="auth-card__eyebrow">Gloss</p>
        </div>
        <h1>{mode === "sign-in" ? "Sign in" : "Create your account"}</h1>
        <p className="auth-card__copy">{helperCopy}</p>
      </header>

      <div className="auth-card__mode-switch" role="tablist" aria-label="Auth mode">
        <span aria-hidden="true" className="auth-card__mode-indicator" />
        <button
          aria-selected={mode === "sign-in"}
          className={mode === "sign-in" ? "auth-card__tab auth-card__tab--active" : "auth-card__tab"}
          onClick={() => onModeChange("sign-in")}
          type="button"
        >
          Sign in
        </button>
        <button
          aria-selected={mode === "sign-up"}
          className={mode === "sign-up" ? "auth-card__tab auth-card__tab--active" : "auth-card__tab"}
          onClick={() => onModeChange("sign-up")}
          type="button"
        >
          Create account
        </button>
      </div>

      <form
        className="auth-card__form"
        data-testid="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ email, name, password });
        }}
      >
        <div
          aria-hidden={mode !== "sign-up"}
          className="auth-card__optional-field"
          data-visible={mode === "sign-up"}
        >
          <div className="auth-card__optional-field-inner">
            <label className="auth-card__field">
              <span>Name</span>
              <input
                autoComplete="name"
                disabled={mode !== "sign-up"}
                onChange={(event) => setName(event.target.value)}
                placeholder="Gloss Reader"
                required={mode === "sign-up"}
                tabIndex={mode === "sign-up" ? undefined : -1}
                type="text"
                value={name}
              />
              <small className="auth-card__hint">This is how your account appears inside Gloss.</small>
            </label>
          </div>
        </div>

        <label className="auth-card__field">
          <span>Email</span>
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="reader@example.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label className="auth-card__field">
          <span>Password</span>
          <input
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === "sign-in" ? "Your password" : "At least 8 characters"}
            required
            type="password"
            value={password}
          />
          {mode === "sign-up" ? (
            <small className="auth-card__hint">Use at least 8 characters.</small>
          ) : null}
        </label>

        {errorMessage ? (
          <p className="auth-card__error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button
          className="button button--primary auth-card__submit"
          disabled={isPending}
          type="submit"
        >
          {isPending
            ? mode === "sign-in"
              ? "Signing in..."
              : "Creating account..."
            : mode === "sign-in"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>
    </section>
  );
};
