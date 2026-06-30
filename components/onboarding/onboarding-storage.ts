export const ONBOARDING_PUBLIC_LINK_KEY =
  "vitriny-onboarding-public-link-used";

export function onboardingStorageKey(key: string, storageScope: string) {
  return `${key}:${storageScope}`;
}

export function markPublicLinkUsed(storageScope: string) {
  localStorage.setItem(
    onboardingStorageKey(ONBOARDING_PUBLIC_LINK_KEY, storageScope),
    "1"
  );
  window.dispatchEvent(new Event("vitriny:onboarding-updated"));
}

