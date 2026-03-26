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
        <p className="panel__eyebrow">Manual Capture</p>
        <h2>Save the lexical moment now. Elaborate later.</h2>
        <p className="panel__copy">
          The word is required. Sentence and source metadata stay optional, but
          they meaningfully improve future enrichment.
        </p>
      </div>

      <form className="capture-form" onSubmit={handleSubmit}>
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
          <span>Sentence</span>
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

        {errorMessage ? (
          <p className="capture-form__error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button className="capture-form__submit" disabled={isPending} type="submit">
          {isPending ? "Saving..." : "Save seed"}
        </button>
      </form>
    </section>
  );
};
