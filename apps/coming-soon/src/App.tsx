import type { JSX } from "react";

const productState = [
  "Capture words from books, essays, journalism, and academic prose.",
  "Read grounded definitions shaped by context, contrast, register, and morphology.",
  "Review them through fresh sentences, comparison, and recall."
] as const;

const nextSteps = [
  "Finish hosted verification on Railway preview and staging.",
  "Run a small invited alpha with serious readers.",
  "Tighten the product from real usage instead of broadening it too early."
] as const;

export const App = (): JSX.Element => (
  <main className="shell">
    <div className="ambient ambient--left" aria-hidden="true" />
    <div className="ambient ambient--right" aria-hidden="true" />

    <section className="panel">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark">G</span>
          <span className="brand-name">Gloss</span>
        </div>

        <span className="status-pill">Private Alpha Next</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Depth-first vocabulary for advanced readers.</p>
          <h1>Grow a deeper vocabulary from what you read.</h1>
          <p className="lede">
            The core Gloss loop is built: capture a word from real reading,
            deepen it through grounded lexical scaffolding, then review it
            toward durable command. The work now is private-alpha hardening,
            hosted verification, and careful rollout.
          </p>
        </div>
      </section>

      <section className="details">
        <div className="detail-card detail-card--primary">
          <p className="detail-label">Where It Stands</p>
          <p className="detail-copy">
            Gloss is past the idea stage. Capture, enrichment, and review are
            working together already. The next milestone is a small invited
            alpha for advanced readers.
          </p>
        </div>

        <div className="detail-card">
          <p className="detail-label">Inside The Product</p>
          <ul className="highlight-list">
            {productState.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="detail-card">
          <p className="detail-label">What Happens Next</p>
          <ul className="highlight-list">
            {nextSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="footer">
        <p>Built carefully. Opening gradually.</p>
        <p className="footer-copy">© Hassle→Bad</p>
      </footer>
    </section>
  </main>
);
