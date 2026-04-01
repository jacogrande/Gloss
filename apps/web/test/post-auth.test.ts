import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  clearCaptureOnboardingPending,
  getCurrentAppPath,
  getLoginPath,
  getPostAuthPath,
  getReturnToPath,
  hasCaptureOnboardingPending,
  markCaptureOnboardingPending,
  resolvePostAuthPath,
  sanitizeReturnTo,
} from "../src/features/auth/post-auth";

describe("post-auth helpers", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("routes signed-in users to capture while onboarding is pending", () => {
    markCaptureOnboardingPending();

    expect(hasCaptureOnboardingPending()).toBe(true);
    expect(getPostAuthPath()).toBe("/capture");
  });

  it("returns to the library after onboarding is cleared", () => {
    markCaptureOnboardingPending();
    clearCaptureOnboardingPending();

    expect(hasCaptureOnboardingPending()).toBe(false);
    expect(getPostAuthPath()).toBe("/library");
  });

  it("sanitizes and preserves safe return destinations", () => {
    expect(sanitizeReturnTo("/review")).toBe("/review");
    expect(sanitizeReturnTo("https://example.com/review")).toBeNull();
    expect(sanitizeReturnTo("//evil.example.com")).toBeNull();
    expect(sanitizeReturnTo("/login")).toBeNull();
    expect(
      getLoginPath({
        returnTo: "/seeds/seed_1?via=library",
      }),
    ).toBe("/login?returnTo=%2Fseeds%2Fseed_1%3Fvia%3Dlibrary");
  });

  it("prefers a valid return destination over the default post-auth path", () => {
    markCaptureOnboardingPending();

    expect(getReturnToPath("?returnTo=%2Freview")).toBe("/review");
    expect(
      resolvePostAuthPath({
        search: "?returnTo=%2Freview",
      }),
    ).toBe("/review");
    expect(
      getCurrentAppPath({
        hash: "#compare",
        pathname: "/seeds/seed_1",
        search: "?from=library",
      }),
    ).toBe("/seeds/seed_1?from=library#compare");
  });
});
