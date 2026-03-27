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
});
