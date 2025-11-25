<script>
  import { onMount, afterUpdate, tick } from 'svelte';
  import TopBar from './components/TopBar.svelte';
  import HeroSection from './components/HeroSection.svelte';
  import ServiceGrid from './components/ServiceGrid.svelte';
  import ApproachTimeline from './components/ApproachTimeline.svelte';
  import PortfolioWall from './components/PortfolioWall.svelte';
  import PartnerBand from './components/PartnerBand.svelte';
  import TestimonialsPanel from './components/TestimonialsPanel.svelte';
  import ContactSection from './components/ContactSection.svelte';
  import FullPortfolio from './components/FullPortfolio.svelte';
  import SiteFooter from './components/SiteFooter.svelte';
  import AdminPanel from './components/admin/AdminPanel.svelte';
  import { applyPalette } from './data/theme.js';

  let site;
  let status = 'loading';
  let message = '';
  let activeView = 'home';
  let theme = 'dark';
  let hasAnimated = false;
  let reducedMotionQuery;
  let route = 'site';

  function deriveRoute() {
    if (typeof window === 'undefined') return 'site';
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path.startsWith('/admin') || hash.includes('admin')) {
      return 'admin';
    }
    return 'site';
  }

  if (typeof window !== 'undefined') {
    route = deriveRoute();
  }

  function handleRouteChange() {
    route = deriveRoute();
    if (route === 'site') {
      syncViewFromLocation();
    }
  }

  const fallbackKeyframes = {
    fade: [
      { opacity: 0 },
      { opacity: 1 }
    ],
    'fade-up': (initialTransform) => [
      { opacity: 0, transform: initialTransform || 'translateY(18px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    scale: (initialTransform) => [
      { opacity: 0, transform: initialTransform || 'scale(0.94)' },
      { opacity: 1, transform: 'scale(1)' }
    ]
  };

  function ensureMotionQuery() {
    if (typeof window === 'undefined') return null;
    if (!reducedMotionQuery) {
      reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = (event) => {
        if (event.matches) {
          requestAnimationFrame(playFallbackAnimations);
        }
      };
      if (typeof reducedMotionQuery.addEventListener === 'function') {
        reducedMotionQuery.addEventListener('change', handler);
      } else if (typeof reducedMotionQuery.addListener === 'function') {
        reducedMotionQuery.addListener(handler);
      }
    }
    return reducedMotionQuery;
  }

  function parseTime(value, fallback) {
    if (!value) return fallback;
    const first = value.split(',')[0]?.trim();
    if (!first) return fallback;
    if (first.endsWith('ms')) {
      const parsed = Number.parseFloat(first);
      return Number.isNaN(parsed) ? fallback : parsed;
    }
    if (first.endsWith('s')) {
      const parsed = Number.parseFloat(first);
      return Number.isNaN(parsed) ? fallback : parsed * 1000;
    }
    const parsed = Number.parseFloat(first);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  function getFallbackFrames(el, style) {
    const type = el.dataset.anim || 'fade';
    if (type === 'fade') {
      return fallbackKeyframes.fade;
    }
    const initialTransform = style.getPropertyValue('--animate-initial')?.trim();
    if (type === 'fade-up') {
      return fallbackKeyframes['fade-up'](initialTransform);
    }
    if (type === 'scale') {
      return fallbackKeyframes.scale(initialTransform);
    }
    return fallbackKeyframes.fade;
  }

  function extractTiming(style) {
    const duration = parseTime(style.animationDuration, 620);
    const delay = parseTime(style.animationDelay, 0);
    const easingRaw = style.animationTimingFunction || '';
    const easing = easingRaw.split(',')[0]?.trim() || 'cubic-bezier(0.22, 0.61, 0.36, 1)';
    return { duration, delay, easing };
  }

  function playFallbackAnimations() {
    if (typeof document === 'undefined') return;
    const query = ensureMotionQuery();
    const prefersReduced = !!(query && query.matches);

    requestAnimationFrame(() => {
      const elements = document.querySelectorAll('.animate-enter');
      elements.forEach((el) => {
        if (el.dataset.fallbackAnimated === 'true') return;
        const style = getComputedStyle(el);
        const { duration, delay, easing } = extractTiming(style);
        const animationName = style.animationName?.split(',')[0]?.trim();
        const durationSuppressed = !duration || duration === 0;
        const missingAnimation = !animationName || animationName === 'none';
        const shouldForce = prefersReduced || durationSuppressed || missingAnimation;
        if (!shouldForce) return;

        const keyframes = getFallbackFrames(el, style);
        el.animate(keyframes, {
          duration: durationSuppressed ? 620 : duration,
          delay,
          easing,
          fill: 'both'
        });
        el.dataset.fallbackAnimated = 'true';
      });
    });
  }

  const placeholderPortfolio = [
    {
      name: 'Lumina Ventures',
      category: 'Product Launch',
      description: 'Crafting a unified brand, product site and go-to-market for a seed-stage AI startup.',
      image:
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      stats: ['Brand & Identity', 'Product Site', 'Content Strategy']
    },
    {
      name: 'Echo Studio',
      category: 'Media Collective',
      description: 'Scaling episodic storytelling with automation and cross-platform campaign tooling.',
      image:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      stats: ['Automation', 'Editorial Ops', 'Web Platform']
    },
    {
      name: 'Atlas Mobility',
      category: 'B2B SaaS',
      description: 'Sales enablement, launch assets and growth media for a mobility data platform.',
      image:
        'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80',
      stats: ['Video Suite', 'Growth Ops', 'Product UX']
    },
    {
      name: 'Neon Arcade',
      category: 'Gaming Collective',
      description: 'Community strategy, storefront builds and event coverage for a global modding crew.',
      image:
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
      stats: ['Community', 'Merch Collabs', 'Live Coverage']
    }
  ];

  $: fullPortfolio = site ? [...site.portfolio, ...placeholderPortfolio] : placeholderPortfolio;

  function resolvePalette(mode) {
    if (!site) return {};
    if (mode === 'light' && site.paletteLight) return site.paletteLight;
    return site.palette;
  }

  function setTheme(mode = 'dark', { skipPersist } = {}) {
    theme = mode;
    const palette = resolvePalette(mode);
    applyPalette(palette, mode);
    if (!skipPersist && typeof window !== 'undefined') {
      window.localStorage.setItem('ftr-theme', mode);
    }
  }

  function handleThemeToggle(event) {
    setTheme(event.detail.theme);
  }

  function setActiveView(view) {
    activeView = view;
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-page-view', view);
    }
  }

  function updateHistory(hash, { replace = false } = {}) {
    if (typeof window === 'undefined') return;
    const method = replace ? 'replaceState' : 'pushState';
    if (!hash) {
      const base = window.location.pathname + window.location.search;
      window.history[method]({ view: 'home' }, '', base);
    } else if (window.location.hash !== hash || replace) {
      window.history[method]({ view: hash.replace('#', '') }, '', hash);
    }
  }

  function openPortfolioView({ pushState = true } = {}) {
    setActiveView('portfolio');
    if (pushState) {
      updateHistory('#portfolio');
    }
  }

  function closePortfolioView({ pushState = true } = {}) {
    setActiveView('home');
    if (pushState) {
      updateHistory('', { replace: true });
    }
  }

  function openContactView({ pushState = true } = {}) {
    setActiveView('contact');
    if (pushState) {
      updateHistory('#contact');
    }
  }

  function closeContactView({ pushState = true } = {}) {
    setActiveView('home');
    if (pushState) {
      updateHistory('', { replace: true });
    }
  }

  function syncViewFromLocation() {
    if (route !== 'site' || typeof window === 'undefined') return;
    const hash = window.location.hash?.toLowerCase();
    if (hash === '#portfolio') {
      setActiveView('portfolio');
    } else if (hash === '#contact') {
      setActiveView('contact');
    } else {
      setActiveView('home');
    }
  }

  function interceptContactLinks(event) {
    if (route !== 'site') return;
    const anchor = event.target.closest('a[href="\#contact"]');
    if (!anchor) return;
    event.preventDefault();
    openContactView();
  }

  async function handlePrimaryNav(event) {
    const item = event.detail?.item;
    if (!item) return;
    const href = (item.href ?? '').trim();
    if (!href) return;

    if (href.startsWith('#contact')) {
      openContactView();
      return;
    }

    if (href.startsWith('#')) {
      setActiveView('home');
      await tick();
      if (typeof document !== 'undefined') {
        const targetId = href.slice(1) || 'landing';
        if (targetId === 'landing') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
      if (typeof window !== 'undefined') {
        if (href === '#landing') {
          updateHistory('', { replace: true });
        } else {
          window.history.replaceState({ view: 'home' }, '', href);
        }
      }
      return;
    }

    if (href.startsWith('/')) {
      window.location.assign(href);
      return;
    }

    if (/^https?:/i.test(href)) {
      window.open(href, '_blank');
      return;
    }

    window.location.assign(href);
  }

  function handleAdminExit() {
    route = 'site';
  }

  onMount(async () => {
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-app-loaded');
      document.addEventListener('click', interceptContactLinks, true);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', handleRouteChange);
      window.addEventListener('popstate', handleRouteChange);
    }
    try {
      const loadDelay = new Promise((resolve) => setTimeout(resolve, 3000));
      const strapiUrl = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';
      try {
        const res = await fetch(`${strapiUrl}/api/site?populate=deep`, { headers: { 'Cache-Control': 'no-cache' } });
        if (res.ok) {
          const data = await res.json();
          site = data.data?.attributes || data;
        } else {
          throw new Error('Strapi endpoint not ready, falling back to site.json');
        }
      } catch (strapiErr) {
        console.warn('Strapi unavailable, loading from site.json:', strapiErr.message);
        const res = await fetch('/site.json', { headers: { 'Cache-Control': 'no-cache' } });
        if (!res.ok) throw new Error('Unable to load site.json');
        site = await res.json();
      }
      setActiveView('home');
      const savedTheme = typeof window !== 'undefined' ? window.localStorage.getItem('ftr-theme') : null;
      const initialTheme = savedTheme === 'light' ? 'light' : 'dark';
      setTheme(initialTheme, { skipPersist: true });
      await loadDelay;
      status = 'ready';
      syncViewFromLocation();
    } catch (err) {
      console.error(err);
      status = 'error';
      message = err.message;
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('hashchange', handleRouteChange);
        window.removeEventListener('popstate', handleRouteChange);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('click', interceptContactLinks, true);
      }
    };
  });

  $: if (status === 'ready' && !hasAnimated) {
    hasAnimated = true;
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-app-loaded', 'true');
      playFallbackAnimations();
    }
  }

  afterUpdate(() => {
    if (hasAnimated) {
      playFallbackAnimations();
    }
  });
</script>

<svelte:head>
  <meta name="description" content="FTR Digital – media, design and engineering across Australia and the UK." />
</svelte:head>

{#if status === 'loading'}
  <div class="loading">
    <div class="loading__inner">
      <div class="spinner"></div>
      <p>{route === 'admin' ? 'Loading the engineering station...' : 'Loading the future of digital engineering…'}</p>
    </div>
  </div>
{:else if status === 'error'}
  <div class="loading">
    <p>Something went wrong.</p>
    <small>{message}</small>
  </div>
{:else}
  {#if route === 'admin'}
    <AdminPanel brand={site.brand} siteData={site} on:exit-to-site={handleAdminExit} />
  {:else}
    <TopBar
      brand={site.brand}
      nav={site.nav}
      {theme}
      on:toggle-theme={handleThemeToggle}
      on:nav-select={handlePrimaryNav}
    />
    <main class="page" data-view={activeView}>
      {#if activeView === 'portfolio'}
        <div class="transition-shell animate-enter" data-anim="fade">
          <FullPortfolio cases={fullPortfolio} on:close={closePortfolioView} />
        </div>
      {:else if activeView === 'contact'}
        <div class="transition-shell animate-enter" data-anim="fade">
          <section class="contact-view">
            <div class="contact-view__inner">
              <div class="contact-view__actions">
                <button type="button" class="btn btn--ghost" on:click={closeContactView}>
                  ⟵ Back to main site
                </button>
              </div>
              <ContactSection contact={site.contact} variant="page" />
            </div>
          </section>
        </div>
      {:else}
        <div class="transition-shell animate-enter" data-anim="fade">
          <HeroSection hero={site.hero} />
          <PortfolioWall cases={site.portfolio} on:expand={openPortfolioView} />
          <ServiceGrid services={site.services} />
          <ApproachTimeline approach={site.approach} />
          <PartnerBand partners={site.partners} />
          <TestimonialsPanel testimonials={site.testimonials} />
        </div>
      {/if}
    </main>
    <SiteFooter brand={site.brand} nav={site.nav} />
  {/if}
{/if}

<style>
  .loading {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 2rem;
    background: var(--body-gradient);
  }

  .loading__inner {
    display: grid;
    gap: 1.25rem;
    justify-items: center;
  padding: 2.5rem 3rem;
    border-radius: 30px;
    border: 1px solid var(--surface-panel-border);
    background: var(--surface-panel);
    box-shadow: 0 25px 70px rgba(8, 12, 22, 0.2);
    backdrop-filter: blur(18px);
  }

  .loading p {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
    color: var(--color-text);
    letter-spacing: 0.02em;
  }

  .spinner {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.08);
    border-top-color: var(--color-accent);
    position: relative;
    animation: spin 1s linear infinite;
  }

  .spinner::after {
    content: '';
    position: absolute;
    inset: 6px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(36, 192, 255, 0.35), transparent 65%);
    filter: blur(1px);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  :global(:root[data-theme='light']) .loading__inner {
    box-shadow: 0 25px 70px rgba(28, 40, 68, 0.15);
  }

  :global(:root[data-theme='light']) .spinner {
    border: 3px solid rgba(17, 20, 33, 0.08);
  }

  .contact-view {
    min-height: calc(100vh - 160px);
    padding: 4.5rem 1.5rem 5rem;
  }

  .contact-view__inner {
    max-width: var(--max-width);
    margin: 0 auto;
    display: grid;
    gap: 1.75rem;
    justify-items: center;
  }

  .contact-view__actions {
    display: flex;
    justify-content: center;
  }

  .contact-view__actions :global(.btn) {
    width: auto;
  }

  @media (max-width: 600px) {
    .loading__inner {
      padding: 1.5rem 1.75rem;
      border-radius: 22px;
      gap: 0.9rem;
    }

    .loading p {
      font-size: 0.95rem;
      text-align: center;
    }

    .spinner {
      width: 46px;
      height: 46px;
    }

    .contact-view {
      padding: 3.5rem 1.1rem 4rem;
    }

    .contact-view__actions {
      justify-content: center;
    }
  }
</style>
