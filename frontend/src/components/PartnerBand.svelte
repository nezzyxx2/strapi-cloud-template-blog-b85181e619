<script>
  export let partners;
</script>

<section id="partners" class="section partners">
  <div class="section__inner">
    <div class="partners__header">
      <p class="eyebrow">Partners</p>
      <h2>{partners?.title}</h2>
    </div>
    <div class="partners__logos">
      {#each partners?.logos ?? [] as logo}
        <span>{logo}</span>
      {/each}
    </div>
    <div class="partners__regions">
      {#each partners?.regions ?? [] as region}
        <span class="tag">{region}</span>
      {/each}
    </div>
  </div>
</section>

<style>
  .partners__header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .partners__logos {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem 1.5rem;
    justify-items: center;
    align-items: center;
    max-width: 960px;
    margin: 0 auto;
    text-align: center;
  }

  .partners__logos span {
    font-weight: 600;
    letter-spacing: 0.08em;
    font-size: 0.9rem;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  .partners__regions {
    margin-top: 2rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    justify-content: center;
  }

  @media (max-width: 640px) {
    .partners__header {
      text-align: center;
    }

    .partners__regions {
      justify-content: center;
    }
  }
</style>
