import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  clearCaptureOnboardingPending,
  getPostAuthPath,
  hasCaptureOnboardingPending,
  markCaptureOnboardingPending,
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
});
