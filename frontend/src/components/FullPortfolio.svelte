<script>
  import { createEventDispatcher } from 'svelte';

  export let cases = [];

  const dispatch = createEventDispatcher();

</script>

<section class="section full-portfolio" aria-labelledby="full-portfolio-title">
  <div class="section__inner">
    <header class="full-portfolio__header">
      <div>
        <p class="eyebrow">All work</p>
        <h1 id="full-portfolio-title">Full portfolio</h1>
        <p class="full-portfolio__lede">
          A complete archive of our launch campaigns, product builds, content systems and brand stories. Explore the
          breadth of collaborations shaping the next wave of creators and companies.
        </p>
      </div>
      <div class="full-portfolio__actions">
        <button type="button" class="btn btn--ghost" on:click={() => dispatch('close')}>
          ⟵ Back to main site
        </button>
      </div>
    </header>

    <div class="full-portfolio__grid">
      {#each cases as project, index (project.name + index)}
        <article
          class="full-portfolio__card animate-enter"
          data-anim="fade-up"
          style={`--animate-order: ${index + 1}; --animate-delay: ${index * 55}ms`}
        >
          <div class="full-portfolio__media">
            <img src={project.image} alt={project.name} loading="lazy" />
            <span class="full-portfolio__badge">{project.category}</span>
          </div>
          <div class="full-portfolio__body">
            <h3>{project.name}</h3>
            <p>{project.description}</p>
            <div class="full-portfolio__tags">
              {#each project.stats ?? [] as stat}
                <span class="full-portfolio__tag">{stat}</span>
              {/each}
            </div>
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .full-portfolio {
    min-height: calc(100vh - 160px);
    padding-top: 4.5rem;
    padding-bottom: 6rem;
    background: radial-gradient(circle at 18% 12%, rgba(36, 192, 255, 0.12), transparent 55%),
      radial-gradient(circle at 82% 16%, rgba(75, 124, 255, 0.1), transparent 58%),
      linear-gradient(180deg, rgba(5, 7, 10, 0.96), rgba(9, 12, 18, 0.98));
  }

  .full-portfolio__header {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
    align-items: flex-start;
    margin-bottom: 3rem;
    flex-wrap: wrap;
  }

  .full-portfolio__lede {
    max-width: 640px;
  }

  .full-portfolio__actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .full-portfolio__grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }

  .full-portfolio__card {
    display: flex;
    flex-direction: column;
    border-radius: 28px;
    overflow: hidden;
    background: rgba(12, 15, 22, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 12px 45px rgba(5, 9, 20, 0.36);
    transition: transform 220ms ease, box-shadow 220ms ease;
  }

  .full-portfolio__card:hover,
  .full-portfolio__card:focus-within {
    transform: translateY(-6px);
    box-shadow: 0 22px 64px rgba(14, 22, 40, 0.55);
  }

  .full-portfolio__media {
    position: relative;
    overflow: hidden;
  }

  .full-portfolio__media img {
    width: 100%;
    height: 220px;
    object-fit: cover;
    transition: transform 400ms ease;
  }

  .full-portfolio__card:hover .full-portfolio__media img,
  .full-portfolio__card:focus-within .full-portfolio__media img {
    transform: scale(1.05);
  }

  .full-portfolio__badge {
    position: absolute;
    top: 1.1rem;
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem 1.2rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(6, 8, 12, 0.58);
    color: rgba(198, 212, 244, 0.95);
    font-size: 0.68rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .full-portfolio__body {
    padding: 1.75rem;
    display: grid;
    gap: 0.85rem;
  }

  .full-portfolio__body h3 {
    margin: 0;
    font-size: 1.4rem;
  }

  .full-portfolio__body p {
    margin: 0;
  }

  .full-portfolio__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .full-portfolio__tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.28rem 0.75rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(6, 8, 12, 0.35);
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(215, 226, 250, 0.88);
  }

  :global(:root[data-theme='light']) .full-portfolio {
    background: linear-gradient(180deg, rgba(245, 247, 251, 0.96), rgba(232, 236, 246, 0.92));
  }

  :global(:root[data-theme='light']) .full-portfolio__card {
    background: #ffffff;
    border-color: rgba(17, 20, 33, 0.12);
    box-shadow: 0 12px 40px rgba(39, 62, 108, 0.12);
  }

  :global(:root[data-theme='light']) .full-portfolio__card:hover,
  :global(:root[data-theme='light']) .full-portfolio__card:focus-within {
    box-shadow: 0 22px 64px rgba(39, 62, 108, 0.18);
  }

  :global(:root[data-theme='light']) .full-portfolio__badge {
    border-color: rgba(17, 20, 33, 0.12);
    background: rgba(255, 255, 255, 0.92);
    color: rgba(47, 58, 92, 0.75);
  }

  :global(:root[data-theme='light']) .full-portfolio__tag {
    border-color: rgba(17, 20, 33, 0.12);
    background: rgba(246, 248, 252, 0.9);
    color: rgba(47, 58, 92, 0.82);
  }

  @media (max-width: 720px) {
    .full-portfolio {
      padding-top: 3.5rem;
    }

    .full-portfolio__header {
      flex-direction: column;
    }

    .full-portfolio__actions {
      width: 100%;
      justify-content: flex-start;
    }

    .full-portfolio__card {
      grid-template-rows: 180px 1fr;
    }
  }
</style>
