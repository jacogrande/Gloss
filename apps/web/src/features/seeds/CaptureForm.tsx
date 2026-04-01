import { useState, type FormEvent, type JSX } from "react";

import type { SourceKind } from "@gloss/shared/types";

import {
  toCreateSeedInput,
  type CaptureFormValues,
} from "./capture-form-values";

type CaptureFormProps = {
  errorMessage: string | null;
  isPending: boolean;
  onSubmit: (value: ReturnType<typeof toCreateSeedInput>) => void;
};

const initialValues: CaptureFormValues = {
  sentence: "",
  sourceAuthor: "",
  sourceKind: "article",
  sourceTitle: "",
  sourceUrl: "",
  word: "",
};

const sourceKindOptions: SourceKind[] = [
  "article",
  "book",
  "manual",
  "other",
];

export const CaptureForm = ({
  errorMessage,
  isPending,
  onSubmit,
}: CaptureFormProps): JSX.Element => {
  const [values, setValues] = useState<CaptureFormValues>(initialValues);

  const updateField = <TField extends keyof CaptureFormValues>(
    field: TField,
    value: CaptureFormValues[TField],
  ): void => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit(toCreateSeedInput(values));
  };

  return (
    <section className="panel panel--capture">
      <div className="panel__header">
        <h2>Save a word</h2>
        <p className="panel__copy">Word first. Add context only if it helps.</p>
      </div>

      <form className="capture-form" onSubmit={handleSubmit}>
        <div className="capture-form__primary">
          <label className="capture-form__field">
            <span>Word or phrase</span>
            <input
              autoComplete="off"
              name="word"
              onChange={(event) => {
                updateField("word", event.target.value);
              }}
              placeholder="lapidary"
              required
              value={values.word}
            />
          </label>

          <label className="capture-form__field">
            <span>Sentence (optional)</span>
            <textarea
              name="sentence"
              onChange={(event) => {
                updateField("sentence", event.target.value);
              }}
              placeholder="The prose became unexpectedly lapidary by the final chapter."
              rows={4}
              value={values.sentence}
            />
          </label>
        </div>

        <details className="capture-form__details">
          <summary>Source details (optional)</summary>
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

        <p className="capture-form__hint">
          After you save, Gloss starts enrichment in the background.
        </p>

        {errorMessage ? (
          <p className="capture-form__error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="capture-form__actions">
          <button className="capture-form__submit" disabled={isPending} type="submit">
            {isPending ? "Saving..." : "Save word"}
          </button>
        </div>
      </form>
    </section>
  );
};
