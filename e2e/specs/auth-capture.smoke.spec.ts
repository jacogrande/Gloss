import {
  expect,
  test,
} from "@playwright/test";

import {
  openReviewSession,
  signUpThroughUi,
  waitForSeedDetailState,
} from "../support/gloss";
import { promoteSeedToRecallReady } from "../support/review-state";

const isLiveEnrichment = process.env.ENRICHMENT_PROVIDER_MODE === "live";

test("@smoke unauthenticated library access redirects to login", async ({
  page,
}) => {
  await page.goto("/library");

  await expect(page).toHaveURL(/\/login\?returnTo=%2Flibrary$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("@smoke demo user can sign in, capture a seed, and read it back", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@gloss.local");
  await page.getByLabel("Password").fill("password1234");
  await page
    .getByTestId("auth-form")
    .getByRole("button", { name: "Sign in" })
    .click();

  await expect(page).toHaveURL(/\/library$/);
  await expect(
    page.getByRole("heading", { name: "Your words" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "lapidary" })).toBeVisible();

  await page.getByRole("link", { name: "Capture" }).click();
  await expect(page).toHaveURL(/\/capture$/);
  await page.getByLabel("Word or phrase").fill("pellucid");
  await expect(
    page.getByLabel("Sentence from your reading (recommended)"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Add sentence or source" }).click();
  await page
    .getByLabel("Sentence from your reading (recommended)")
    .fill("Her explanation was pellucid even under pressure.");
  await page.getByLabel("Source type").selectOption("book");
  await page.getByLabel("Source title").fill("On Style");
  await page.getByLabel("Author").fill("A. Reader");
  await page.getByRole("button", { name: "Save word" }).click();

  await expect(page).toHaveURL(/\/seeds\/.+/);
  await expect(page.getByRole("heading", { name: "pellucid" })).toBeVisible();
  await expect(page.locator(".seed-detail__evidence .seed-detail__evidence-title")).toHaveText(
    "From your reading",
  );
  await expect(page.locator(".seed-detail__sentence")).toHaveText(
    "Her explanation was pellucid even under pressure.",
  );
  await expect(page.getByText("On Style")).toBeVisible();
  await expect(page.getByText("A. Reader")).toBeVisible();
  const enrichmentPanel = page.locator(".seed-enrichment");
  const gloss = enrichmentPanel.locator(".seed-enrichment__gloss");

  if (isLiveEnrichment) {
    await expect
      .poll(async () => {
        if (await gloss.isVisible().catch(() => false)) {
          return "ready";
        }

        const panelClassName = await enrichmentPanel.getAttribute("class").catch(
          () => null,
        );

        if (panelClassName?.includes("seed-enrichment--failed")) {
          return "failed";
        }

        return "pending";
      }, {
        timeout: 30_000,
      })
      .toBe("ready");

    if (
      (await enrichmentPanel.getAttribute("class").catch(() => null))?.includes(
        "seed-enrichment--failed",
      )
    ) {
      throw new Error(
        `Live enrichment failed in the browser: ${await enrichmentPanel.locator(".seed-enrichment__state-copy").textContent()}`,
      );
    }

    await expect(gloss).not.toHaveText("");
    await expect(enrichmentPanel.locator(".seed-enrichment__source-line")).toContainText(
      "Merriam-Webster",
    );
  } else {
    await expect(gloss).not.toHaveText("");
    await expect(page.getByText("Similar")).toBeVisible();
    await expect(
      page.locator(".seed-detail__compare-word").filter({ hasText: "lucid" }),
    ).toBeVisible();
    await expect(
      page.locator(".seed-detail__compare-word").filter({ hasText: "opaque" }),
    ).toBeVisible();
  }

  await page
    .getByLabel("Primary")
    .getByRole("link", { exact: true, name: "Library" })
    .click();
  await expect(page).toHaveURL(/\/library$/);
  const capturedSeedCard = page
    .locator(".seed-card")
    .filter({ hasText: "Her explanation was pellucid even under pressure." });
  await expect(capturedSeedCard.first()).toBeVisible();
  await expect(capturedSeedCard.first().getByRole("link", { name: "pellucid" })).toBeVisible();

  await page
    .getByLabel("Primary")
    .getByRole("link", { exact: true, name: "Review" })
    .click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByText(/\d+ words? ready now/)).toBeVisible();
  await page.getByRole("button", { name: "Start a short session" }).click();

  await expect(page.locator(".review-card__question")).toBeVisible();

  const queueSummary = page.locator(".review__queue-summary");
  const remainingBeforeSubmit = await queueSummary.textContent();
  const firstChoice = page.getByRole("radio").first();
  let submitState: "advanced" | "completed" | "feedback" | "pending" =
    "pending";

  await firstChoice.click();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect
    .poll(async () => {
      if (
        await page
          .getByRole("heading", { name: "Nice work" })
          .isVisible()
          .catch(() => false)
      ) {
        submitState = "completed";
        return submitState;
      }

      if (
        await page.getByText("Correct answer").isVisible().catch(() => false)
      ) {
        submitState = "feedback";
        return submitState;
      }

      const remainingAfterSubmit = await queueSummary.textContent().catch(
        () => null,
      );

      if (
        remainingAfterSubmit !== null &&
        remainingAfterSubmit !== remainingBeforeSubmit
      ) {
        submitState = "advanced";
        return submitState;
      }

      submitState = "pending";
      return submitState;
    })
    .toMatch(/advanced|feedback|completed/);

  if (submitState === "feedback") {
    await page.getByRole("button", { name: "Continue" }).click();

    await expect
      .poll(async () => {
        if (
          await page
            .getByRole("heading", { name: "Nice work" })
            .isVisible()
            .catch(() => false)
        ) {
          return "completed";
        }

        const remainingAfterSubmit = await queueSummary.textContent().catch(
          () => null,
        );

        if (
          remainingAfterSubmit !== null &&
          remainingAfterSubmit !== remainingBeforeSubmit
        ) {
          return "advanced";
        }

        return "pending";
      })
      .toMatch(/advanced|completed/);
  }
});

test("@smoke typed recall cards render and accept text answers", async ({
  page,
}) => {
  const email = `smoke-recall-${Date.now()}@gloss.local`;

  await signUpThroughUi({
    email,
    name: "Smoke Recall",
    page,
  });

  await page.goto("/capture");
  await page.getByLabel("Word or phrase").fill("pellucid");
  await page.getByRole("button", { name: "Add sentence or source" }).click();
  await page
    .getByLabel("Sentence from your reading (recommended)")
    .fill("Her explanation was pellucid even under pressure.");
  await page.getByRole("button", { name: "Save word" }).click();

  await expect(page).toHaveURL(/\/seeds\/.+/);
  await expect(
    await waitForSeedDetailState({
      page,
    }),
  ).toBe("ready");

  await promoteSeedToRecallReady({
    email,
    word: "pellucid",
  });

  await page.goto("/review");
  await openReviewSession(page);
  await expect(
    page.getByRole("heading", { name: "Recall the word" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Your answer" }).fill("pellucid");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Correct answer")).toBeVisible();
  await expect(
    page.getByText("You pulled back the right word from the sentence."),
  ).toBeVisible();
});
