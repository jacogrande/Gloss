import {
  expect,
  test,
  type Page,
} from "@playwright/test";

import {
  answerCurrentReviewCard,
  captureSeedThroughUi,
  clearCookiesAndReload,
  completeReviewSession,
  openReviewSession,
  signInThroughUi,
  signUpThroughUi,
  waitForSeedDetailState,
} from "../support/gloss";
import {
  browserJourneyDefinitions,
  buildBrowserJourneyFuzzProfile,
  type BrowserJourneyId,
} from "../support/journey-fuzz";

const captureKnownSeed = async (input: {
  page: Page;
  profile: ReturnType<typeof buildBrowserJourneyFuzzProfile>;
  useSecondary?: boolean;
}): Promise<string> => {
  const fixture = input.useSecondary
    ? input.profile.secondaryKnownWord
    : input.profile.knownWord;

  await captureSeedThroughUi({
    page: input.page,
    sentence: fixture.sentence,
    sourceAuthor: input.profile.source.author,
    sourceKind: input.profile.source.kind,
    sourceTitle: input.profile.source.title,
    sourceUrl: input.profile.source.url,
    word: fixture.word,
  });

  await expect(input.page).toHaveURL(/\/seeds\/.+/);

  return fixture.word;
};

const runJourney = async (input: {
  journeyId: BrowserJourneyId;
  page: Page;
}): Promise<void> => {
  const profile = buildBrowserJourneyFuzzProfile(input.journeyId);

  switch (input.journeyId) {
    case "unauthenticated_protected_entry": {
      await input.page.goto(profile.protectedReturnTo);

      await expect(input.page).toHaveURL(
        new RegExp(`/login\\?returnTo=${encodeURIComponent(profile.protectedReturnTo)}$`),
      );
      await expect(input.page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      return;
    }

    case "sign_up_onboarding_handoff": {
      await signUpThroughUi({
        email: profile.email,
        name: profile.name,
        page: input.page,
        path: `/login?returnTo=${encodeURIComponent(profile.protectedReturnTo)}`,
      });

      await expect(input.page).toHaveURL(/\/capture$/);
      await expect(
        input.page.getByRole("heading", { name: "Save a word" }),
      ).toBeVisible();
      return;
    }

    case "empty_library_recovery": {
      await signUpThroughUi({
        email: profile.email,
        name: profile.name,
        page: input.page,
      });

      await input.page.goto("/library");
      await expect(input.page.getByRole("heading", { name: "Your words" })).toBeVisible();
      await expect(input.page.getByText("No words yet.")).toBeVisible();
      await expect(
        input.page.getByRole("link", { name: "Capture your first word" }),
      ).toHaveAttribute("href", "/capture");
      return;
    }

    case "capture_submission": {
      await signUpThroughUi({
        email: profile.email,
        name: profile.name,
        page: input.page,
      });

      const word = await captureKnownSeed({
        page: input.page,
        profile,
      });

      await expect(input.page.getByRole("heading", { name: word })).toBeVisible();
      return;
    }

    case "populated_library_browse": {
      await signUpThroughUi({
        email: profile.email,
        name: profile.name,
        page: input.page,
      });

      const word = await captureKnownSeed({
        page: input.page,
        profile,
      });
      await waitForSeedDetailState({
        page: input.page,
      });

      await input.page.goto("/library");
      await input.page.getByLabel("Stage").selectOption(profile.stageFilter);
      await expect(input.page.getByRole("link", { name: word })).toBeVisible();
      await input.page.getByRole("link", { name: word }).click();
      await expect(input.page).toHaveURL(/\/seeds\/.+/);
      await expect(input.page.getByRole("heading", { name: word })).toBeVisible();
      return;
    }

    case "seed_detail_handoff": {
      await signUpThroughUi({
        email: profile.email,
        name: profile.name,
        page: input.page,
      });

      const word = await captureKnownSeed({
        page: input.page,
        profile,
      });

      await expect(input.page.getByRole("heading", { name: word })).toBeVisible();
      await expect(
        input.page.getByRole("link", { name: "Save another word" }),
      ).toHaveAttribute("href", "/capture");
      return;
    }

    case "seed_detail_ready": {
      await signUpThroughUi({
        email: profile.email,
        name: profile.name,
        page: input.page,
      });

      const word = await captureKnownSeed({
        page: input.page,
        profile,
      });
      await expect(
        await waitForSeedDetailState({
          page: input.page,
        }),
      ).toBe("ready");

      await expect(input.page.getByRole("heading", { name: word })).toBeVisible();
      await expect(
        input.page.getByRole("heading", { name: "Context", exact: true }),
      ).toBeVisible();
      await expect(input.page.locator(".seed-enrichment__gloss")).toBeVisible();
      await expect(input.page.getByRole("link", { name: "Review queue" })).toHaveAttribute(
        "href",
        "/review",
      );
      return;
    }

    case "weak_evidence_recovery": {
      await signUpThroughUi({
        email: profile.email,
        name: profile.name,
        page: input.page,
      });

      await captureSeedThroughUi({
        page: input.page,
        word: profile.unknownWord.word,
      });
      await expect(input.page).toHaveURL(/\/seeds\/.+/);
      await expect(
        await waitForSeedDetailState({
          expectRecovery: true,
          page: input.page,
        }),
      ).toBe("failed");

      await expect(
        input.page.getByText("Add a sentence or source details, then try enrichment again."),
      ).toBeVisible();
      await expect(
        input.page.getByRole("textbox", { name: "Sentence (optional)" }),
      ).toHaveValue(
        "",
      );
      return;
    }

    case "review_queue": {
      await signUpThroughUi({
        email: profile.email,
        name: profile.name,
        page: input.page,
      });

      await captureKnownSeed({
        page: input.page,
        profile,
      });
      await waitForSeedDetailState({
        page: input.page,
      });

      await input.page.goto("/review");
      await expect(input.page.getByRole("heading", { name: "Review" })).toBeVisible();
      await expect(input.page.getByText(/\d+ word due now|\d+ words due now/)).toBeVisible();
      await expect(
        input.page.getByRole("button", { name: "Start review" }),
      ).toBeVisible();
      return;
    }

    case "active_review_feedback": {
      await signUpThroughUi({
        email: profile.email,
        name: profile.name,
        page: input.page,
      });

      await captureKnownSeed({
        page: input.page,
        profile,
      });
      await waitForSeedDetailState({
        page: input.page,
      });

      await openReviewSession(input.page);
      await answerCurrentReviewCard(input.page, "last", {
        continueAfterFeedback: false,
      });
      await expect(input.page.getByText("Correct answer")).toBeVisible();
      await expect(input.page.locator(".review-feedback")).toBeVisible();
      await expect(
        input.page.getByRole("button", { name: "Continue" }),
      ).toBeVisible();
      return;
    }

    case "review_completion": {
      await signUpThroughUi({
        email: profile.email,
        name: profile.name,
        page: input.page,
      });

      await captureKnownSeed({
        page: input.page,
        profile,
      });
      await waitForSeedDetailState({
        page: input.page,
      });
      await captureKnownSeed({
        page: input.page,
        profile,
        useSecondary: true,
      });
      await waitForSeedDetailState({
        page: input.page,
      });

      await openReviewSession(input.page);
      await completeReviewSession({
        page: input.page,
        strategy: "first",
      });
      await expect(
        input.page.getByRole("heading", { name: "Session finished" }),
      ).toBeVisible();
      return;
    }

    case "forced_reauth_deep_link": {
      await signUpThroughUi({
        email: profile.email,
        name: profile.name,
        page: input.page,
      });

      const word = await captureKnownSeed({
        page: input.page,
        profile,
      });
      await waitForSeedDetailState({
        page: input.page,
      });

      const seedPath = new URL(input.page.url()).pathname;

      await clearCookiesAndReload(input.page.context(), input.page, seedPath);
      await expect(input.page).toHaveURL(
        new RegExp(`/login\\?returnTo=${encodeURIComponent(seedPath)}$`),
      );

      await signInThroughUi({
        email: profile.email,
        page: input.page,
        path: input.page.url(),
      });

      await expect(input.page).toHaveURL(new RegExp(`${seedPath}$`));
      await expect(input.page.getByRole("heading", { name: word })).toBeVisible();
      return;
    }

    default: {
      const exhaustiveJourneyId: never = input.journeyId;
      throw new Error(`Unhandled browser journey: ${String(exhaustiveJourneyId)}`);
    }
  }
};

test.describe("browser journey fuzz evals", () => {
  for (const journey of browserJourneyDefinitions) {
    test(`@journey-fuzz ${journey.title}`, async ({ page }) => {
      await runJourney({
        journeyId: journey.id,
        page,
      });
    });
  }
});
