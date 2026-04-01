type SourceKind = "article" | "book" | "manual" | "other";

type FuzzSourceFixture = {
  author: string;
  kind: SourceKind;
  title: string;
  url?: string;
};

type FuzzWordFixture = {
  sentence: string;
  word: string;
};

export type BrowserJourneyId =
  | "unauthenticated_protected_entry"
  | "sign_up_onboarding_handoff"
  | "empty_library_recovery"
  | "capture_submission"
  | "populated_library_browse"
  | "seed_detail_handoff"
  | "seed_detail_ready"
  | "weak_evidence_recovery"
  | "review_queue"
  | "active_review_feedback"
  | "review_completion"
  | "forced_reauth_deep_link";

export type BrowserJourneyDefinition = {
  description: string;
  id: BrowserJourneyId;
  title: string;
};

export type BrowserJourneyFuzzProfile = {
  email: string;
  emptyLibraryCtaLabel: string;
  knownWord: FuzzWordFixture;
  name: string;
  protectedReturnTo: "/library" | "/review";
  secondaryKnownWord: FuzzWordFixture;
  source: FuzzSourceFixture;
  stageFilter: "all" | "new";
  unknownWord: FuzzWordFixture;
};

const browserJourneys: BrowserJourneyDefinition[] = [
  {
    description: "Direct protected entry redirects into login with a safe return path.",
    id: "unauthenticated_protected_entry",
    title: "Unauthenticated protected entry",
  },
  {
    description: "New users should land on capture even when they came from a protected deep link.",
    id: "sign_up_onboarding_handoff",
    title: "Sign-up onboarding handoff",
  },
  {
    description: "A brand-new user should see an actionable empty library state.",
    id: "empty_library_recovery",
    title: "Empty library recovery",
  },
  {
    description: "Capture should save a word with lightweight optional source details.",
    id: "capture_submission",
    title: "Capture submission",
  },
  {
    description: "A user with saved words should be able to browse the library and open a seed.",
    id: "populated_library_browse",
    title: "Populated library browse",
  },
  {
    description: "The immediate handoff after capture should land on seed detail with a saved-state cue.",
    id: "seed_detail_handoff",
    title: "Seed detail handoff",
  },
  {
    description: "A ready seed detail page should show context, definition, and next actions.",
    id: "seed_detail_ready",
    title: "Ready seed detail",
  },
  {
    description: "A weak-evidence seed should offer context recovery instead of a dead end.",
    id: "weak_evidence_recovery",
    title: "Weak-evidence recovery",
  },
  {
    description: "The review queue should explain what is due and how to start.",
    id: "review_queue",
    title: "Review queue",
  },
  {
    description: "Submitting a review card should show explicit feedback before advancing.",
    id: "active_review_feedback",
    title: "Active review feedback",
  },
  {
    description: "A short review session should end in an explicit completion state.",
    id: "review_completion",
    title: "Review completion",
  },
  {
    description: "Losing auth on a protected deep link should return the user to the intended page after sign-in.",
    id: "forced_reauth_deep_link",
    title: "Forced re-auth deep link",
  },
];

const knownWordFixtures: FuzzWordFixture[] = [
  {
    sentence: "Her explanation was pellucid even under pressure.",
    word: "pellucid",
  },
  {
    sentence: "The prose became unexpectedly lapidary by the final chapter.",
    word: "lapidary",
  },
  {
    sentence: "The chapel felt numinous in the evening light.",
    word: "numinous",
  },
  {
    sentence: "She remained fastidious about the archival notes.",
    word: "fastidious",
  },
  {
    sentence: "The review drifted into sesquipedalian flourishes.",
    word: "sesquipedalian",
  },
];

const unknownWordFixtures: FuzzWordFixture[] = [
  {
    sentence: "The room felt austere but calm.",
    word: "austere",
  },
  {
    sentence: "His reply stayed laconic even under pressure.",
    word: "laconic",
  },
  {
    sentence: "The policy sounded recondite to most readers.",
    word: "recondite",
  },
];

const sourceFixtures: FuzzSourceFixture[] = [
  {
    author: "A. Reader",
    kind: "book",
    title: "Collected Notes",
  },
  {
    author: "M. Essayist",
    kind: "article",
    title: "On Precision",
    url: "https://example.com/on-precision",
  },
  {
    author: "T. Editor",
    kind: "manual",
    title: "Field Guide",
    url: "https://example.com/field-guide",
  },
  {
    author: "Gloss Archive",
    kind: "other",
    title: "Reference Slip",
  },
];

const emptyLibraryCtaLabels = [
  "Capture your first word",
  "Save your first word",
] as const;

const hashString = (value: string): number => {
  let hash = 2_166_136_261;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
};

const createSeededRandom = (seed: string): (() => number) => {
  let state = hashString(seed);

  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);

    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const pickOne = <TValue,>(
  random: () => number,
  values: readonly TValue[],
): TValue => values[Math.floor(random() * values.length)] ?? values[0]!;

const pickDifferentWord = (
  random: () => number,
  currentWord: string,
): FuzzWordFixture => {
  const candidates = knownWordFixtures.filter((fixture) => fixture.word !== currentWord);

  return pickOne(random, candidates);
};

export const browserJourneyDefinitions = browserJourneys;

export const buildBrowserJourneyFuzzProfile = (
  journeyId: BrowserJourneyId,
): BrowserJourneyFuzzProfile => {
  const random = createSeededRandom(`browser-journey:${journeyId}`);
  const knownWord = pickOne(random, knownWordFixtures);
  const protectedReturnTo = pickOne(random, ["/library", "/review"] as const);

  return {
    email: `${journeyId.replaceAll("_", "-")}@gloss.local`,
    emptyLibraryCtaLabel: pickOne(random, emptyLibraryCtaLabels),
    knownWord,
    name: journeyId
      .split("_")
      .map((segment) => `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`)
      .join(" "),
    protectedReturnTo,
    secondaryKnownWord: pickDifferentWord(random, knownWord.word),
    source: pickOne(random, sourceFixtures),
    stageFilter: pickOne(random, ["all", "new"] as const),
    unknownWord: pickOne(random, unknownWordFixtures),
  };
};
