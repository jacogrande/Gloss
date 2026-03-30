import type { ServerEnv } from "@gloss/shared/env";
import {
  reviewRecognitionFreshSentenceModelOutputJsonSchema,
  reviewRecognitionFreshSentenceModelOutputSchema,
} from "@gloss/shared/contracts";
import {
  reviewProviderError,
  reviewSchemaInvalidError,
} from "@gloss/shared/errors";
import type {
  ReviewAnswerKey,
  ReviewCardPromptPayload,
  SeedDetail,
} from "@gloss/shared/types";
import { ZodError } from "zod";

import {
  buildDeterministicRecognitionCardDraft,
  reviewCardPromptTemplateVersion,
  type ReviewCardTraceDraft,
} from "./review-contracts";

type OpenAIResponseContent = {
  text?: string;
  type?: string;
};

type OpenAIResponseOutputItem = {
  content?: OpenAIResponseContent[];
};

type OpenAIResponseBody = {
  error?: {
    code?: string;
    message?: string;
    param?: string;
    type?: string;
  };
  output?: OpenAIResponseOutputItem[];
  output_text?: string;
};

export type GeneratedRecognitionCard = {
  answerKey: ReviewAnswerKey;
  promptPayload: Extract<
    ReviewCardPromptPayload,
    {
      type: "recognition_in_fresh_sentence";
    }
  >;
  trace: ReviewCardTraceDraft;
};

export type ReviewModelProvider = {
  generateRecognitionFreshSentenceCard: (
    seed: SeedDetail,
  ) => Promise<GeneratedRecognitionCard>;
  model: string;
  provider: string;
};

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
  const detailSegments = [
    body?.error?.type,
    body?.error?.code,
    body?.error?.param,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  throw reviewProviderError(
    [
      `${providerName} request failed with status ${response.status}.`,
      detailSegments.length > 0 ? `Details: ${detailSegments.join(" / ")}.` : null,
      body?.error?.message ? `Message: ${body.error.message}` : null,
    ]
      .filter((value): value is string => value !== null)
      .join(" "),
  );
};

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

const toReviewProviderError = (
  error: unknown,
): ReturnType<typeof reviewProviderError | typeof reviewSchemaInvalidError> => {
  if (error instanceof ZodError) {
    return reviewSchemaInvalidError(
      error.issues
        .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
        .join("; "),
    );
  }

  if (error instanceof Error) {
    return reviewProviderError(error.message);
  }

  return reviewProviderError("An unexpected review generation error occurred.");
};

const createDeveloperInstruction = (): string =>
  "Create one recognition-in-a-fresh-sentence review card for an advanced-reader vocabulary app. Return strict JSON only. The sentence must be new, concise, adult, and plausible. Do not repeat the captured sentence. Provide exactly one correct choice and 2 or 3 total choices. Wrong choices should be plausible enough to test meaning, but should not be absurd.";

const createUserInstructionPayload = (
  seed: SeedDetail,
): Record<string, unknown> => ({
  lexical_scaffolding: {
    contrastive_word: seed.enrichment?.payload?.contrastiveWord ?? null,
    gloss: seed.enrichment?.payload?.gloss ?? null,
    register_note: seed.enrichment?.payload?.registerNote ?? null,
    related_word: seed.enrichment?.payload?.relatedWord ?? null,
  },
  prompt_template_version: reviewCardPromptTemplateVersion,
  rules: {
    avoid_verbatim_capture_sentence: true,
    keep_sentence_under_characters: 220,
    only_one_correct_choice: true,
    output_schema: "review-recognition-fresh-sentence.v1",
  },
  task: "Create one recognition_in_fresh_sentence review card.",
  word_seed: {
    captured_sentence: seed.primarySentence,
    source_title: seed.source?.title ?? null,
    word: seed.word,
  },
});

const createAcceptedTrace = (input: {
  inputRedacted: Record<string, unknown> | null;
  outputRedacted: Record<string, unknown>;
}): ReviewCardTraceDraft => ({
  inputRedacted: input.inputRedacted,
  outputRedacted: input.outputRedacted,
  validationResult: {
    accepted: true,
    issues: [],
  },
});

const createFixtureReviewModelProvider = (): ReviewModelProvider => ({
  generateRecognitionFreshSentenceCard(seed) {
    const draft = buildDeterministicRecognitionCardDraft(seed);
    const developerInstruction = createDeveloperInstruction();
    const userInstruction = createUserInstructionPayload(seed);

    return Promise.resolve({
      answerKey: draft.answerKey,
      promptPayload: draft.promptPayload,
      trace: createAcceptedTrace({
        inputRedacted: {
          developerInstruction,
          userInstruction,
        },
        outputRedacted: draft.trace.outputRedacted,
      }),
    });
  },
  model: "fixture-review-cards-v1",
  provider: "fixture",
});

const createLiveReviewModelProvider = (env: ServerEnv): ReviewModelProvider => ({
  async generateRecognitionFreshSentenceCard(seed) {
    const timeoutMs = 12_000;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    const developerInstruction = createDeveloperInstruction();
    const userInstructionPayload = createUserInstructionPayload(seed);

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        body: JSON.stringify({
          input: [
            {
              content: [
                {
                  text: developerInstruction,
                  type: "input_text",
                },
              ],
              role: "developer",
            },
            {
              content: [
                {
                  text: JSON.stringify(userInstructionPayload, null, 2),
                  type: "input_text",
                },
              ],
              role: "user",
            },
          ],
          model: env.OPENAI_MODEL,
          text: {
            format: {
              name: "review_recognition_fresh_sentence",
              schema: reviewRecognitionFreshSentenceModelOutputJsonSchema,
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
        signal: controller.signal,
      });

      await ensureResponseOk(response, "OpenAI Responses");

      const body = (await response.json()) as OpenAIResponseBody;
      const outputText = extractOutputText(body);

      if (!outputText) {
        throw reviewProviderError(
          "OpenAI Responses returned no readable structured output.",
        );
      }

      const parsed = reviewRecognitionFreshSentenceModelOutputSchema.parse(
        JSON.parse(outputText) as unknown,
      );

      return {
        answerKey: {
          correctChoiceId: parsed.correctChoiceId,
        },
        promptPayload: parsed.promptPayload,
        trace: createAcceptedTrace({
          inputRedacted: {
            developerInstruction,
            userInstruction: userInstructionPayload,
          },
          outputRedacted: parsed,
        }),
      };
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "AbortError" ||
          /aborted|timed out/iu.test(error.message))
      ) {
        throw reviewProviderError(
          `OpenAI Responses timed out after ${timeoutMs}ms.`,
        );
      }

      throw toReviewProviderError(error);
    } finally {
      clearTimeout(timeout);
    }
  },
  model: env.OPENAI_MODEL,
  provider: "openai.responses",
});

export const createReviewModelProvider = (
  env: ServerEnv,
): ReviewModelProvider =>
  env.ENRICHMENT_PROVIDER_MODE === "live"
    ? createLiveReviewModelProvider(env)
    : createFixtureReviewModelProvider();
