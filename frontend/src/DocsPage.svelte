<script>
  const docsSections = [
    {
      title: 'Platform Overview',
      copy:
        'How we structure media, digital and ops workstreams so every sprint ends with assets, automation and analytics your team can pick up right away.',
      faqs: [
        {
          question: 'What does a kickoff look like?',
          answer:
            'An ops sprint begins with a discovery board, artifacts for creative direction, and a shared Notion where every team can drop context before build starts.'
        },
        {
          question: 'Can partners drop assets during the sprint?',
          answer: 'Absolutely — we treat the sprint as a living loop so partner uploads trigger notifications, QA moments and update briefs automatically.'
        }
      ]
    },
    {
      title: 'Delivery Signals',
      copy:
        'Checklists, health beats and retrospectives keep launch work measurable, distributed and transparent across the stack.',
      faqs: [
        {
          question: 'How do you keep launches transparent?',
          answer:
            'Shared dashboards, automated status pings, and recap threads (recorded and published) make sure everyone sees progress in real time.'
        },
        {
          question: 'What does post-launch handoff include?',
          answer: 'We drop scripts, export-ready templates, and a living runbook with contact points so the team can move forward without the core crew.'
        }
      ]
    },
    {
      title: 'Tools & Integrations',
      copy: 'Current stack notes on the tooling that captures briefs, automates assets and keeps partners in sync.',
      faqs: [
        {
          question: 'Which ticketing + ops stack do you prefer?',
          answer: 'ClickUp + Linear for planning, combined with a curated Ops bot (Node + Discord) that keeps release logs searchable.'
        },
        {
          question: 'How do you handle media automation?',
          answer: 'Preset RenderGarden jobs, Frame.io uploads, and scriptable publishing flows for socials mean no manual repackaging after shoot day.'
        }
      ]
    }
  ];

  const docPillars = [
    {
      label: 'Signal Beats',
      value: 'Daily status, weekly health & launch alerts',
      icon: '📶'
    },
    {
      label: 'Ops Kits',
      value: 'Handoff guides, roles, budgets stored in one repo',
      icon: '🧰'
    },
    {
      label: 'Creative Templates',
      value: 'Shots, scripts, and post grids ready for reuse',
      icon: '🎬'
    }
  ];

  const faqs = [
    {
      question: 'Where do we log notes?',
      answer: 'Every sprint spins up a shared note repo (Ops Notes + Discord) that automatically syncs to the admin console so you can search weeks of context.'
    },
    {
      question: 'Do you work with in-house marketing teams?',
      answer: 'Yes — we pair with your crew across content, product and growth to make sure every handoff includes modeling for their toolkit.'
    },
    {
      question: 'How fast can we see prototypes?',
      answer: 'Expect clickable experiences within 7 days and media roughs in 4 days after the discovery window closes.'
    }
  ];

  let openFaqId = null;

  function toggleFaq(id) {
    openFaqId = openFaqId === id ? null : id;
  }
</script>

<svelte:head>
  <title>FTR Digital Docs</title>
  <meta name="description" content="Docs covering how FTR Digital plans, ships and scales digital media." />
</svelte:head>

<div class="docs-shell">
  <header class="docs-hero">
    <p class="docs-eyebrow">Docs</p>
    <h1>Living systems for media, experience and ops.</h1>
    <p class="docs-subtitle">
      These notes explain how we frame engagements, triage deliverables and keep teams aligned when shipping multidisciplinary work.
    </p>
    <a class="btn btn--ghost" href="./" aria-label="Return home">Return home</a>
  </header>

  <section class="docs-feature">
    <div class="docs-feature__card">
      <p class="docs-eyebrow">Snapshot</p>
      <h2>How this doc room works</h2>
      <p>
        A signal-driven brief staffed with storytellers, engineers and automation workflows. Read LCMs, shared dashboards and curated templates that
        make every sprint visible.
      </p>
      <button class="btn btn--ghost" type="button">Download brief</button>
    </div>
    <div class="docs-pillars" aria-label="Docs pillars">
      {#each docPillars as pillar}
        <article class="docs-pillars__item">
          <span class="docs-pillars__icon" aria-hidden="true">{pillar.icon}</span>
          <div>
            <strong>{pillar.label}</strong>
            <p>{pillar.value}</p>
          </div>
        </article>
      {/each}
    </div>
  </section>

  <section class="docs-grid">
    {#each docsSections as section}
      <article class="docs-card">
        <h2>{section.title}</h2>
        <p>{section.copy}</p>
        <div class="docs-card__faq">
          {#each section.faqs as faq, faqIndex}
            {@const faqId = `${section.title}-${faqIndex}`}
            <button
              type="button"
              class="docs-card__faq-question"
              aria-expanded={openFaqId === faqId}
              on:click={() => toggleFaq(faqId)}
            >
              <span>{faq.question}</span>
              <span aria-hidden="true" class="docs-card__faq-icon"></span>
            </button>
            <p
              class={`docs-card__faq-answer ${openFaqId === faqId ? 'is-open' : ''}`}
              aria-hidden={openFaqId !== faqId}
            >
              {faq.answer}
            </p>
          {/each}
        </div>
      </article>
    {/each}
  </section>

  <section class="docs-faqs">
    <header>
      <p class="docs-eyebrow">FAQ</p>
      <h2>Quick operational questions</h2>
      <p>Tap any question to expand.</p>
    </header>
    <div class="docs-faqs__list">
      {#each faqs as faq, index}
        {@const faqId = `general-${index}`}
        <div class="docs-faqs__item">
          <button
            type="button"
            class="docs-card__faq-question"
            aria-expanded={openFaqId === faqId}
            on:click={() => toggleFaq(faqId)}
          >
            <span>{faq.question}</span>
            <span aria-hidden="true" class="docs-card__faq-icon"></span>
          </button>
          <p
            class={`docs-card__faq-answer ${openFaqId === faqId ? 'is-open' : ''}`}
            aria-hidden={openFaqId !== faqId}
          >
            {faq.answer}
          </p>
        </div>
      {/each}
    </div>
  </section>

  <footer class="docs-footer">
    <p>Want the full template pack? Drop a request through the site contact form and we will send the latest kit.</p>
    <a class="btn btn--primary" href="/" aria-label="Book a session">Book a session</a>
  </footer>
</div>

<style>
  :global(body) {
    background: var(--hero-background);
    color: var(--color-text);
  }

  .docs-shell {
    min-height: 100vh;
    padding: 4rem 1.5rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 3rem;
    max-width: 960px;
    margin: 0 auto;
  }

  .docs-hero {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 640px;
  }

  .docs-eyebrow {
    letter-spacing: 0.32em;
    text-transform: uppercase;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .docs-hero h1 {
    font-size: clamp(2.8rem, 5vw, 3.75rem);
    margin: 0;
  }

  .docs-subtitle {
    max-width: 560px;
    color: var(--hero-subtitle);
    font-size: 1rem;
  }

  .docs-feature {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: stretch;
    padding: 2rem;
    border-radius: 28px;
    background: linear-gradient(135deg, rgba(45, 103, 255, 0.18), rgba(23, 24, 38, 0.9));
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 30px 60px rgba(4, 7, 18, 0.55);
  }

  .docs-feature__card {
    flex: 1 1 240px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .docs-pillars {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1 1 280px;
  }

  .docs-pillars__item {
    display: flex;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .docs-pillars__icon {
    font-size: 1.35rem;
  }

  .docs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.25rem;
  }

  .docs-card {
    padding: 1.5rem;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.02);
    box-shadow: 0 25px 45px rgba(6, 9, 16, 0.45);
  }

  .docs-card__faq {
    margin-top: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .docs-card__faq-question {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: none;
    border-radius: 12px;
    padding: 0.45rem 0.9rem;
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.75rem;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;
  }

  .docs-card__faq-question:hover,
  .docs-card__faq-question:focus-visible {
    background: rgba(255, 255, 255, 0.08);
  }

  .docs-card__faq-icon {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.9);
    border-radius: 999px;
    position: relative;
  }

  .docs-card__faq-icon::after {
    content: '';
    position: absolute;
    inset: 3px;
    border-radius: inherit;
    background: rgba(255, 255, 255, 0.7);
    transform: scale(0);
    transition: transform 0.2s ease;
  }

  .docs-card__faq-answer {
    margin: 0;
    padding: 0 0.9rem;
    font-size: 0.9rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.68);
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease, padding 0.3s ease;
  }

  .docs-card__faq-answer.is-open {
    padding: 0.6rem 0.9rem;
    max-height: 160px;
  }

  .docs-card h2 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .docs-card p {
    margin: 0;
    color: rgba(255, 255, 255, 0.72);
    line-height: 1.6;
  }

  .docs-faqs {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 2rem;
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 20px 60px rgba(4, 7, 18, 0.5);
  }

  .docs-faqs header h2 {
    margin: 0.25rem 0 0;
    font-size: clamp(2rem, 4vw, 2.6rem);
  }

  .docs-faqs__list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .docs-faqs__item {
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.01);
  }

  .docs-footer {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    border-radius: 18px;
    border: 1px dashed rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.02);
    text-align: center;
  }

  @media (max-width: 640px) {
    .docs-shell {
      padding: 3rem 1rem;
    }

    .docs-feature,
    .docs-faqs {
      flex-direction: column;
    }

    .docs-pillars {
      width: 100%;
    }
  }
</style>
