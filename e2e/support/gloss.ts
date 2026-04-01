import {
  expect,
  type BrowserContext,
  type Page,
  type Request,
} from "@playwright/test";

export const createHarnessEmail = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@gloss.local`;

export const createNetworkOriginTracker = (page: Page) => {
  const crossOriginRequests: string[] = [];
  const onRequest = (request: Request) => {
    if (request.resourceType() !== "fetch" && request.resourceType() !== "xhr") {
      return;
    }

    crossOriginRequests.push(request.url());
  };

  page.on("request", onRequest);

  return {
    checkpoint: (): number => crossOriginRequests.length,
    expectOnlyApiOriginUsedSince: async (checkpoint: number): Promise<void> => {
      const webOrigin = process.env.PLAYWRIGHT_BASE_URL
        ? new URL(process.env.PLAYWRIGHT_BASE_URL).origin
        : process.env.PLAYWRIGHT_WEB_PORT
          ? `http://127.0.0.1:${process.env.PLAYWRIGHT_WEB_PORT}`
          : new URL(page.url()).origin;
      const apiOrigin = process.env.PLAYWRIGHT_API_ORIGIN
        ? new URL(process.env.PLAYWRIGHT_API_ORIGIN).origin
        : process.env.PLAYWRIGHT_API_PORT
          ? `http://127.0.0.1:${process.env.PLAYWRIGHT_API_PORT}`
          : null;

      if (!apiOrigin) {
        throw new Error(
          "PLAYWRIGHT_API_ORIGIN or PLAYWRIGHT_API_PORT must be configured for API-origin verification.",
        );
      }

      const relevantRequests = crossOriginRequests.slice(checkpoint).filter((requestUrl) => {
        const requestOrigin = new URL(requestUrl).origin;

        return requestOrigin !== webOrigin;
      });

      await expect
        .poll(() => relevantRequests.length, {
          timeout: 10_000,
        })
        .toBeGreaterThan(0);

      const origins = Array.from(
        new Set(
          relevantRequests.map(
            (requestUrl) => new URL(requestUrl).origin,
          ),
        ),
      );

      expect(origins).toEqual([apiOrigin]);
    },
  };
};

export const signInThroughUi = async (input: {
  email: string;
  page: Page;
  password?: string;
}): Promise<void> => {
  await input.page.goto("/login");
  await input.page.getByLabel("Email").fill(input.email);
  await input.page
    .getByLabel("Password")
    .fill(input.password ?? "password1234");
  await input.page
    .getByTestId("auth-form")
    .getByRole("button", { name: "Sign in" })
    .click();
};

export const signUpThroughUi = async (input: {
  email: string;
  name: string;
  page: Page;
  password?: string;
}): Promise<void> => {
  await input.page.goto("/login");
  await input.page.getByRole("button", { name: "Create account" }).click();
  await input.page.getByLabel("Name").fill(input.name);
  await input.page.getByLabel("Email").fill(input.email);
  await input.page
    .getByLabel("Password")
    .fill(input.password ?? "password1234");
  await input.page
    .getByTestId("auth-form")
    .getByRole("button", { name: "Create account" })
    .click();
};

export const signOutThroughUi = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
};

export const captureSeedThroughUi = async (input: {
  page: Page;
  sentence?: string;
  sourceAuthor?: string;
  sourceKind?: "article" | "book" | "manual" | "other";
  sourceTitle?: string;
  sourceUrl?: string;
  word: string;
}): Promise<void> => {
  await input.page.goto("/capture");
  await input.page.getByLabel("Word or phrase").fill(input.word);

  if (input.sentence !== undefined) {
    await input.page.getByLabel("Sentence").fill(input.sentence);
  }

  const hasSourceDetails =
    input.sourceKind !== undefined ||
    input.sourceTitle !== undefined ||
    input.sourceAuthor !== undefined ||
    input.sourceUrl !== undefined;

  if (hasSourceDetails) {
    await input.page.getByText("Source details (optional)").click();
  }

  if (input.sourceKind !== undefined) {
    await input.page.getByLabel("Source type").selectOption(input.sourceKind);
  }

  if (input.sourceTitle !== undefined) {
    await input.page.getByLabel("Source title").fill(input.sourceTitle);
  }

  if (input.sourceAuthor !== undefined) {
    await input.page.getByLabel("Author").fill(input.sourceAuthor);
  }

  if (input.sourceUrl !== undefined) {
    await input.page.getByLabel("URL").fill(input.sourceUrl);
  }

  await input.page.getByRole("button", { name: "Save word" }).click();
};

export const clearCookiesAndReload = async (
  context: BrowserContext,
  page: Page,
  pathname: string,
): Promise<void> => {
  await context.clearCookies();
  await page.goto(pathname);
};

export const answerCurrentReviewCard = async (page: Page): Promise<void> => {
  const remaining = await page
    .locator(".review__queue-summary")
    .textContent()
    .catch(() => null);
  let submitState: "advanced" | "completed" | "feedback" | "pending" =
    "pending";

  await page.getByRole("radio").first().click();
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

      const nextRemaining = await page
        .locator(".review__queue-summary")
        .textContent()
        .catch(() => null);

      if (remaining !== null && nextRemaining !== null && nextRemaining !== remaining) {
        submitState = "advanced";
        return submitState;
      }

      submitState = "pending";
      return submitState;
    }, {
      timeout: 10_000,
    })
    .toMatch(/advanced|completed|feedback/);

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

        const nextRemaining = await page
          .locator(".review__queue-summary")
          .textContent()
          .catch(() => null);

        if (remaining !== null && nextRemaining !== null && nextRemaining !== remaining) {
          return "advanced";
        }

        return "pending";
      }, {
        timeout: 10_000,
      })
      .toMatch(/advanced|completed/);
  }
};

export const openReviewSession = async (page: Page): Promise<void> => {
  await page.goto("/review");

  if (
    await page
      .getByRole("button", { name: "Start review" })
      .isVisible()
      .catch(() => false)
  ) {
    await page.getByRole("button", { name: "Start review" }).click();
  }

  await expect(page.locator(".review-card__question")).toBeVisible();
};
