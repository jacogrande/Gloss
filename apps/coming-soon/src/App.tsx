import type { JSX } from "react";

const highlights = [
  "Capture words from books, essays, journalism, and academic prose.",
  "Deepen them through context, contrast, register, and morphology.",
  "Practice toward durable command, not just definition recall."
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

        <span className="status-pill">Coming Soon</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Depth-first vocabulary for advanced readers.</p>
          <h1>Grow a deeper vocabulary from what you read.</h1>
          <p className="lede">
            Gloss helps serious readers turn words from real reading into
            durable, nuanced knowledge through context, contrast, and spaced
            practice.
          </p>
        </div>
      </section>

      <section className="details">
        <div className="detail-card detail-card--primary">
          <p className="detail-label">What it is</p>
          <p className="detail-copy">
            A reading-linked vocabulary system for people who care about
            nuance, precision, and the words they actually encounter.
          </p>
        </div>

        <div className="detail-card">
          <p className="detail-label">What is coming</p>
          <ul className="highlight-list">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="footer">
        <p>Early days. Thoughtfully in progress.</p>
        <p className="footer-copy">© Hassle→Bad</p>
      </footer>
    </section>
  </main>
);
