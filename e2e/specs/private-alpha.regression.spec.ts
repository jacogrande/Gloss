import {
  expect,
  test,
} from "@playwright/test";

import {
  answerCurrentReviewCard,
  captureSeedThroughUi,
  clearCookiesAndReload,
  createHarnessEmail,
  openReviewSession,
  signInThroughUi,
  signOutThroughUi,
  signUpThroughUi,
} from "../support/gloss";

test("private alpha auth flow handles missing-account errors and forced re-auth", async ({
  page,
}) => {
  const email = createHarnessEmail("alpha-auth");

  await signInThroughUi({
    email,
    page,
  });

  await expect(page.getByRole("alert")).toHaveText(
    "Incorrect email or password.",
  );

  await signUpThroughUi({
    email,
    name: "Alpha Reader",
    page,
  });

  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("heading", { name: "No words yet." })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("heading", { name: "No words yet." })).toBeVisible();

  await clearCookiesAndReload(page.context(), page, "/review");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("private alpha capture flow validates empty words and keeps seeds private", async ({
  page,
}) => {
  const email = createHarnessEmail("alpha-capture");

  await signUpThroughUi({
    email,
    name: "Capture Reader",
    page,
  });
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("heading", { name: "No words yet." })).toBeVisible();

  await page.goto("/capture");
  await page.getByLabel("Word or phrase").fill("   ");
  await page.getByLabel("Sentence").fill("The room felt austere but calm.");
  await page.getByRole("button", { name: "Save seed" }).click();
  await expect(page.getByRole("alert")).toHaveText("Enter a word or phrase.");

  await captureSeedThroughUi({
    page,
    sentence: "The room felt austere but calm.",
    sourceAuthor: "A. Reader",
    sourceKind: "book",
    sourceTitle: "Collected Notes",
    word: "austere",
  });

  await expect(page).toHaveURL(/\/seeds\/.+/);
  await expect(page.getByRole("heading", { name: "austere" })).toBeVisible();
  const privateSeedPath = new URL(page.url()).pathname;

  await signOutThroughUi(page);
  await signInThroughUi({
    email: "demo@gloss.local",
    page,
  });

  await expect(page).toHaveURL(/\/library$/);
  await page.goto(privateSeedPath);
  await expect(
    page.getByRole("heading", {
      name: /Seed (unavailable|not found)\./,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { exact: true, name: "library" }),
  ).toBeVisible();
});

test("private alpha review recovers from stale-card conflicts and completes sessions", async ({
  page,
}) => {
  await signInThroughUi({
    email: "demo@gloss.local",
    page,
  });
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("heading", { name: "Your words" })).toBeVisible();

  await openReviewSession(page);

  const secondPage = await page.context().newPage();

  try {
    await openReviewSession(secondPage);

    await answerCurrentReviewCard(page);

    await secondPage.getByRole("radio").first().click();
    await secondPage.getByRole("button", { name: "Submit" }).click();

    await expect(secondPage.getByRole("alert")).toHaveText(
      "This review changed elsewhere. The latest card is shown here.",
    );

    await expect
      .poll(async () => {
        if (
          await secondPage
            .getByRole("heading", { name: "Session finished" })
            .isVisible()
            .catch(() => false)
        ) {
          return "completed";
        }

        return secondPage.locator(".review-card__question").isVisible()
          ? "active"
          : "pending";
      })
      .toMatch(/active|completed/);

    for (let index = 0; index < 4; index += 1) {
      if (
        await page
          .getByRole("heading", { name: "Session finished" })
          .isVisible()
          .catch(() => false)
      ) {
        break;
      }

      await answerCurrentReviewCard(page);
    }

    await expect(
      page.getByRole("heading", { name: "Session finished" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Back to review queue" }).click();
    await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  } finally {
    await secondPage.close();
  }
});
