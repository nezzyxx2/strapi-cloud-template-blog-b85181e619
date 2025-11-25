<script>
  export let testimonials = [];

  function buildLoop(items = []) {
    if (!items?.length) return [];
    if (items.length === 1) {
      return [...items, ...items, ...items];
    }
    return [...items, ...items];
  }

  $: marqueeTestimonials = buildLoop(testimonials);
</script>

<section class="section testimonials" id="stories">
  <div class="section__inner testimonials__inner">
    <div class="testimonials__header">
      <h2 class="animate-enter" data-anim="fade-up">What our clients say — field notes from active partners.</h2>
    </div>

    <div class="testimonials__rail" aria-hidden="true">
      <div class="marquee animate-enter" data-anim="fade-up">
        <div class="marquee__track">
          {#each marqueeTestimonials as testimonial, index (testimonial.author + index)}
            <article class="testimonial-card" aria-hidden="true">
              <span class="testimonial-card__role">{testimonial.role}</span>
              <p class="testimonial-card__quote">“{testimonial.quote}”</p>
              <div class="testimonial-card__meta">{testimonial.author}</div>
            </article>
          {/each}
        </div>
      </div>
    </div>

    <div class="testimonials__mobile">
      {#each testimonials as testimonial, index ((testimonial.author ?? '') + index)}
        <article
          class="testimonial-card testimonial-card--mobile animate-enter"
          data-anim="fade-up"
          style={`--animate-order: ${index + 1}`}
        >
          <span class="testimonial-card__role">{testimonial.role}</span>
          <p class="testimonial-card__quote">“{testimonial.quote}”</p>
          <div class="testimonial-card__meta">{testimonial.author}</div>
        </article>
      {/each}
    </div>

    <ul class="sr-only" aria-label="Client testimonials">
      {#each testimonials as testimonial}
        <li>
          “{testimonial.quote}” — {testimonial.author}, {testimonial.role}
        </li>
      {/each}
    </ul>
  </div>
</section>

<style>
  .testimonials {
    position: relative;
    padding-top: 0;
    padding-bottom: 3.5rem;
    background: transparent;
  }

  .testimonials__inner {
    display: grid;
    gap: 1.8rem;
    max-width: 1080px;
    margin: 0 auto;
    justify-items: center;
  }

  .testimonials__header {
    text-align: center;
    max-width: 520px;
    margin: 0 auto;
  }

  .testimonials__header h2 {
    font-size: clamp(1.2rem, 1.7vw, 1.5rem);
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-muted-soft);
  }

  .testimonials__rail {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .testimonials__mobile {
    display: none;
    width: 100%;
  }

  .marquee {
    position: relative;
    overflow: hidden;
    width: min(960px, 100%);
    border-radius: 18px;
    border: 1px solid var(--surface-panel-border);
    background: rgba(12, 15, 22, 0.35);
    backdrop-filter: blur(10px);
    margin: 0 auto;
  }

  .marquee::before,
  .marquee::after {
    content: '';
    position: absolute;
    top: 0;
    width: 72px;
    height: 100%;
    z-index: 1;
    pointer-events: none;
  }

  .marquee::before {
    left: 0;
    background: linear-gradient(90deg, rgba(5, 7, 10, 0.78), transparent);
  }

  .marquee::after {
    right: 0;
    background: linear-gradient(270deg, rgba(5, 7, 10, 0.78), transparent);
  }

  .marquee__track {
    display: flex;
    gap: 0.75rem;
    padding: 0.9rem 1.2rem;
    min-width: max-content;
    animation: marquee-forward 34s linear infinite;
  }

  .testimonial-card {
    min-width: 170px;
    max-width: 210px;
    display: grid;
    gap: 0.4rem;
    padding: 0.65rem 0.8rem;
    background: rgba(15, 18, 26, 0.52);
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow: none;
  }

  .testimonial-card__role {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(185, 204, 240, 0.8);
    font-size: 0.56rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .testimonial-card__quote {
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--color-text);
    margin: 0;
    line-height: 1.4;
  }

  .testimonial-card__meta {
    font-size: 0.66rem;
    color: rgba(190, 205, 232, 0.68);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  :global(:root[data-theme='light']) .marquee {
    border-color: rgba(17, 20, 33, 0.08);
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(12px);
  }

  :global(:root[data-theme='light']) .marquee::before {
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.92), transparent);
  }

  :global(:root[data-theme='light']) .marquee::after {
    background: linear-gradient(270deg, rgba(255, 255, 255, 0.92), transparent);
  }

  :global(:root[data-theme='light']) .testimonial-card {
    background: rgba(255, 255, 255, 0.96);
    border-color: rgba(17, 20, 33, 0.08);
  }

  :global(:root[data-theme='light']) .testimonial-card__role {
    border-color: rgba(17, 20, 33, 0.12);
    background: rgba(17, 20, 33, 0.06);
    color: rgba(47, 58, 92, 0.7);
  }

  :global(:root[data-theme='light']) .testimonial-card__meta {
    color: rgba(47, 58, 92, 0.68);
  }

  @keyframes marquee-forward {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-50%);
    }
  }

  @media (max-width: 720px) {
    .testimonials {
      padding-top: 2.8rem;
      padding-bottom: 3rem;
    }

    .testimonials__inner {
      gap: 1.5rem;
      justify-items: stretch;
    }

    .testimonials__header {
      text-align: center;
    }

    .testimonials__rail {
      display: none;
    }

    .testimonials__mobile {
      display: flex;
      gap: 1rem;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding: 0.35rem clamp(0.75rem, 6vw, 2rem) 0.9rem;
      -ms-overflow-style: none;
      scrollbar-width: none;
      scroll-padding: clamp(0.75rem, 6vw, 2rem);
    }

    .testimonials__mobile::-webkit-scrollbar {
      display: none;
    }

    .testimonial-card--mobile {
      flex: 0 0 82vw;
      min-width: 0;
      scroll-snap-align: center;
      padding: 1.1rem 1.3rem;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(12, 15, 22, 0.65);
      box-shadow: 0 18px 32px rgba(8, 12, 22, 0.2);
    }

    .testimonial-card__quote {
      font-size: 0.9rem;
      line-height: 1.55;
    }

    .testimonial-card__role {
      font-size: 0.58rem;
    }

    :global(:root[data-theme='light']) .testimonial-card--mobile {
      background: rgba(255, 255, 255, 0.95);
      border-color: rgba(17, 20, 33, 0.08);
      box-shadow: 0 18px 32px rgba(28, 40, 68, 0.16);
    }
  }
</style>
