type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

type LocationLike = {
  hash?: string;
  pathname: string;
  search?: string;
};

const captureOnboardingKey = "gloss.capture_onboarding_pending";
const returnToSearchParam = "returnTo";

const resolveSessionStorage = (): StorageLike | null =>
  typeof window === "undefined" ? null : window.sessionStorage;

const joinLocationParts = (location: LocationLike): string =>
  `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`;

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

export const sanitizeReturnTo = (value: string | null | undefined): string | null => {
  if (!value || value.length === 0) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  if (value.startsWith("/login")) {
    return null;
  }

  return value;
};

export const getCurrentAppPath = (location: LocationLike): string =>
  sanitizeReturnTo(joinLocationParts(location)) ?? "/library";

export const getLoginPath = (input?: {
  returnTo?: string | null;
}): string => {
  const returnTo = sanitizeReturnTo(input?.returnTo ?? null);

  if (!returnTo) {
    return "/login";
  }

  const params = new URLSearchParams();
  params.set(returnToSearchParam, returnTo);

  return `/login?${params.toString()}`;
};

export const getReturnToPath = (search: string): string | null =>
  sanitizeReturnTo(new URLSearchParams(search).get(returnToSearchParam));

export const resolvePostAuthPath = (input?: {
  search?: string;
  storage?: StorageLike | null;
}): string =>
  getReturnToPath(input?.search ?? "") ?? getPostAuthPath(input?.storage);
