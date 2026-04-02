export const apiErrorCodeValues = [
  "AUTH_UNAUTHORIZED",
  "CONFLICT",
  "ENRICHMENT_CONFLICT",
  "ENRICHMENT_EVIDENCE_UNAVAILABLE",
  "ENRICHMENT_PROVIDER_ERROR",
  "ENRICHMENT_SCHEMA_INVALID",
  "INTERNAL_ERROR",
  "NOT_FOUND",
  "RATE_LIMITED",
  "REVIEW_CONFLICT",
  "REVIEW_PROVIDER_ERROR",
  "REVIEW_SCHEMA_INVALID",
  "VALIDATION_ERROR",
] as const;

export const authMethodValues = ["email_password"] as const;

export const seedStageValues = [
  "new",
  "stabilizing",
  "deepening",
  "mature",
] as const;

export const sourceKindValues = [
  "manual",
  "article",
  "book",
  "other",
] as const;

export const seedContextKindValues = ["sentence"] as const;

export const seedEnrichmentStatusValues = [
  "pending",
  "ready",
  "failed",
] as const;

export const seedEnrichmentGuardrailFlagValues = [
  "contrast_omitted_weak_evidence",
  "morphology_omitted_weak_evidence",
  "register_omitted_weak_evidence",
  "related_omitted_weak_evidence",
] as const;

export const reviewDimensionValues = [
  "recognition",
  "distinction",
  "usage",
] as const;

export const reviewExerciseTypeValues = [
  "meaning_in_context",
  "recognition_in_fresh_sentence",
  "cloze_recall",
  "contrastive_choice",
  "register_judgment",
] as const;

export const reviewCardStatusValues = [
  "pending",
  "answered",
  "skipped",
] as const;

export const reviewSessionStatusValues = [
  "active",
  "completed",
  "abandoned",
] as const;

export const reviewGenerationSourceValues = [
  "template",
  "model",
] as const;

export const reviewOutcomeValues = [
  "correct",
  "incorrect",
  "partial",
  "skipped",
] as const;

export const productEventTypeValues = [
  "auth.sign_in",
  "auth.sign_in_failed",
  "auth.sign_up",
  "review.card.submitted",
  "review.session.completed",
  "review.session.started",
  "seed.capture",
  "seed.enrichment.failed",
  "seed.enrichment.ready",
  "seed.enrichment.requested",
] as const;
