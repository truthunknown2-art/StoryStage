import type { RegistrationReviewPresentation } from "./presentation-model";

/**
 * Narrow, read-only host contract: the app root accepts exactly one optional
 * presentation model. No artifact means the polished empty state — never a
 * silent fallback to sample evidence.
 */
export interface RegistrationReviewHost {
  loadPresentation(): Promise<RegistrationReviewPresentation | null>;
}

/** Default host: no host-verified artifact supplied. */
export const emptyRegistrationReviewHost: RegistrationReviewHost = {
  loadPresentation: async () => null,
};

/** Explicit test/development-fixture host, used only by the dev entry/tests. */
export const fixtureRegistrationReviewHost = (
  fixture: RegistrationReviewPresentation,
): RegistrationReviewHost => ({
  loadPresentation: async () => ({ ...fixture, isTestFixture: true }),
});
