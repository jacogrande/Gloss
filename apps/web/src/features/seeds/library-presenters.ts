import type { SeedStage } from "@gloss/shared/types";

import { getEmptyLibraryMessage } from "../../lib/product-loop-copy";
import { formatSeedStageLabel } from "./seed-presenters";

export type LibraryEmptyState = {
  message: string;
  primaryAction:
    | {
        href: string;
        kind: "link";
        label: string;
      }
    | {
        kind: "reset-filter";
        label: string;
      };
  secondaryAction?:
    | {
        kind: "reset-filter";
        label: string;
      }
    | {
        href: string;
        kind: "link";
        label: string;
      };
  title: string;
};

export const formatStageFilterLabel = (value: SeedStage | "all"): string =>
  value === "all" ? "All" : formatSeedStageLabel(value);

export const getLibraryEmptyState = (
  input: {
    hasAnyWords: boolean;
    stage: SeedStage | "all";
  },
): LibraryEmptyState => {
  if (!input.hasAnyWords) {
    return {
      message: getEmptyLibraryMessage(),
      primaryAction: {
        href: "/capture",
        kind: "link",
        label: "Save your first word",
      },
      ...(input.stage === "all"
        ? {}
        : {
            secondaryAction: {
              kind: "reset-filter" as const,
              label: "Clear filter",
            },
          }),
      title: "No words yet.",
    };
  }

  if (input.stage !== "all") {
    return {
      message: "Try another stage, or clear this filter to see the rest of your words.",
      primaryAction: {
        kind: "reset-filter",
        label: "Clear filter",
      },
      title: `No ${formatStageFilterLabel(input.stage).toLowerCase()} words.`,
    };
  }

  return {
    message: getEmptyLibraryMessage(),
    primaryAction: {
      href: "/capture",
      kind: "link",
      label: "Save your first word",
    },
    title: "No words yet.",
  };
};
