import { pricingQuestions, pricingTiers } from "./pricingTiers";
import { Waitlist } from "./Waitlist";
import "./marketing.css";

const stages = [
  { number: "I", title: "Watch the beat", text: "Research agents monitor the sources you choose and surface developments that belong in your publication, not whatever happens to be loud today." },
  { number: "II", title: "Build the memory", text: "References, people, organizations, claims, and relationships become a reviewed knowledge base that gets more useful with every reporting cycle." },
  { number: "III", title: "Exercise judgment", text: "Editors choose the angle, open assignments, challenge the evidence, and decide what is ready. Automation works for the desk, not instead of it." },
  { number: "IV", title: "Publish an edition", text: "Turn reporting packets into reviewed copy, assemble sections and editions, and publish a site whose shape follows the subject you cover." },
];

const proof = [
  ["Open source", "Clone it. Change it. Keep it."],
  ["Your AWS", "Your account, data, and bill."],
  ["No permission", "Come to us, or leave, any time."],
];

const frequentlyAsked = [
  { question: "What is Papyrus?", answer: "Papyrus is an open-source publishing and newsroom system for a specific beat. Research agents and human editors monitor sources, maintain a publication-specific knowledge base, prepare reporting packets, review drafts, and publish editions." },
  { question: "Does Papyrus have to run in Anthus infrastructure?", answer: "No. It is designed to run from your AWS account. Your content, data, and infrastructure stay under your control." },
  ...pricingQuestions,
  { question: "Where can I see it working?", answer: "This site is a Papyrus publication. The newspaper lives at /information, and the newsroom behind it at /newsroom." },
];

export function MarketingPage() {
  return (
    <div className="papyrus-marketing">
      <header className="pm-header">
        <nav aria-label="Primary navigation" className="pm-container pm-nav">
          <a href="#top" className="pm-wordmark" aria-label="Papyrus home">
            <img src="/papyrus-plant.png" alt="" width="23" height="30" />
            <span>Papyrus</span>
          </a>
          <div className="pm-nav-links">
            <a href="#newsroom">The newsroom</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <a href="/information">Read the newspaper</a>
          </div>
        </nav>
      </header>

      <main id="top">
        <section className="pm-hero" aria-labelledby="hero-title">
          <div className="pm-container">
            <p className="pm-kicker">Open-source, AI-assisted publishing</p>
            <h1 id="hero-title">A newsroom with a <em>long memory.</em></h1>
            <p className="pm-lede">
              Papyrus turns one subject worth following into a living publication. Research agents watch the beat, editors shape the coverage, and every story keeps its sources, concepts, and decisions attached.
            </p>
            <div className="pm-actions">
              <a className="pm-button pm-button-primary" href="/information">Read the newspaper</a>
              <a className="pm-button" href="https://github.com/AnthusAI/Papyrus">Clone Papyrus on GitHub</a>
              <a className="pm-button" href="#waitlist">Join the wait-list</a>
            </div>
          </div>
          <div className="pm-proof">
            <div className="pm-container pm-proof-grid">
              {proof.map(([value, label]) => (
                <p key={value}><strong>{value}</strong><span>{label}</span></p>
              ))}
            </div>
          </div>
        </section>

        <section id="newsroom" className="pm-section" aria-labelledby="newsroom-title">
          <div className="pm-container">
            <p className="pm-kicker">The newsroom system</p>
            <h2 id="newsroom-title" className="pm-heading">From signal to record.</h2>
            <p className="pm-lede">A feed forgets. Papyrus accumulates context, preserves provenance, and makes editorial decisions visible.</p>
            <div className="pm-stage-grid">
              {stages.map((stage) => (
                <article key={stage.title} className="pm-card">
                  <span className="pm-numeral" aria-hidden="true">{stage.number}</span>
                  <h3>{stage.title}</h3>
                  <p>{stage.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="pm-section pm-section-raised" aria-labelledby="pricing-title">
          <div className="pm-container">
            <p className="pm-kicker">Delegated responsibility</p>
            <h2 id="pricing-title" className="pm-heading">You choose how much we help</h2>
            <p className="pm-lede">
              You can run the whole stack yourself. If you want help, we can operate it, set it up with you, or adapt a deployment to what you need.
            </p>
            <div className="pm-pricing-grid">
              {pricingTiers.map((tier) => (
                <div key={tier.title} className="pm-card pm-tier">
                  <h3>{tier.title}</h3>
                  <p>{tier.body}</p>
                  <div className="pm-tier-price">
                    <span>{tier.price}</span>
                    {tier.note ? <small>{tier.note}</small> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="pm-section" aria-labelledby="faq-title">
          <div className="pm-container">
            <p className="pm-kicker">Questions, answered</p>
            <h2 id="faq-title" className="pm-heading">Straight answers</h2>
            <div className="pm-faq">
              {frequentlyAsked.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <Waitlist />
      </main>

      <footer className="pm-footer">
        <div className="pm-container pm-footer-grid">
          <p className="pm-wordmark"><span>Papyrus</span></p>
          <p>An open-source newsroom system, stewarded by Anthus AI Solutions.</p>
          <p className="pm-footer-links">
            <a href="/information">Newspaper</a>
            <a href="#pricing">Pricing</a>
            <a href="https://github.com/AnthusAI/Papyrus">GitHub</a>
            <a href="https://anth.us">Anthus AI Solutions</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
