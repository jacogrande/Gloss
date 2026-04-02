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
    dispose: (): void => {
      page.off("request", onRequest);
    },
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

export const waitForSeedDetailState = async (input: {
  expectRecovery?: boolean;
  page: Page;
}): Promise<"failed" | "ready"> => {
  const recoveryHeadingPattern = /Give this word more context|Add the sentence/;
  const timeoutMs = process.env.ENRICHMENT_PROVIDER_MODE === "live" ? 60_000 : 15_000;
  const enrichmentPanel = input.page.locator(".seed-enrichment");
  const gloss = enrichmentPanel.locator(".seed-enrichment__gloss");
  let outcome: "failed" | "pending" | "ready" = "pending";

  await expect
    .poll(async () => {
      if (
        await input.page
          .getByRole("heading", { name: recoveryHeadingPattern })
          .isVisible()
          .catch(() => false)
      ) {
        outcome = "failed";
        return outcome;
      }

      if (
        (await enrichmentPanel.getAttribute("class").catch(() => null))?.includes(
          "seed-enrichment--failed",
        )
      ) {
        outcome = "failed";
        return outcome;
      }

      if (
        (await enrichmentPanel.getAttribute("class").catch(() => null))?.includes(
          "seed-enrichment--ready",
        ) &&
        (await gloss.isVisible().catch(() => false))
      ) {
        outcome = "ready";
        return outcome;
      }

      outcome = "pending";
      return outcome;
    }, {
      timeout: timeoutMs,
    })
    .not.toBe("pending");

  if (input.expectRecovery) {
    await expect(
      input.page.getByRole("heading", { name: recoveryHeadingPattern }),
    ).toBeVisible();
  }

  return outcome === "ready" ? "ready" : "failed";
};

export const signInThroughUi = async (input: {
  email: string;
  page: Page;
  password?: string;
  path?: string;
}): Promise<void> => {
  await input.page.goto(input.path ?? "/login");
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
  path?: string;
}): Promise<void> => {
  await input.page.goto(input.path ?? "/login");
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
  await expect(input.page).not.toHaveURL(/\/login(?:\?.*)?$/);
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
  await expect(input.page.getByLabel("Word or phrase")).toBeVisible();
  await input.page.getByLabel("Word or phrase").fill(input.word);

  const hasSourceDetails =
    input.sentence !== undefined ||
    input.sourceKind !== undefined ||
    input.sourceTitle !== undefined ||
    input.sourceAuthor !== undefined ||
    input.sourceUrl !== undefined;

  if (hasSourceDetails) {
    await input.page.getByRole("button", { name: "Add context" }).click();
  }

  if (input.sentence !== undefined) {
    await input.page.getByLabel("Sentence (optional)").fill(input.sentence);
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

export const answerCurrentReviewCard = async (
  page: Page,
  strategy: "first" | "last" = "first",
  options?: {
    continueAfterFeedback?: boolean;
    submitWithEnter?: boolean;
    textAnswer?: string | ((page: Page) => Promise<string> | string);
  },
): Promise<void> => {
  const remaining = await page
    .locator(".review__queue-summary")
    .textContent()
    .catch(() => null);
  let submitState: "advanced" | "completed" | "feedback" | "pending" =
    "pending";

  const textInput = page.getByRole("textbox", { name: "Your answer" });
  const isTextCard = await textInput.isVisible().catch(() => false);

  if (isTextCard) {
    if (!options?.textAnswer) {
      throw new Error("Text recall cards require a textAnswer option.");
    }

    const textAnswer =
      typeof options.textAnswer === "function"
        ? await options.textAnswer(page)
        : options.textAnswer;

    await textInput.fill(textAnswer);
    if (options?.submitWithEnter) {
      await textInput.press("Enter");
    }
  } else {
    const choices = page.getByRole("radio");
    const choice =
      strategy === "last" ? choices.last() : choices.first();

    await choice.click();
  }

  if (!isTextCard || !options?.submitWithEnter) {
    await page.getByRole("button", { name: "Submit" }).click();
  }

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

  if (submitState === "feedback" && options?.continueAfterFeedback !== false) {
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

export const completeReviewSession = async (input: {
  maxCards?: number;
  page: Page;
  strategy?: "first" | "last";
  textAnswer?: string | ((page: Page) => Promise<string> | string);
}): Promise<void> => {
  const maxCards = input.maxCards ?? 8;

  for (let index = 0; index < maxCards; index += 1) {
    if (
      await input.page
        .getByRole("heading", { name: "Session finished" })
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }

    await answerCurrentReviewCard(input.page, input.strategy, {
      textAnswer: input.textAnswer,
    });
  }

  await expect(
    input.page.getByRole("heading", { name: "Session finished" }),
  ).toBeVisible();
};

export const openReviewSession = async (page: Page): Promise<void> => {
  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  const startButton = page.getByRole("button", { name: "Start review" });
  const resumeButton = page.getByRole("button", { name: "Resume review" });

  if (
    await startButton.isVisible().catch(() => false)
  ) {
    await Promise.all([
      page.waitForResponse((response) => {
        const request = response.request();

        return (
          request.method() === "POST" &&
          new URL(response.url()).pathname === "/review/sessions"
        );
      }),
      startButton.click(),
    ]);
  } else if (await resumeButton.isVisible().catch(() => false)) {
    await resumeButton.click();
  }

  await expect
    .poll(async () => {
      if (
        await page.locator(".review-card__question").isVisible().catch(() => false)
      ) {
        return "question";
      }

      if (
        await page
          .getByRole("heading", { name: "Session finished" })
          .isVisible()
          .catch(() => false)
      ) {
        return "finished";
      }

      return "pending";
    }, {
      timeout: 10_000,
    })
    .toBe("question");
};
