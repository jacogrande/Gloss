import { useState, useTransition, type JSX } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { CreateSeedInput } from "@gloss/shared/types";

import {
  getAuthErrorMessage,
  isUnauthorizedAuthError,
} from "../features/auth/auth-service";
import {
  clearCaptureOnboardingPending,
  getCurrentAppPath,
  getLoginPath,
} from "../features/auth/post-auth";
import { useSessionState } from "../features/auth/session-provider";
import { CaptureForm } from "../features/seeds/CaptureForm";
import { createSeed } from "../lib/api-client";
import { webEnv } from "../lib/env";

export const CaptureRoute = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionState = useSessionState();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <CaptureForm
      errorMessage={errorMessage}
      isPending={isPending}
      onSubmit={(value: CreateSeedInput) => {
        setErrorMessage(null);

        startTransition(() => {
          void (async () => {
            try {
              const seed = await createSeed(webEnv.VITE_API_BASE_URL, value);

              clearCaptureOnboardingPending();
              await navigate(`/seeds/${seed.id}`, {
                replace: true,
                state: {
                  initialSeed: seed,
                  showSavedNotice: true,
                },
              });
            } catch (error) {
              if (isUnauthorizedAuthError(error)) {
                sessionState.setSession(null);
                await navigate(
                  getLoginPath({
                    returnTo: getCurrentAppPath(location),
                  }),
                  { replace: true },
                );
                return;
              }

              setErrorMessage(getAuthErrorMessage(error));
            }
          })();
        });
      }}
    />
  );
};
