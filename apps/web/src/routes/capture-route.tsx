import { useState, useTransition, type JSX } from "react";
import { useNavigate } from "react-router-dom";

import type { CreateSeedInput } from "@gloss/shared/types";

import { CaptureForm } from "../features/seeds/CaptureForm";
import { createSeed } from "../lib/api-client";
import { webEnv } from "../lib/env";

const toErrorMessage = (value: unknown): string =>
  value instanceof Error ? value.message : "Unable to save this seed.";

export const CaptureRoute = (): JSX.Element => {
  const navigate = useNavigate();
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

              await navigate(`/seeds/${seed.id}`);
            } catch (error) {
              setErrorMessage(toErrorMessage(error));
            }
          })();
        });
      }}
    />
  );
};
