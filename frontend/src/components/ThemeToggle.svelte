<script>
  import { createEventDispatcher } from 'svelte';

  export let theme = 'dark';

  const dispatch = createEventDispatcher();

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    dispatch('toggle', { theme: next });
  }

  $: label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
</script>

<button type="button" class="theme-toggle" on:click={toggle} aria-label={label} title={label}>
  <span class="theme-toggle__icon" data-theme={theme} aria-hidden="true">
    <span class="theme-toggle__sun"></span>
    <span class="theme-toggle__moon"></span>
  </span>
</button>

<style>
  .theme-toggle {
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.04);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  }

  .theme-toggle:hover,
  .theme-toggle:focus-visible {
    transform: translateY(-2px);
    border-color: rgba(36, 192, 255, 0.4);
    background: rgba(36, 192, 255, 0.12);
    outline: none;
  }

  .theme-toggle__icon {
    position: relative;
    width: 18px;
    height: 18px;
  }

  .theme-toggle__sun,
  .theme-toggle__moon {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    transition: opacity 220ms ease, transform 220ms ease;
  }

  .theme-toggle__sun {
    background: radial-gradient(circle at 30% 30%, #fff8d0, #fdbb2d 60%, rgba(253, 187, 45, 0.1) 100%);
    box-shadow: 0 0 12px rgba(253, 200, 90, 0.7);
  }

  .theme-toggle__moon {
    background: radial-gradient(circle at 30% 30%, #d9e4ff, #6f81ff 70%, rgba(111, 129, 255, 0.1) 100%);
    transform: translate(6px, -6px) scale(0.6);
    box-shadow: 0 0 8px rgba(111, 129, 255, 0.6);
  }

  .theme-toggle__icon[data-theme='dark'] .theme-toggle__sun {
    opacity: 1;
  }

  .theme-toggle__icon[data-theme='dark'] .theme-toggle__moon {
    opacity: 0;
    transform: translate(0, 0) scale(0.4);
  }

  .theme-toggle__icon[data-theme='light'] .theme-toggle__sun {
    opacity: 0;
    transform: scale(0.4);
  }

  .theme-toggle__icon[data-theme='light'] .theme-toggle__moon {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }

  :global(:root[data-theme='light']) .theme-toggle {
    border-color: rgba(17, 20, 33, 0.16);
    background: rgba(17, 20, 33, 0.04);
  }

  :global(:root[data-theme='light']) .theme-toggle:hover,
  :global(:root[data-theme='light']) .theme-toggle:focus-visible {
    border-color: rgba(53, 107, 255, 0.4);
    background: rgba(53, 107, 255, 0.12);
  }
</style>
