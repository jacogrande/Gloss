type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

const captureOnboardingKey = "gloss.capture_onboarding_pending";

const resolveSessionStorage = (): StorageLike | null =>
  typeof window === "undefined" ? null : window.sessionStorage;

export const hasCaptureOnboardingPending = (
  storage: StorageLike | null = resolveSessionStorage(),
): boolean => storage?.getItem(captureOnboardingKey) === "true";

export const getPostAuthPath = (
  storage: StorageLike | null = resolveSessionStorage(),
): "/capture" | "/library" =>
  hasCaptureOnboardingPending(storage) ? "/capture" : "/library";

export const markCaptureOnboardingPending = (
  storage: StorageLike | null = resolveSessionStorage(),
): void => {
  storage?.setItem(captureOnboardingKey, "true");
};

export const clearCaptureOnboardingPending = (
  storage: StorageLike | null = resolveSessionStorage(),
): void => {
  storage?.removeItem(captureOnboardingKey);
};
