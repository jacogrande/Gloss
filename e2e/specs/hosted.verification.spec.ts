import {
  expect,
  test,
} from "@playwright/test";

import {
  captureSeedThroughUi,
  createHarnessEmail,
  signOutThroughUi,
  signUpThroughUi,
} from "../support/gloss";

test("@hosted unauthenticated direct library access redirects to login", async ({
  page,
}) => {
  await page.goto("/library");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("@hosted hosted auth and capture flow survives refresh and sign-out", async ({
  page,
}) => {
  const email = createHarnessEmail("hosted-alpha");

  await signUpThroughUi({
    email,
    name: "Hosted Reader",
    page,
  });

  await expect(page).toHaveURL(/\/library$/);

  await captureSeedThroughUi({
    page,
    sentence: "The argument remained pellucid even under pressure.",
    sourceAuthor: "A. Reader",
    sourceKind: "article",
    sourceTitle: "Preview Notes",
    word: "pellucid",
  });

  await expect(page).toHaveURL(/\/seeds\/.+/);
  await expect(page.getByRole("heading", { name: "pellucid" })).toBeVisible();

  const detailPath = new URL(page.url()).pathname;

  await page.reload();
  await expect(page).toHaveURL(new RegExp(`${detailPath}$`));
  await expect(page.getByRole("heading", { name: "pellucid" })).toBeVisible();

  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Your words" })).toBeVisible();
  await expect(page.getByRole("link", { name: "pellucid" })).toBeVisible();

  await signOutThroughUi(page);
  await page.goto(detailPath);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
