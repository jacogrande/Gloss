import {
  expect,
  test,
} from "@playwright/test";

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
  await page
    .getByLabel("Sentence (optional)")
    .fill("Her explanation was pellucid even under pressure.");
  await page.getByText("Source details (optional)").click();
  await page.getByLabel("Source type").selectOption("book");
  await page.getByLabel("Source title").fill("On Style");
  await page.getByLabel("Author").fill("A. Reader");
  await page.getByRole("button", { name: "Save word" }).click();

  await expect(page).toHaveURL(/\/seeds\/.+/);
  await expect(page.getByRole("heading", { name: "pellucid" })).toBeVisible();
  await expect(page.locator(".seed-detail__evidence .seed-detail__evidence-title")).toHaveText(
    "Context",
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
    await expect
      .poll(async () => page.locator(".seed-detail__stack div").count())
      .toBeGreaterThan(1);
  } else {
    await expect(gloss).not.toHaveText("");
    await expect(page.getByText("Similar")).toBeVisible();
    await expect(page.locator(".seed-detail__term").filter({ hasText: "lucid" })).toBeVisible();
    await expect(page.locator(".seed-detail__term").filter({ hasText: "opaque" })).toBeVisible();
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
  await expect(page.getByText(/\d+ words? due now/)).toBeVisible();
  await page.getByRole("button", { name: "Start review" }).click();

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
          .getByRole("heading", { name: "Session finished" })
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
            .getByRole("heading", { name: "Session finished" })
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
