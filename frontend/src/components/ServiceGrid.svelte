<script>
  import { onMount } from 'svelte';

  export let services = [];

  let sliderEl;
  let activeSlide = 0;
  const slideRefs = [];

  function registerSlide(node, index) {
    slideRefs[index] = node;
    handleSliderScroll();
    return {
      destroy() {
        slideRefs[index] = null;
      }
    };
  }

  function handleSliderScroll() {
    if (!sliderEl || !slideRefs.length) return;
    const sliderRect = sliderEl.getBoundingClientRect();
    const center = sliderRect.left + sliderRect.width / 2;
    let closestIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;
    slideRefs.forEach((el, index) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const elCenter = rect.left + rect.width / 2;
      const distance = Math.abs(elCenter - center);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    activeSlide = closestIndex;
  }

  function scrollToSlide(index) {
    const target = slideRefs[index];
    if (!sliderEl || !target) return;
    const sliderRect = sliderEl.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offset = targetRect.left - sliderRect.left + sliderEl.scrollLeft;
    sliderEl.scrollTo({ left: offset, behavior: 'smooth' });
  }

  onMount(() => {
    handleSliderScroll();
  });

  $: if (!services?.length) {
    activeSlide = 0;
  }
</script>

<section id="services" class="section">
  <div class="section__inner">
    <div class="service-grid service-grid--desktop">
      {#each services as service, index}
        <article
          class="panel service animate-enter"
          data-anim="scale"
          style={`--animate-order: ${index + 1}`}
        >
          <div class="service__icon">{service.icon}</div>
          <div class="service__header">
            <h3>{service.title}</h3>
            <p>{service.summary}</p>
          </div>
          <div class="service__tags">
            {#each service.deliverables as deliverable}
              <span class="tag">{deliverable}</span>
            {/each}
          </div>
        </article>
      {/each}
    </div>

    {#if services.length}
      <div
        class="service-slider"
        aria-label="Service highlights"
        bind:this={sliderEl}
        on:scroll={handleSliderScroll}
      >
        {#each services as service, index}
          <article
            class="panel service service--slider animate-enter"
            data-anim="fade-up"
            style={`--animate-order: ${index + 1}`}
            use:registerSlide={index}
          >
            <div class="service__icon">{service.icon}</div>
            <div class="service__header">
              <h3>{service.title}</h3>
              <p>{service.summary}</p>
            </div>
            <div class="service__tags">
              {#each service.deliverables as deliverable}
                <span class="tag">{deliverable}</span>
              {/each}
            </div>
          </article>
        {/each}
      </div>
      {#if services.length > 1}
        <div class="service-slider__dots" role="tablist" aria-label="Service slides">
          {#each services as _, dotIndex}
            <button
              type="button"
              class="service-slider__dot"
              class:service-slider__dot--active={dotIndex === activeSlide}
              aria-label={`Go to service ${dotIndex + 1}`}
              on:click={() => scrollToSlide(dotIndex)}
            ></button>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</section>

<style>
  .service-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .service {
    min-height: 260px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease, background 220ms ease;
  }

  .service__icon {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: var(--btn-ghost-bg);
    display: grid;
    place-items: center;
    font-size: 1.4rem;
    transition: transform 220ms ease, background 220ms ease, color 220ms ease;
  }

  .service__header h3 {
    margin: 0;
    font-family: var(--font-display);
  }

  .service__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .service:hover {
    transform: translateY(-6px);
    border-color: var(--btn-hover-border);
    box-shadow: 0 20px 55px rgba(36, 192, 255, 0.08);
    background: linear-gradient(140deg, rgba(36, 192, 255, 0.08), rgba(68, 125, 255, 0.05));
  }

  :global(:root[data-theme='light']) .service:hover {
    box-shadow: 0 20px 55px rgba(53, 107, 255, 0.12);
  }

  .service:hover .service__icon {
    transform: scale(1.05);
    background: linear-gradient(140deg, var(--color-accent), var(--color-accent-soft));
    color: #050607;
  }

  .service-slider {
    display: none;
  }

  @media (max-width: 640px) {
    .service-slider {
      display: flex;
      gap: 1rem;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding: 0.35rem clamp(0.75rem, 6vw, 2.4rem) 1rem;
      -ms-overflow-style: none;
      scrollbar-width: none;
      scroll-padding: clamp(0.75rem, 6vw, 2.4rem);
    }

    .service-slider::-webkit-scrollbar {
      display: none;
    }

    .service--slider {
      flex: 0 0 82vw;
      min-width: 0;
      padding: 1.6rem;
      text-align: center;
      display: grid;
      gap: 1rem;
      scroll-snap-align: center;
      border-radius: 24px;
      box-shadow: 0 20px 45px rgba(8, 12, 22, 0.3);
    }

    .service--slider .service__icon {
      margin: 0 auto;
    }

    .service--slider .service__header {
      text-align: center;
    }

    .service__tags {
      justify-content: center;
      gap: 0.4rem;
    }

    .service__header h3 {
      font-size: 1.2rem;
    }

    :global(:root[data-theme='light']) .service--slider {
      box-shadow: 0 20px 45px rgba(28, 40, 68, 0.16);
    }

    .service-slider__dots {
      display: flex;
      justify-content: center;
      gap: 0.4rem;
      margin-top: 1rem;
    }

    .service-slider__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.2);
      cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease;
    }

    .service-slider__dot--active {
      background: var(--color-accent);
      transform: scale(1.1);
    }
  }
</style>
