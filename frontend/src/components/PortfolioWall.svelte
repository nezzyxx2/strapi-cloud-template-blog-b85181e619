<script>
  import { createEventDispatcher, onMount } from 'svelte';
  export let cases = [];

  const dispatch = createEventDispatcher();

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

  $: if (!cases?.length) {
    activeSlide = 0;
  }
</script>

<section id="work" class="section portfolio">
  <div class="section__inner">
    <div class="portfolio__header">
      <div>
        <p class="eyebrow">Selected work</p>
        <h2>Portfolio</h2>
      </div>
      <div class="portfolio__actions">
        <button type="button" class="btn btn--ghost" on:click={() => dispatch('expand')}>
          View full showcase
        </button>
        <a class="btn" href="#contact">Request deck</a>
      </div>
    </div>

    <div
      class="portfolio__grid"
      bind:this={sliderEl}
      on:scroll={handleSliderScroll}
    >
      {#each cases as project, index}
        <article
          class="portfolio__card animate-enter"
          data-anim="fade-up"
          style={`--animate-order: ${index + 1}`}
          use:registerSlide={index}
        >
          <div class="portfolio__media">
            <img src={project.image} alt={project.name} loading="lazy" />
            <span class="portfolio__badge">{project.category}</span>
          </div>
          <div class="portfolio__overlay">
            <h3>{project.name}</h3>
            <p>{project.description}</p>
            <div class="portfolio__tags">
              {#each project.stats as stat}
                <span class="portfolio__tag">{stat}</span>
              {/each}
            </div>
          </div>
        </article>
      {/each}
    </div>
    {#if cases.length > 1}
      <div class="portfolio__dots" role="tablist" aria-label="Portfolio slides">
        {#each cases as _, dotIndex}
          <button
            type="button"
            class="portfolio__dot"
            class:portfolio__dot--active={dotIndex === activeSlide}
            aria-label={`Go to slide ${dotIndex + 1}`}
            on:click={() => scrollToSlide(dotIndex)}
          ></button>
        {/each}
      </div>
    {/if}
  </div>
</section>

<style>
  .portfolio__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
    text-align: left;
  }

  .portfolio__header > div {
    text-align: left;
  }

  .portfolio__actions {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.75rem;
  }

  .portfolio__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
  }

  .portfolio__card {
    position: relative;
    border-radius: 28px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: #000;
  }

  .portfolio__media {
    position: relative;
    overflow: hidden;
  }

  .portfolio__media img {
    width: 100%;
    height: 260px;
    object-fit: cover;
    transition: transform 500ms ease;
    filter: grayscale(0.1);
  }

  .portfolio__card:hover .portfolio__media img {
    transform: scale(1.08);
  }

  .portfolio__badge {
    position: absolute;
    top: 1.1rem;
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem 1.4rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(6, 8, 12, 0.6);
    color: rgba(195, 208, 240, 0.92);
    letter-spacing: 0.2em;
    font-size: 0.65rem;
    text-transform: uppercase;
    backdrop-filter: blur(6px);
    white-space: nowrap;
  }

  .portfolio__overlay {
    position: absolute;
    inset: 0;
    padding: 2rem 1.6rem 1.6rem;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.88) 100%);
  }

  .portfolio__overlay h3 {
    margin: 0.4rem 0;
  }

  .portfolio__overlay p {
    margin: 0;
    color: rgba(255, 255, 255, 0.82);
  }

  .portfolio__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.8rem;
  }

  .portfolio__tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.28rem 0.75rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(6, 8, 12, 0.52);
    font-size: 0.78rem;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: rgba(215, 225, 248, 0.9);
  }

  :global(:root[data-theme='light']) .portfolio__card {
    background: #ffffff;
    border-color: rgba(17, 20, 33, 0.12);
  }

  :global(:root[data-theme='light']) .portfolio__media img {
    filter: none;
  }

  :global(:root[data-theme='light']) .portfolio__badge {
    border-color: rgba(17, 20, 33, 0.12);
    background: rgba(255, 255, 255, 0.92);
    color: rgba(47, 58, 92, 0.72);
  }

  :global(:root[data-theme='light']) .portfolio__overlay {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0) 35%, rgba(255, 255, 255, 0.92) 100%);
  }

  :global(:root[data-theme='light']) .portfolio__overlay p {
    color: rgba(35, 44, 66, 0.82);
  }

  :global(:root[data-theme='light']) .portfolio__tag {
    border-color: rgba(17, 20, 33, 0.14);
    background: rgba(255, 255, 255, 0.78);
    color: rgba(47, 58, 92, 0.82);
  }

  @media (max-width: 720px) {
    .portfolio__header {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .portfolio__actions {
      width: min(420px, 100%);
      flex-direction: column;
      align-items: stretch;
      margin-top: 0.5rem;
    }

    .portfolio__actions :global(.btn) {
      width: 100%;
    }
  }

  @media (max-width: 600px) {
    .portfolio__grid {
      display: flex;
      gap: 1rem;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding: 0.35rem clamp(0.75rem, 6vw, 2rem) 0.9rem;
      -ms-overflow-style: none;
      scrollbar-width: none;
      scroll-padding: clamp(0.75rem, 6vw, 2rem);
    }

    .portfolio__grid::-webkit-scrollbar {
      display: none;
    }

    .portfolio__card {
      flex: 0 0 84vw;
      border-radius: 22px;
      scroll-snap-align: center;
    }

    .portfolio__media img {
      height: 220px;
    }

    .portfolio__dots {
      display: flex;
      justify-content: center;
      gap: 0.4rem;
      margin-top: 1.2rem;
    }

    .portfolio__dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      border: none;
      background: rgba(255, 255, 255, 0.25);
      cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease;
    }

    .portfolio__dot--active {
      background: var(--color-accent);
      transform: scale(1.1);
    }
  }
</style>
