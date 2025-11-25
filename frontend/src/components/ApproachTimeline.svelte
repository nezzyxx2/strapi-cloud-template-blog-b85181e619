<script>
  import { fade } from 'svelte/transition';

  export let approach;

  const steps = () => approach?.steps ?? [];
  let activeStep = 0;

  $: maxStepIndex = steps().length - 1;
  $: if (activeStep > maxStepIndex) {
    activeStep = Math.max(0, maxStepIndex);
  }

  const hasMultiple = () => steps().length > 1;

  function nextStep() {
    if (!hasMultiple()) return;
    activeStep = activeStep === maxStepIndex ? 0 : activeStep + 1;
  }

  function prevStep() {
    if (!hasMultiple()) return;
    activeStep = activeStep === 0 ? maxStepIndex : activeStep - 1;
  }

  const currentStep = () => steps()[activeStep] ?? null;
</script>

<section id="approach" class="section section--alt">
  <div class="section__inner approach">
    <div>
      <p class="eyebrow">Approach</p>
      <h2>{approach?.title}</h2>
      <p>{approach?.callout}</p>
    </div>
    <div class="timeline timeline--desktop">
      {#each steps() as step}
        <article class="panel timeline__item">
          <span>{step.heading}</span>
          <p>{step.copy}</p>
        </article>
      {/each}
    </div>

    {#if steps().length}
      <div class="timeline-carousel">
        <button
          type="button"
          class="timeline-carousel__control"
          on:click={prevStep}
          aria-label="Previous step"
          disabled={!hasMultiple()}
        >
          ‹
        </button>
        <div class="timeline-carousel__viewport">
          {#key activeStep}
            {#if currentStep()}
              <article class="panel timeline__item" in:fade out:fade>
                <span>{currentStep().heading}</span>
                <p>{currentStep().copy}</p>
              </article>
            {/if}
          {/key}
        </div>
        <button
          type="button"
          class="timeline-carousel__control"
          on:click={nextStep}
          aria-label="Next step"
          disabled={!hasMultiple()}
        >
          ›
        </button>
        {#if hasMultiple()}
          <div class="timeline-carousel__dots" role="tablist" aria-label="Approach steps">
            {#each steps() as _, dotIndex}
              <button
                type="button"
                class="timeline-carousel__dot"
                class:timeline-carousel__dot--active={dotIndex === activeStep}
                aria-label={`Go to step ${dotIndex + 1}`}
                on:click={() => (activeStep = dotIndex)}
              ></button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</section>

<style>
  .section--alt {
    background: rgba(255, 255, 255, 0.01);
  }

  :global(:root[data-theme='light']) .section--alt {
    background: rgba(17, 20, 33, 0.03);
  }

  .approach {
    display: grid;
    grid-template-columns: 0.9fr 1.1fr;
    gap: 2rem;
    align-items: flex-start;
  }

  .timeline {
    display: grid;
    gap: 1rem;
  }

  .timeline__item span {
    font-weight: 600;
    color: var(--color-accent);
    letter-spacing: 0.05em;
  }

  .timeline-carousel {
    display: none;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.75rem;
  }

  .timeline-carousel__control {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1px solid var(--btn-base-border);
    background: var(--btn-ghost-bg);
    color: var(--color-text);
    font-size: 1.6rem;
    line-height: 1;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  }

  .timeline-carousel__control:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .timeline-carousel__control:not(:disabled):hover,
  .timeline-carousel__control:not(:disabled):focus-visible {
    transform: translateY(-2px);
    border-color: var(--btn-hover-border);
    background: var(--btn-ghost-hover-bg);
  }

  .timeline-carousel__viewport {
    min-width: 0;
  }

  .timeline-carousel__dots {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
    grid-column: 1 / -1;
    margin-top: 1rem;
  }

  .timeline-carousel__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    cursor: pointer;
  }

  .timeline-carousel__dot--active {
    background: var(--color-accent);
  }

  @media (max-width: 900px) {
    .approach {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .approach {
      justify-items: center;
      text-align: center;
      gap: 2rem;
    }

    .approach > div {
      max-width: 460px;
    }

    .approach > div p {
      margin-top: 0.9rem;
    }

    .timeline--desktop {
      display: none;
    }

    .timeline-carousel {
      display: grid;
      width: min(420px, 100%);
      margin: 0 auto;
    }

    .timeline__item {
      padding: 1.5rem;
      text-align: left;
    }

    .timeline__item span {
      font-size: 0.8rem;
      letter-spacing: 0.12em;
    }

    .timeline__item p {
      margin: 0.5rem 0 0;
    }

    .timeline-carousel__viewport {
      display: grid;
      overflow: hidden;
    }

    .timeline-carousel__dots {
      margin-top: 1.2rem;
    }
  }
</style>
