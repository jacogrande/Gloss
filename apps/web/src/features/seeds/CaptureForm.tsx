import {
  useEffect,
  useState,
  type FormEvent,
  type JSX,
} from "react";

import type { SourceKind } from "@gloss/shared/types";

import {
  getCaptureContextHelperCopy,
  getCaptureContextToggleLabel,
  getCaptureHelperCopy,
  getCaptureOutcomeCopy,
} from "../../lib/product-loop-copy";
import { InkDoodle } from "../ui/InkDoodle";
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
  const [isContextOpen, setIsContextOpen] = useState(false);

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

  const hasContext =
    values.sentence.trim().length > 0 ||
    values.sourceAuthor.trim().length > 0 ||
    values.sourceTitle.trim().length > 0 ||
    values.sourceUrl.trim().length > 0;

  useEffect(() => {
    if (errorMessage && hasContext && !isContextOpen) {
      setIsContextOpen(true);
    }
  }, [errorMessage, hasContext, isContextOpen]);

  return (
    <section className="page page--form surface surface--primary panel panel--capture">
      <div className="panel__header">
        <div className="section-heading">
          <InkDoodle className="section-heading__mark" variant="bookmark" />
          <p className="panel__eyebrow">Capture</p>
        </div>
        <h2>Save a word</h2>
        <p className="panel__copy">{getCaptureHelperCopy()}</p>
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
          <div className="capture-form__actions">
            <button
              className="button button--primary capture-form__submit"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Saving..." : "Save word"}
            </button>
            <button
              className="button button--ghost capture-form__secondary-link"
              onClick={() => {
                setIsContextOpen((current) => !current);
              }}
              type="button"
            >
              {getCaptureContextToggleLabel({
                hasContext,
                isOpen: isContextOpen,
              })}
            </button>
          </div>
        </div>

        <p className="capture-form__hint">{getCaptureOutcomeCopy()}</p>

        {isContextOpen ? (
          <section className="capture-form__context-panel">
            <div className="capture-form__context-header">
              <p className="capture-form__context-title">Best results start here</p>
              <p className="capture-form__context-copy">
                {getCaptureContextHelperCopy()}
              </p>
            </div>

            <label className="capture-form__field">
              <span>Sentence from your reading (recommended)</span>
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
          </section>
        ) : null}

        {errorMessage ? (
          <p className="capture-form__error" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </form>
    </section>
  );
};
