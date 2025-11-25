<script>
  export let brand;
  export let nav = [];
</script>

<footer class="section footer">
  <div class="section__inner footer__inner">
    <div>
      <h3>{brand?.name}</h3>
      <p>{brand?.summary}</p>
    </div>
    <div>
      <strong>Navigation</strong>
      {#each nav as item}
        <a href={item.href}>{item.label}</a>
      {/each}
    </div>
    <div>
      <strong>Contact</strong>
      <a href={`mailto:${brand?.email}`}>{brand?.email}</a>
      <a href={`tel:${brand?.phone?.replace(/\s+/g, '')}`}>{brand?.phone}</a>
    </div>
    {#if brand?.instagram}
      <div>
        <strong>Social</strong>
        <a class="footer__social" href={brand.instagram} target="_blank" rel="noreferrer noopener" aria-label="Instagram">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm0 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7Zm5 3.5A5.5 5.5 0 1 1 6.5 14 5.51 5.51 0 0 1 12 8.5Zm0 2A3.5 3.5 0 1 0 15.5 14 3.5 3.5 0 0 0 12 10.5ZM17.25 6a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 17.25 6Z" fill="currentColor"/></svg>
        </a>
      </div>
    {/if}
  </div>
  <p class="footer__legal">© {new Date().getFullYear()} FTR Digital. Australia / UK partnership.</p>
</footer>

<style>
  .footer {
    background: var(--surface-footer);
  }

  .footer__inner {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .footer__inner a,
  .footer__inner p,
  .footer__inner strong {
    display: block;
    margin-bottom: 0.4rem;
    color: var(--color-muted);
    text-decoration: none;
  }

  .footer__social {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    line-height: 1;
    font-size: 0;
    border-radius: 999px;
    border: 1px solid var(--btn-ghost-border);
    background: var(--btn-ghost-bg);
    color: var(--color-muted);
    transition: transform 200ms ease, border-color 200ms ease, background 200ms ease;
  }

  .footer__social svg {
    width: 20px;
    height: 20px;
    display: block;
    pointer-events: none;
  }

  .footer__social:hover,
  .footer__social:focus-visible {
    transform: translateY(-2px);
    border-color: var(--btn-hover-border);
    background: var(--btn-ghost-hover-bg);
  }

  .footer__legal {
    text-align: center;
    margin-top: 2rem;
    color: var(--color-muted);
    font-size: 0.8rem;
  }

  @media (max-width: 640px) {
    .footer__inner {
      gap: 1rem;
      justify-items: center;
    }

    .footer__inner > div {
      text-align: center;
    }

    .footer__inner strong {
      margin-bottom: 0.5rem;
    }

    .footer__social {
      width: 48px;
      height: 48px;
      margin-top: 0.4rem;
    }
  }
</style>
