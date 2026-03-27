import type { ServerEnv } from "@gloss/shared/env";
import {
  seedEnrichmentPayloadJsonSchema,
  seedEnrichmentPayloadSchema,
} from "@gloss/shared/contracts";
import type { SeedEnrichmentPayload } from "@gloss/shared/types";
import {
  enrichmentProviderError,
} from "@gloss/shared/errors";

import type {
  EnrichmentPromptInput,
} from "./enrichment-contracts";
import { normalizeWord } from "./seed-contracts";

type DictionaryEntry = {
  exampleSentences: string[];
  glosses: string[];
  lemma: string;
  morphologyHints: string[];
  partOfSpeech: string | null;
  registerLabels: string[];
};

type RelationCandidates = {
  contrastCandidates: string[];
  relatedCandidates: string[];
};

type FixtureEntry = {
  dictionary: DictionaryEntry;
  modelPayload: SeedEnrichmentPayload;
  relations: RelationCandidates;
};

type MerriamDictionaryEntry = {
  def?: Array<{
    sseq?: unknown[];
  }>;
  fl?: string;
  hwi?: {
    hw?: string;
  };
  meta?: {
    id?: string;
  };
  shortdef?: string[];
};

type MerriamThesaurusEntry = {
  meta?: {
    ants?: string[][];
    syns?: string[][];
  };
};

type DatamuseEntry = {
  word?: string;
};

type OpenAIResponseContent = {
  refusal?: string;
  text?: string;
  type?: string;
};

type OpenAIResponseOutputItem = {
  content?: OpenAIResponseContent[];
};

type OpenAIResponseBody = {
  error?: {
    message?: string;
  };
  output?: OpenAIResponseOutputItem[];
  output_text?: string;
  status?: string;
};

export type EnrichmentModelProvider = {
  generate: (input: EnrichmentPromptInput) => Promise<SeedEnrichmentPayload>;
  model: string;
  provider: string;
};

export type LexicalEvidenceProvider = {
  getDictionaryEntry: (word: string) => Promise<DictionaryEntry | null>;
  getRelationCandidates: (word: string) => Promise<RelationCandidates>;
};

export type EnrichmentProviders = {
  lexicalEvidenceProvider: LexicalEvidenceProvider;
  modelProvider: EnrichmentModelProvider;
};

const fixtureEntries: Record<string, FixtureEntry> = {
  fastidious: {
    dictionary: {
      exampleSentences: [
        "She remained fastidious about the cadence of every sentence.",
      ],
      glosses: [
        "very attentive to detail and hard to please when standards matter",
      ],
      lemma: "fastidious",
      morphologyHints: [
        "The suffix -ious helps mark the word as an adjective describing a quality.",
      ],
      partOfSpeech: "adjective",
      registerLabels: ["formal"],
    },
    modelPayload: {
      contrastiveWord: {
        note: "Slack or careless suggests a lack of precision, not a high standard.",
        word: "careless",
      },
      gloss:
        "In this kind of context, it describes someone exacting about detail and quality.",
      morphologyNote: {
        note: "The suffix -ious signals an adjective describing a sustained trait.",
      },
      registerNote:
        "It usually sounds more formal and exacting than everyday words like picky.",
      relatedWord: {
        note: "Both words suggest careful attention to detail.",
        word: "meticulous",
      },
    },
    relations: {
      contrastCandidates: ["careless", "slovenly"],
      relatedCandidates: ["meticulous", "exacting"],
    },
  },
  lapidary: {
    dictionary: {
      exampleSentences: [
        "The critic praised the essay for its lapidary close.",
      ],
      glosses: [
        "expressed with polished brevity and precision",
      ],
      lemma: "lapidary",
      morphologyHints: [
        "The ending -ary marks it as an adjective naming a style or quality.",
      ],
      partOfSpeech: "adjective",
      registerLabels: ["literary", "formal"],
    },
    modelPayload: {
      contrastiveWord: {
        note: "Verbose prose expands where lapidary prose compresses.",
        word: "verbose",
      },
      gloss:
        "Here it means the prose is compressed, polished, and precise rather than merely short.",
      morphologyNote: {
        note: "The ending -ary helps turn the base into an adjective describing a style.",
      },
      registerNote:
        "It belongs to a literary or critical register, not to casual everyday speech.",
      relatedWord: {
        note: "Both can praise concise expression, though lapidary sounds more polished.",
        word: "concise",
      },
    },
    relations: {
      contrastCandidates: ["verbose", "diffuse"],
      relatedCandidates: ["concise", "terse"],
    },
  },
  numinous: {
    dictionary: {
      exampleSentences: [
        "The chapel retained a numinous stillness after the visitors left.",
      ],
      glosses: [
        "having a strong sense of the spiritual or mysterious",
      ],
      lemma: "numinous",
      morphologyHints: [],
      partOfSpeech: "adjective",
      registerLabels: [],
    },
    modelPayload: {
      contrastiveWord: {
        note: "Ordinary experience lacks the charged sacred feeling that numinous suggests.",
        word: "ordinary",
      },
      gloss:
        "It suggests an atmosphere charged with spiritual or mysterious significance.",
      morphologyNote: {
        note: "The suffix -ous often forms adjectives that describe a quality or atmosphere.",
      },
      registerNote:
        "It often appears in reflective or scholarly writing about religion, art, or feeling.",
      relatedWord: {
        note: "Both words point toward awe and felt mystery.",
        word: "awe",
      },
    },
    relations: {
      contrastCandidates: [],
      relatedCandidates: [],
    },
  },
  pellucid: {
    dictionary: {
      exampleSentences: [
        "Her explanation remained pellucid even as the discussion became technical.",
      ],
      glosses: [
        "clear and easy to understand",
      ],
      lemma: "pellucid",
      morphologyHints: [
        "The root links the word to ideas of brightness and clarity.",
      ],
      partOfSpeech: "adjective",
      registerLabels: ["formal"],
    },
    modelPayload: {
      contrastiveWord: {
        note: "Opaque language hides the meaning that pellucid language makes plain.",
        word: "opaque",
      },
      gloss:
        "In this sentence, it means the explanation was strikingly clear and easy to follow.",
      morphologyNote: {
        note: "The word is built around a root associated with brightness or shining clarity.",
      },
      registerNote:
        "It is more formal and literary than everyday words like clear.",
      relatedWord: {
        note: "Both words praise clarity, though pellucid can sound a bit more elevated.",
        word: "lucid",
      },
    },
    relations: {
      contrastCandidates: ["opaque", "murky"],
      relatedCandidates: ["lucid", "transparent"],
    },
  },
  sesquipedalian: {
    dictionary: {
      exampleSentences: [
        "His sesquipedalian answer impressed nobody in the room.",
      ],
      glosses: [
        "using long words or characterized by them",
      ],
      lemma: "sesquipedalian",
      morphologyHints: [
        "The adjective is built around a learned base and an adjectival ending.",
      ],
      partOfSpeech: "adjective",
      registerLabels: ["formal"],
    },
    modelPayload: {
      contrastiveWord: {
        note: "Plain speech avoids the showy length suggested by sesquipedalian.",
        word: "plain",
      },
      gloss:
        "It describes language that uses long, elaborate words rather than simple ones.",
      morphologyNote: {
        note: "It is a learned adjective whose length itself reinforces the idea it names.",
      },
      registerNote:
        "It usually appears in humorous, critical, or formal discussion of style.",
      relatedWord: {
        note: "Both can describe language that sounds elevated or bookish.",
        word: "grandiloquent",
      },
    },
    relations: {
      contrastCandidates: ["plain", "simple"],
      relatedCandidates: ["grandiloquent", "polysyllabic"],
    },
  },
};

const dedupeWords = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const normalized = normalizeWord(value);

    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(value.trim());
  }

  return deduped;
};

const findFixtureEntry = (word: string): FixtureEntry | null =>
  fixtureEntries[normalizeWord(word)] ?? null;

const createFixtureLexicalEvidenceProvider = (): LexicalEvidenceProvider => ({
  getDictionaryEntry(word) {
    const entry = findFixtureEntry(word);

    return Promise.resolve(entry ? entry.dictionary : null);
  },
  getRelationCandidates(word) {
    const entry = findFixtureEntry(word);

    return Promise.resolve(
      entry
        ? entry.relations
        : {
            contrastCandidates: [],
            relatedCandidates: [],
          },
    );
  },
});

const createFixtureModelProvider = (): EnrichmentModelProvider => ({
  generate(input) {
    const parsedPrompt = JSON.parse(input.userInstruction) as {
      seed_capture_context?: {
        word?: string;
      };
    };
    const word = parsedPrompt.seed_capture_context?.word;
    const matchingEntry = word ? findFixtureEntry(word) : null;

    if (!matchingEntry) {
      throw enrichmentProviderError(
        "Fixture enrichment is unavailable for the requested seed.",
      );
    }

    return Promise.resolve(
      seedEnrichmentPayloadSchema.parse(matchingEntry.modelPayload),
    );
  },
  model: "fixture-seed-enrichment-v1",
  provider: "fixture",
});

const ensureResponseOk = async (
  response: Response,
  providerName: string,
): Promise<void> => {
  if (response.ok) {
    return;
  }

  const body = (await response.json().catch(() => null)) as
    | OpenAIResponseBody
    | null;
  const message =
    body?.error?.message ??
    `The ${providerName} request failed with status ${response.status}.`;

  throw enrichmentProviderError(message);
};

const parseDictionaryEntries = (
  value: unknown,
): MerriamDictionaryEntry[] =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is MerriamDictionaryEntry =>
          typeof entry === "object" && entry !== null,
      )
    : [];

const parseThesaurusEntries = (
  value: unknown,
): MerriamThesaurusEntry[] =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is MerriamThesaurusEntry =>
          typeof entry === "object" && entry !== null,
      )
    : [];

const stripMerriamHeadword = (value: string): string =>
  value.replace(/\*/g, "");

const createLiveLexicalEvidenceProvider = (
  env: ServerEnv,
): LexicalEvidenceProvider => ({
  async getDictionaryEntry(word) {
    const url = new URL(
      `/api/v3/references/collegiate/json/${encodeURIComponent(word)}`,
      "https://www.dictionaryapi.com",
    );

    url.searchParams.set("key", env.MERRIAM_WEBSTER_DICTIONARY_API_KEY ?? "");

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });

    await ensureResponseOk(response, "Merriam-Webster dictionary");

    const entries = parseDictionaryEntries((await response.json()) as unknown);
    const firstEntry = entries.find(
      (entry) => Array.isArray(entry.shortdef) && entry.shortdef.length > 0,
    );

    if (!firstEntry?.shortdef?.length) {
      return null;
    }

    return {
      exampleSentences: [],
      glosses: firstEntry.shortdef,
      lemma: stripMerriamHeadword(
        firstEntry.hwi?.hw ?? firstEntry.meta?.id ?? word,
      ),
      morphologyHints: [],
      partOfSpeech: firstEntry.fl ?? null,
      registerLabels: [],
    };
  },
  async getRelationCandidates(word) {
    const thesaurusUrl = new URL(
      `/api/v3/references/thesaurus/json/${encodeURIComponent(word)}`,
      "https://www.dictionaryapi.com",
    );

    thesaurusUrl.searchParams.set(
      "key",
      env.MERRIAM_WEBSTER_THESAURUS_API_KEY ?? "",
    );

    const datamuseRelatedUrl = new URL("https://api.datamuse.com/words");

    datamuseRelatedUrl.searchParams.set("rel_syn", word);
    datamuseRelatedUrl.searchParams.set("max", "6");

    const datamuseContrastUrl = new URL("https://api.datamuse.com/words");

    datamuseContrastUrl.searchParams.set("rel_ant", word);
    datamuseContrastUrl.searchParams.set("max", "6");

    const [thesaurusResponse, relatedResponse, contrastResponse] =
      await Promise.all([
        fetch(thesaurusUrl, {
          headers: {
            accept: "application/json",
          },
        }),
        fetch(datamuseRelatedUrl, {
          headers: {
            accept: "application/json",
          },
        }),
        fetch(datamuseContrastUrl, {
          headers: {
            accept: "application/json",
          },
        }),
      ]);

    await Promise.all([
      ensureResponseOk(thesaurusResponse, "Merriam-Webster thesaurus"),
      ensureResponseOk(relatedResponse, "Datamuse related"),
      ensureResponseOk(contrastResponse, "Datamuse contrast"),
    ]);

    const thesaurusEntries = parseThesaurusEntries(
      (await thesaurusResponse.json()) as unknown,
    );
    const firstThesaurusEntry = thesaurusEntries[0];
    const relatedJson = (await relatedResponse.json()) as unknown;
    const contrastJson = (await contrastResponse.json()) as unknown;
    const datamuseRelated = Array.isArray(relatedJson)
      ? relatedJson
          .map((entry) => (entry as DatamuseEntry).word)
          .filter((value): value is string => typeof value === "string")
      : [];
    const datamuseContrast = Array.isArray(contrastJson)
      ? contrastJson
          .map((entry) => (entry as DatamuseEntry).word)
          .filter((value): value is string => typeof value === "string")
      : [];

    return {
      contrastCandidates: dedupeWords([
        ...(firstThesaurusEntry?.meta?.ants?.flat() ?? []),
        ...datamuseContrast,
      ]),
      relatedCandidates: dedupeWords([
        ...(firstThesaurusEntry?.meta?.syns?.flat() ?? []),
        ...datamuseRelated,
      ]),
    };
  },
});

const extractOutputText = (body: OpenAIResponseBody): string | null => {
  if (typeof body.output_text === "string" && body.output_text.length > 0) {
    return body.output_text;
  }

  for (const item of body.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string" && content.text.length > 0) {
        return content.text;
      }
    }
  }

  return null;
};

const createLiveModelProvider = (env: ServerEnv): EnrichmentModelProvider => ({
  async generate(input) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input: [
          {
            content: [
              {
                text: input.developerInstruction,
                type: "input_text",
              },
            ],
            role: "developer",
          },
          {
            content: [
              {
                text: input.userInstruction,
                type: "input_text",
              },
            ],
            role: "user",
          },
        ],
        model: env.OPENAI_MODEL,
        text: {
          format: {
            name: "seed_enrichment_payload",
            schema: seedEnrichmentPayloadJsonSchema,
            strict: true,
            type: "json_schema",
          },
        },
      }),
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      method: "POST",
    });

    await ensureResponseOk(response, "OpenAI Responses");

    const body = (await response.json()) as OpenAIResponseBody;
    const outputText = extractOutputText(body);

    if (!outputText) {
      throw enrichmentProviderError(
        "OpenAI Responses returned no readable structured output.",
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(outputText) as unknown;
    } catch {
      throw enrichmentProviderError(
        "OpenAI Responses returned non-JSON structured output.",
      );
    }

    return seedEnrichmentPayloadSchema.parse(parsed);
  },
  model: env.OPENAI_MODEL,
  provider: "openai.responses",
});

export const createEnrichmentProviders = (
  env: ServerEnv,
): EnrichmentProviders =>
  env.ENRICHMENT_PROVIDER_MODE === "live"
    ? {
        lexicalEvidenceProvider: createLiveLexicalEvidenceProvider(env),
        modelProvider: createLiveModelProvider(env),
      }
    : {
        lexicalEvidenceProvider: createFixtureLexicalEvidenceProvider(),
        modelProvider: createFixtureModelProvider(),
      };
