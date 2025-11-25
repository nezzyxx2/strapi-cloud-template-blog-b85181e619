<script>
  import ThemeToggle from './ThemeToggle.svelte';
  import { createEventDispatcher } from 'svelte';

  export let brand;
  export let nav = [];
  export let theme = 'dark';

  const dispatch = createEventDispatcher();
  let menuOpen = false;

  function handleToggle(event) {
    dispatch('toggle-theme', event.detail);
  }

  function handleLogoClick() {
    dispatch('nav-select', { item: { href: '#landing', label: brand?.name ?? 'Home' } });
    closeMenu();
  }

  function handleNavClick(item) {
    dispatch('nav-select', { item });
    closeMenu();
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && menuOpen) {
      closeMenu();
    }
  }

  function handleResize(event) {
    if (event.currentTarget?.innerWidth > 760 && menuOpen) {
      closeMenu();
    }
  }

  $: if (typeof document !== 'undefined') {
    if (menuOpen) {
      document.body.setAttribute('data-nav-open', 'true');
    } else {
      document.body.removeAttribute('data-nav-open');
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} on:resize={handleResize} />

<header class="topbar">
  <div class="topbar__inner">
    <a href="#landing" class="topbar__logo" on:click|preventDefault={handleLogoClick}>
      <div class="topbar__logo-mark" aria-hidden="true">
        <span>F</span>
      </div>
      <div class="topbar__meta">
        <strong>{brand?.name ?? 'FTR Digital'}</strong>
        <small>{brand?.location}</small>
      </div>
    </a>

    <nav class="topbar__nav">
      {#each nav as item}
        <a href={item.href} on:click|preventDefault={() => handleNavClick(item)}>{item.label}</a>
      {/each}
    </nav>
    <div class="topbar__actions topbar__actions--desktop">
      <ThemeToggle {theme} on:toggle={handleToggle} />
      <a
        class="btn btn--primary"
        href={brand?.cta?.href}
        on:click|preventDefault={() => handleNavClick({ href: brand?.cta?.href, label: brand?.cta?.label })}
      >
        {brand?.cta?.label}
      </a>
    </div>
    <button
      class="topbar__menu-toggle"
      type="button"
      aria-expanded={menuOpen}
      aria-controls="mobile-nav"
      on:click={toggleMenu}
    >
      <span class="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
      <span class="topbar__menu-icon" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span class="topbar__menu-label">{menuOpen ? 'Close' : 'Menu'}</span>
    </button>
  </div>
  <button
    type="button"
    class="topbar__overlay"
    data-open={menuOpen}
    aria-hidden={!menuOpen}
    tabindex={menuOpen ? 0 : -1}
    on:click={closeMenu}
  >
    <span class="sr-only">Dismiss menu</span>
  </button>
  <div id="mobile-nav" class="topbar__drawer" data-open={menuOpen} aria-hidden={!menuOpen}>
    <div class="topbar__drawer-header">
      <div class="topbar__drawer-brand">
        <strong>{brand?.name ?? 'FTR Digital'}</strong>
        <small>{brand?.location}</small>
      </div>
      <button
        type="button"
        class="topbar__drawer-close"
        aria-label="Close menu"
        on:click={closeMenu}
      >
        Close
      </button>
    </div>
    <nav class="topbar__drawer-nav">
      {#each nav as item}
        <a href={item.href} on:click|preventDefault={() => handleNavClick(item)}>{item.label}</a>
      {/each}
    </nav>
    <div class="topbar__drawer-actions">
      <ThemeToggle {theme} on:toggle={handleToggle} />
      <a
        class="btn btn--primary"
        href="#contact"
        on:click|preventDefault={() => handleNavClick({ href: '#contact', label: 'Contact' })}
      >
        Contact
      </a>
    </div>
  </div>
</header>

<style>
  .topbar {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--surface-topbar);
    backdrop-filter: blur(22px);
    border-bottom: 1px solid var(--surface-topbar-border);
  }

  .topbar__inner {
    max-width: var(--max-width);
    margin: 0 auto;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 1.5rem;
    padding: 1rem 1.5rem;
  }

  .topbar__logo {
    text-decoration: none;
    display: flex;
    align-items: center;
    color: inherit;
  }

  .topbar__logo-mark {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(76, 218, 255, 0.9), rgba(25, 99, 255, 0.85));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 0.9rem;
    box-shadow: 0 0 30px rgba(76, 218, 255, 0.5);
    animation: topbarLogoPulse 3.5s ease-in-out infinite;
  }

  .topbar__logo-mark span {
    font-family: var(--font-display);
    color: #fff;
    letter-spacing: 0.08em;
    font-size: 1.2rem;
  }

  .topbar__meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .topbar__logo strong {
    font-family: var(--font-display);
    letter-spacing: 0.08em;
  }

  .topbar__logo small {
    display: block;
    color: var(--color-muted);
    font-size: 0.75rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .topbar__nav {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
    justify-self: center;
    padding: 0 0.5rem;
  }

  .topbar__nav a,
  .topbar__drawer-nav a {
    text-decoration: none;
    color: var(--color-muted);
    font-weight: 500;
    padding: 0.5rem 1.1rem;
    border-radius: 999px;
    transition: color 200ms ease, background 200ms ease, transform 200ms ease, box-shadow 200ms ease;
  }

  .topbar__nav a:hover,
  .topbar__nav a:focus-visible,
  .topbar__drawer-nav a:hover,
  .topbar__drawer-nav a:focus-visible {
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(36, 192, 255, 0.12);
  }

  :global(:root[data-theme='light']) .topbar__nav a:hover,
  :global(:root[data-theme='light']) .topbar__nav a:focus-visible,
  :global(:root[data-theme='light']) .topbar__drawer-nav a:hover,
  :global(:root[data-theme='light']) .topbar__drawer-nav a:focus-visible {
    background: rgba(17, 20, 33, 0.08);
    box-shadow: 0 12px 32px rgba(53, 107, 255, 0.12);
  }

  .topbar__actions {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  .topbar__menu-toggle {
    display: none;
    align-items: center;
    gap: 0.65rem;
    border: 1px solid var(--btn-base-border);
    background: rgba(255, 255, 255, 0.02);
    color: var(--color-text);
    border-radius: 999px;
    padding: 0.45rem 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 200ms ease, background 200ms ease;
  }

  .topbar__menu-toggle:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 3px;
  }

  .topbar__menu-icon {
    display: inline-flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .topbar__menu-icon span {
    width: 20px;
    height: 2px;
    border-radius: 2px;
    background: currentColor;
    transition: transform 200ms ease, opacity 200ms ease;
  }

  .topbar__menu-label {
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .topbar__overlay {
    position: fixed;
    inset: 0;
    background: rgba(5, 7, 10, 0.6);
    backdrop-filter: blur(4px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 220ms ease;
    z-index: 50;
    border: none;
    padding: 0;
    visibility: hidden;
  }

  .topbar__overlay[data-open='true'] {
    opacity: 1;
    pointer-events: auto;
    visibility: visible;
  }

  .topbar__drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: min(360px, 90vw);
    height: 100vh;
    background: var(--surface-panel);
    border-left: 1px solid var(--surface-panel-border);
    box-shadow: -10px 0 35px rgba(5, 7, 12, 0.4);
    transform: translateX(100%);
    transition: transform 260ms ease;
    padding: 2rem 1.75rem 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    z-index: 60;
    visibility: hidden;
  }

  .topbar__drawer[data-open='true'] {
    transform: translateX(0);
    visibility: visible;
  }

  .topbar__drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 1rem;
    margin-bottom: 1.2rem;
    border-bottom: 1px solid var(--surface-panel-border);
  }

  .topbar__drawer-brand {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .topbar__drawer-brand strong {
    font-family: var(--font-display);
  }

  .topbar__drawer-brand small {
    font-size: 0.75rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  .topbar__drawer-close {
    background: none;
    border: none;
    color: var(--color-muted);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .topbar__drawer-nav {
    display: grid;
    gap: 0.9rem;
    margin-top: 0.65rem;
  }

  .topbar__drawer-actions {
    margin-top: auto;
    display: grid;
    gap: 1.1rem;
    padding-top: 1.75rem;
    border-top: 1px solid var(--surface-panel-border);
  }

  .topbar__drawer-actions :global(.btn) {
    width: 100%;
  }

  .topbar__drawer-nav a {
    width: 100%;
    border-radius: 18px;
    border: 1px solid var(--btn-base-border);
    background: rgba(255, 255, 255, 0.02);
    color: var(--color-text);
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    padding: 0.9rem 1.1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.65rem;
    transition: border-color 200ms ease, background 200ms ease, transform 200ms ease;
  }

  .topbar__drawer-nav a::after {
    content: '›';
    font-size: 1.2rem;
    opacity: 0.6;
  }

  .topbar__drawer-nav a:hover,
  .topbar__drawer-nav a:focus-visible {
    background: var(--btn-ghost-hover-bg);
    border-color: var(--btn-hover-border);
    transform: translateY(-2px);
  }

  @keyframes topbarLogoPulse {
    0% {
      transform: scale(0.95);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(0.97);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .topbar__logo-mark {
      animation: none;
    }
  }

  @media (max-width: 960px) {
    .topbar__inner {
      grid-template-columns: auto 1fr auto;
    }
  }

  @media (max-width: 760px) {
    .topbar__inner {
      grid-template-columns: auto auto;
      align-items: center;
    }

    .topbar__nav,
    .topbar__actions--desktop {
      display: none;
    }

    .topbar__menu-toggle {
      display: inline-flex;
      justify-self: end;
    }

    .topbar__overlay,
    .topbar__drawer {
      display: block;
    }
  }

  @media (min-width: 761px) {
    .topbar__menu-toggle,
    .topbar__overlay,
    .topbar__drawer {
      display: none;
    }
  }
</style>
