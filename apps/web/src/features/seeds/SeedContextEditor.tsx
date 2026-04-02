import {
  useEffect,
  useState,
  type FormEvent,
  type JSX,
} from "react";

import type {
  SeedDetail,
  SourceKind,
} from "@gloss/shared/types";

import {
  hasSeedContextChanges,
  toUpdateSeedInput,
  type SeedContextFormValues,
} from "./capture-form-values";
import { getSeedContextSourceToggleLabel } from "./seed-presenters";
import {
  clearSeedContextDraft,
  readSeedContextDraft,
  writeSeedContextDraft,
} from "./seed-context-draft";

type SeedContextEditorProps = {
  errorMessage: string | null;
  helperMessage: string;
  isPending: boolean;
  statusMessage: string | null;
  onSubmit: (value: ReturnType<typeof toUpdateSeedInput>) => void;
  sentenceLabel?: string;
  sentencePlaceholder: string;
  seed: Pick<SeedDetail, "id" | "primarySentence" | "source">;
  title: string;
};

const sourceKindOptions: SourceKind[] = [
  "article",
  "book",
  "manual",
  "other",
];

const toInitialValues = (
  seed: Pick<SeedDetail, "primarySentence" | "source">,
): SeedContextFormValues => ({
  sentence: seed.primarySentence ?? "",
  sourceAuthor: seed.source?.author ?? "",
  sourceKind: seed.source?.kind ?? "article",
  sourceTitle: seed.source?.title ?? "",
  sourceUrl: seed.source?.url ?? "",
});

const hasSourceValues = (values: SeedContextFormValues): boolean =>
  Boolean(values.sourceAuthor || values.sourceTitle || values.sourceUrl);

const hasAnyContextValues = (values: SeedContextFormValues): boolean =>
  Boolean(values.sentence.trim()) || hasSourceValues(values);

export const SeedContextEditor = ({
  errorMessage,
  helperMessage,
  isPending,
  statusMessage,
  onSubmit,
  sentenceLabel = "Sentence (optional)",
  sentencePlaceholder,
  seed,
  title,
}: SeedContextEditorProps): JSX.Element => {
  const [values, setValues] = useState<SeedContextFormValues>(() =>
    readSeedContextDraft(seed.id)?.values ?? toInitialValues(seed),
  );
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [isSourceOpen, setIsSourceOpen] = useState(() =>
    readSeedContextDraft(seed.id)?.isSourceOpen ?? hasSourceValues(toInitialValues(seed)),
  );
  const hasChanges = hasSeedContextChanges(values, seed);

  useEffect(() => {
    const nextValues = toInitialValues(seed);
    const draft = readSeedContextDraft(seed.id);

    setValues(draft?.values ?? nextValues);
    setIsSourceOpen(draft?.isSourceOpen ?? hasSourceValues(nextValues));
    setLocalErrorMessage(null);
  }, [
    seed.id,
    seed.primarySentence,
    seed.source?.author,
    seed.source?.id,
    seed.source?.kind,
    seed.source?.title,
    seed.source?.url,
  ]);

  useEffect(() => {
    if (hasSeedContextChanges(values, seed)) {
      writeSeedContextDraft(seed.id, {
        isSourceOpen,
        values,
      });
      return;
    }

    clearSeedContextDraft(seed.id);
  }, [isSourceOpen, seed, values]);

  const updateField = <TField extends keyof SeedContextFormValues>(
    field: TField,
    value: SeedContextFormValues[TField],
  ): void => {
    setLocalErrorMessage(null);
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (!hasAnyContextValues(values)) {
      setLocalErrorMessage("Add a sentence or source detail first.");
      return;
    }

    if (!hasChanges) {
      setLocalErrorMessage("Update the sentence or source details first.");
      return;
    }

    onSubmit(toUpdateSeedInput(values, seed));
  };

  return (
    <section className="panel panel--compact seed-detail__recovery">
      <div className="panel__header">
        <h2>{title}</h2>
      </div>

      <form className="capture-form capture-form--recovery" onSubmit={handleSubmit}>
        <label className="capture-form__field">
          <span>{sentenceLabel}</span>
          <textarea
            name="sentence"
            onChange={(event) => {
              updateField("sentence", event.target.value);
            }}
            placeholder={sentencePlaceholder}
            rows={4}
            value={values.sentence}
          />
        </label>

        <details
          className="capture-form__details"
          onToggle={(event) => {
            setIsSourceOpen(event.currentTarget.open);
          }}
          open={isSourceOpen}
        >
          <summary>
            {getSeedContextSourceToggleLabel({
              hasSourceValues: hasSourceValues(values),
              isSourceOpen,
            })}
          </summary>

          <div className="capture-form__source-grid">
            <label className="capture-form__field">
              <span>Source type</span>
              <select
                name="sourceKind"
                onChange={(event) => {
                  updateField("sourceKind", event.target.value as SourceKind);
                }}
                value={values.sourceKind}
              >
                {sourceKindOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="capture-form__field">
              <span>Source title</span>
              <input
                name="sourceTitle"
                onChange={(event) => {
                  updateField("sourceTitle", event.target.value);
                }}
                placeholder="Collected Essays"
                value={values.sourceTitle}
              />
            </label>

            <label className="capture-form__field">
              <span>Author</span>
              <input
                name="sourceAuthor"
                onChange={(event) => {
                  updateField("sourceAuthor", event.target.value);
                }}
                placeholder="A. Reader"
                value={values.sourceAuthor}
              />
            </label>

            <label className="capture-form__field">
              <span>URL</span>
              <input
                name="sourceUrl"
                onChange={(event) => {
                  updateField("sourceUrl", event.target.value);
                }}
                placeholder="https://example.com/essay"
                type="url"
                value={values.sourceUrl}
              />
            </label>
          </div>
        </details>

        <p className="capture-form__hint">{helperMessage}</p>
        {statusMessage ? <p className="capture-form__hint">{statusMessage}</p> : null}
        {localErrorMessage ? (
          <p className="capture-form__error" role="alert">
            {localErrorMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="capture-form__error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="capture-form__actions">
          <button
            className="capture-form__submit"
            disabled={isPending || !hasAnyContextValues(values) || !hasChanges}
            type="submit"
          >
            {isPending ? "Saving..." : "Save context"}
          </button>
        </div>
      </form>
    </section>
  );
};
