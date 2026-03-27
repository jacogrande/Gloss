import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyEnrichmentGuardrails,
  buildEnrichmentPrompts,
  buildLexicalEvidenceSnapshot,
} from "../src/lib/enrichment-contracts";

describe("enrichment contracts", () => {
  it("dedupes evidence and removes unsupported optional fields", () => {
    const snapshot = buildLexicalEvidenceSnapshot({
      dictionary: {
        exampleSentences: ["A numinous stillness filled the chapel."],
        glosses: ["having a strong sense of the spiritual or mysterious"],
        lemma: "numinous",
        morphologyHints: [],
        partOfSpeech: "adjective",
        registerLabels: [],
      },
      relations: {
        contrastCandidates: [],
        relatedCandidates: ["awe", "awe"],
      },
      seed: {
        primarySentence: "The chapel retained a numinous stillness.",
        source: {
          author: null,
          id: "source_1",
          kind: "book",
          title: "Collected Essays",
          url: null,
        },
        word: "numinous",
      },
    });
    const guarded = applyEnrichmentGuardrails({
      payload: {
        contrastiveWord: {
          note: "Ordinary experience lacks the charged sacred quality here.",
          word: "ordinary",
        },
        gloss:
          "It suggests a setting charged with spiritual or mysterious significance.",
        morphologyNote: {
          note: "The suffix -ous often forms adjectives describing a quality.",
        },
        registerNote: "It often appears in scholarly or reflective prose.",
        relatedWord: {
          note: "Both words point toward awe and felt mystery.",
          word: "awe",
        },
      },
      seedWord: "numinous",
      snapshot,
    });

    expect(snapshot.relatedCandidates).toEqual(["awe"]);
    expect(guarded.payload.gloss).toContain("spiritual");
    expect(guarded.payload.registerNote).toBeUndefined();
    expect(guarded.payload.contrastiveWord).toBeUndefined();
    expect(guarded.payload.morphologyNote).toBeUndefined();
    expect(guarded.payload.relatedWord?.word).toBe("awe");
    expect(guarded.guardrailFlags).toEqual([
      "register_omitted_weak_evidence",
      "morphology_omitted_weak_evidence",
      "contrast_omitted_weak_evidence",
    ]);
  });

  it("drops relations that duplicate the seed word or each other", () => {
    const snapshot = buildLexicalEvidenceSnapshot({
      dictionary: {
        exampleSentences: [],
        glosses: ["clear and easy to understand"],
        lemma: "pellucid",
        morphologyHints: ["The root suggests brightness or clarity."],
        partOfSpeech: "adjective",
        registerLabels: ["formal"],
      },
      relations: {
        contrastCandidates: ["opaque"],
        relatedCandidates: ["lucid"],
      },
      seed: {
        primarySentence: "Her explanation was pellucid.",
        source: null,
        word: "pellucid",
      },
    });
    const guarded = applyEnrichmentGuardrails({
      payload: {
        contrastiveWord: {
          note: "Duplicating the related word should be stripped.",
          word: "lucid",
        },
        gloss: "It means notably clear and easy to understand.",
        morphologyNote: {
          note: "The root links the word to ideas of brightness and clarity.",
        },
        registerNote: "It sounds more elevated than plain clear.",
        relatedWord: {
          note: "Both words praise clarity.",
          word: "lucid",
        },
      },
      seedWord: "pellucid",
      snapshot,
    });

    expect(guarded.payload.relatedWord?.word).toBe("lucid");
    expect(guarded.payload.contrastiveWord).toBeUndefined();
    expect(guarded.guardrailFlags).toEqual([
      "contrast_omitted_weak_evidence",
    ]);
  });

  it("builds a deterministic prompt body with lexical evidence first", () => {
    const snapshot = buildLexicalEvidenceSnapshot({
      dictionary: {
        exampleSentences: ["Her explanation was pellucid under pressure."],
        glosses: ["clear and easy to understand"],
        lemma: "pellucid",
        morphologyHints: ["The root suggests brightness or clarity."],
        partOfSpeech: "adjective",
        registerLabels: ["formal"],
      },
      relations: {
        contrastCandidates: ["opaque"],
        relatedCandidates: ["lucid"],
      },
      seed: {
        primarySentence: "Her explanation was pellucid under pressure.",
        source: {
          author: "A. Reader",
          id: "source_2",
          kind: "book",
          title: "On Style",
          url: null,
        },
        word: "pellucid",
      },
    });
    const prompts = buildEnrichmentPrompts({
      seed: {
        primarySentence: "Her explanation was pellucid under pressure.",
        source: {
          author: "A. Reader",
          id: "source_2",
          kind: "book",
          title: "On Style",
          url: null,
        },
        word: "pellucid",
      },
      snapshot,
    });

    expect(prompts.developerInstruction).toContain("Return strict JSON");
    expect(prompts.seedWord).toBe("pellucid");
    expect(prompts.userInstruction).toContain('"lexical_evidence"');
    expect(prompts.userInstruction.indexOf('"lexical_evidence"')).toBeLessThan(
      prompts.userInstruction.indexOf('"seed_capture_context"'),
    );
  });
});
