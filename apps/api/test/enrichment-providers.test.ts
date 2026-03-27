import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { parseServerEnv } from "@gloss/shared/env";

import { createEnrichmentProviders } from "../src/lib/enrichment-providers";

const liveEnv = parseServerEnv({
  API_ORIGIN: "http://127.0.0.1:8787",
  BETTER_AUTH_SECRET: "test-secret-for-gloss",
  BETTER_AUTH_URL: "http://127.0.0.1:8787",
  DATABASE_URL: "postgresql://gloss:gloss@127.0.0.1:54329/gloss",
  ENRICHMENT_PROVIDER_MODE: "live",
  LOG_LEVEL: "error",
  MERRIAM_WEBSTER_DICTIONARY_API_KEY: "dictionary-key",
  MERRIAM_WEBSTER_THESAURUS_API_KEY: "thesaurus-key",
  NODE_ENV: "test",
  OPENAI_API_KEY: "openai-key",
  OPENAI_MODEL: "gpt-5-mini-2025-08-07",
  PORT: "8787",
  WEB_ORIGIN: "http://127.0.0.1:5173",
});

describe("enrichment providers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts live lexical evidence from Merriam and Datamuse responses", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              def: [
                {
                  sseq: [
                    [
                      [
                        "sense",
                        {
                          dt: [
                            [
                              "text",
                              "{bc}clear and easy to understand",
                            ],
                            [
                              "vis",
                              [
                                {
                                  t: "Her explanation remained {wi}pellucid{/wi} under pressure.",
                                },
                              ],
                            ],
                          ],
                          sls: ["literary"],
                        },
                      ],
                    ],
                  ],
                },
              ],
              fl: "adjective",
              hwi: {
                hw: "pel*lu*cid",
              },
              ins: [{ if: "pellucidly" }],
              lbs: ["formal"],
              meta: {
                id: "pellucid",
                stems: ["pellucid", "pellucidly"],
              },
              shortdef: ["clear and easy to understand"],
            },
          ]),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              meta: {
                ants: [["opaque"]],
                syns: [["lucid"]],
              },
            },
          ]),
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ word: "lucid" }, { word: "transparent" }])),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ word: "opaque" }, { word: "murky" }])),
      );
    const providers = createEnrichmentProviders(liveEnv);

    const dictionary = await providers.lexicalEvidenceProvider.getDictionaryEntry(
      "pellucid",
    );
    const relations =
      await providers.lexicalEvidenceProvider.getRelationCandidates("pellucid");

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(dictionary).toMatchObject({
      exampleSentences: [
        "Her explanation remained pellucid under pressure.",
      ],
      glosses: ["clear and easy to understand"],
      lemma: "pellucid",
      partOfSpeech: "adjective",
      registerLabels: ["formal", "literary"],
    });
    expect(dictionary?.morphologyHints).toEqual([
      "Merriam segments the headword as pel·lu·cid, which can help you notice the word's internal structure.",
      'Dictionary forms like "pellucidly" help anchor this word family.',
    ]);
    expect(relations).toEqual({
      contrastCandidates: ["opaque", "murky"],
      relatedCandidates: ["lucid", "transparent"],
    });
  });

  it("normalizes nullable live model output into the app payload shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            contrastiveWord: null,
            gloss: "Clear and easy to understand in this sentence.",
            morphologyNote: {
              note: "Related in form and sense to lucid.",
            },
            registerNote: null,
            relatedWord: {
              note: "Both words describe clarity of expression.",
              word: "lucid",
            },
          }),
        }),
      ),
    );
    const providers = createEnrichmentProviders(liveEnv);

    const payload = await providers.modelProvider.generate({
      developerInstruction: "Return structured output only.",
      seedWord: "pellucid",
      snapshot: {
        capturedSentencePreview: "Her explanation was pellucid even under pressure.",
        contrastCandidates: ["opaque"],
        dictionaryGlosses: ["clear and easy to understand"],
        exampleSentences: [
          "Her explanation was pellucid even under pressure.",
        ],
        lemma: "pellucid",
        morphologyHints: ["Related to lucid."],
        partOfSpeech: "adjective",
        registerLabels: [],
        relatedCandidates: ["lucid"],
        sourceSummary: {
          kind: "book",
          title: "On Style",
        },
      },
      userInstruction: "Use the supplied lexical evidence only.",
    });

    expect(payload).toEqual({
      gloss: "Clear and easy to understand in this sentence.",
      morphologyNote: {
        note: "Related in form and sense to lucid.",
      },
      relatedWord: {
        note: "Both words describe clarity of expression.",
        word: "lucid",
      },
    });
  });

  it("surfaces upstream OpenAI schema errors with provider detail", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: "invalid_json_schema",
            message: "The schema is invalid.",
            param: "text.format.schema",
            type: "invalid_request_error",
          },
        }),
        {
          status: 400,
        },
      ),
    );
    const providers = createEnrichmentProviders(liveEnv);

    await expect(
      providers.modelProvider.generate({
        developerInstruction: "Return structured output only.",
        seedWord: "pellucid",
        snapshot: {
          capturedSentencePreview: null,
          contrastCandidates: [],
          dictionaryGlosses: ["clear and easy to understand"],
          exampleSentences: [],
          lemma: "pellucid",
          morphologyHints: [],
          partOfSpeech: "adjective",
          registerLabels: [],
          relatedCandidates: [],
          sourceSummary: {
            kind: null,
            title: null,
          },
        },
        userInstruction: "Use the supplied lexical evidence only.",
      }),
    ).rejects.toThrow(
      "OpenAI Responses request failed with status 400. Details: invalid_request_error / invalid_json_schema / text.format.schema. Message: The schema is invalid.",
    );
  });
});
