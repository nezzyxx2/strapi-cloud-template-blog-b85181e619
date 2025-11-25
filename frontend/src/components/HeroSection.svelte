<script>
  import { onDestroy } from 'svelte';
  import { cubicOut } from 'svelte/easing';

  export let hero;

  let pointerX = 50;
  let pointerY = 50;
  let targetX = 50;
  let targetY = 50;
  let pointerActive = false;
  let frameId;
  let animationFrame;
  let displayMetrics = [];

  const animationSettings = {
    duration: 1200,
    stagger: 160
  };

  function animatePointer() {
    const dx = targetX - pointerX;
    const dy = targetY - pointerY;

    pointerX += dx * 0.12;
    pointerY += dy * 0.12;

    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      frameId = requestAnimationFrame(animatePointer);
    } else {
      pointerX = targetX;
      pointerY = targetY;
      frameId = null;
    }
  }

  function requestPointerUpdate() {
    if (!frameId) {
      frameId = requestAnimationFrame(animatePointer);
    }
  }

  function handlePointer(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    targetX = ((event.clientX - rect.left) / rect.width) * 100;
    targetY = ((event.clientY - rect.top) / rect.height) * 100;
    pointerActive = true;
    requestPointerUpdate();
  }

  function handleLeave() {
    targetX = 50;
    targetY = 50;
    pointerActive = false;
    requestPointerUpdate();
  }

  onDestroy(() => {
    if (frameId) cancelAnimationFrame(frameId);
    cancelCountUp();
  });

  $: if (hero?.metrics) {
    setupMetrics(hero.metrics);
  }

  function cancelCountUp() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  function setupMetrics(metrics = []) {
    cancelCountUp();
    const parsed = metrics.map(parseMetric);

    if (typeof window === 'undefined') {
      displayMetrics = parsed.map((metric) => ({ ...metric, display: metric.raw }));
      return;
    }

    const start = performance.now();

    const updateDisplay = (now) => {
      let complete = true;

      displayMetrics = parsed.map((metric, index) => {
        if (metric.numeric === null) {
          return { ...metric, display: metric.raw };
        }

        const elapsed = now - start - animationSettings.stagger * index;
        const progress = clamp(elapsed / animationSettings.duration);
        if (progress < 1) {
          complete = false;
        }
        const eased = cubicOut(progress);
        const formatted = formatMetric(metric, eased);
        return { ...metric, display: formatted };
      });

      if (!complete) {
        animationFrame = requestAnimationFrame(updateDisplay);
      } else {
        animationFrame = null;
      }
    };

    displayMetrics = parsed.map((metric) => ({
      ...metric,
      display: metric.numeric === null ? metric.raw : formatMetric(metric, 0)
    }));

    animationFrame = requestAnimationFrame(updateDisplay);
  }

  function formatMetric(metric, progress) {
    if (metric.numeric === null) return metric.raw;
    const value = metric.numeric * progress;
    let displayNumber;

    if (metric.decimals > 0) {
      const precise = Number(value.toFixed(metric.decimals));
      displayNumber = precise.toLocaleString(undefined, {
        minimumFractionDigits: metric.decimals,
        maximumFractionDigits: metric.decimals
      });
    } else {
      displayNumber = Math.round(value).toLocaleString();
    }

    return `${metric.prefix}${displayNumber}${metric.suffix}`;
  }

  function parseMetric(metric) {
    const raw = metric?.value?.toString().trim() ?? '';
    const match = raw.match(/^([^\d-]*)([\d.,]+)?(.*)$/);
    if (!match) {
      return { label: metric?.label, raw, prefix: '', suffix: '', numeric: null, decimals: 0 };
    }

    const [, prefix, numberPart, suffix] = match;
    if (!numberPart) {
      return { label: metric?.label, raw, prefix, suffix, numeric: null, decimals: 0 };
    }

    const cleaned = parseFloat(numberPart.replace(/,/g, ''));
    if (Number.isNaN(cleaned)) {
      return { label: metric?.label, raw, prefix, suffix, numeric: null, decimals: 0 };
    }

    const decimals = numberPart.includes('.') ? numberPart.split('.')[1].length : 0;

    return {
      label: metric?.label,
      raw,
      prefix,
      suffix,
      numeric: cleaned,
      decimals
    };
  }

  function clamp(value) {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
  }

</script>

<section
  id="landing"
  class="section hero"
  style={`--pointer-x: ${pointerX}%; --pointer-y: ${pointerY}%;`}
  data-pointer={pointerActive ? 'active' : 'idle'}
  on:pointermove={handlePointer}
  on:pointerleave={handleLeave}
>
  <div class="section__inner hero__inner">
    <div class="hero__aurora hero__aurora--primary" aria-hidden="true"></div>
    <div class="hero__aurora hero__aurora--secondary" aria-hidden="true"></div>
    <div class="hero__content animate-enter" data-anim="fade-up">
      <div class="hero__spotlight" aria-hidden="true"></div>
      <p class="eyebrow">{hero?.eyebrow}</p>
      <h1>{hero?.title}</h1>
      <p class="hero__subtitle">{hero?.subtitle}</p>
      <div class="hero__actions">
        <a class="btn btn--primary" href={hero?.primary?.href}>{hero?.primary?.label}</a>
        <a class="btn btn--ghost" href={hero?.secondary?.href}>{hero?.secondary?.label}</a>
        <a class="btn btn--primary hero__contact-mobile" href="#contact">Contact us</a>
      </div>
      <div class="hero__metrics">
        {#each displayMetrics as metric, index (metric.label ?? index)}
          <div class="metric animate-enter" style={`--animate-order: ${index + 1}`}
            data-anim="fade-up">
            <strong>{metric.display}</strong>
            <span>{metric.label}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>

<style>
  .hero {
    padding-top: 7rem;
    position: relative;
    overflow: hidden;
    background: var(--hero-background);
    border-bottom: 1px solid var(--hero-border);
  }

  .hero::before {
    content: '';
    position: absolute;
    inset: -15%;
    background: radial-gradient(
      circle at var(--pointer-x, 50%) var(--pointer-y, 50%),
      rgba(36, 192, 255, 0.32) 0%,
      rgba(36, 192, 255, 0.18) 20%,
      rgba(22, 110, 255, 0.12) 38%,
      transparent 62%
    );
    opacity: 0.22;
    transition: opacity 0.4s ease;
    mix-blend-mode: screen;
    pointer-events: none;
    z-index: 0;
  }

  .hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: linear-gradient(0deg, rgba(255, 255, 255, 0.04) 1px, transparent 0),
      linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 0);
    background-size: 36px 36px;
    opacity: 0.07;
    mix-blend-mode: overlay;
    pointer-events: none;
    z-index: 0;
  }

  .hero[data-pointer='active']::before {
    opacity: 0.7;
  }

  .hero[data-pointer='idle']::before {
    opacity: 0.28;
  }

  .hero__inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;
    z-index: 1;
  }

  .hero__aurora {
    position: absolute;
    top: -6rem;
    left: 50%;
    width: 130%;
    height: 460px;
    transform: translateX(-50%) skewX(-8deg);
    opacity: 0.45;
    filter: blur(60px);
    pointer-events: none;
    mix-blend-mode: screen;
    z-index: 0;
  }

  .hero__aurora--primary {
    background: linear-gradient(120deg, rgba(89, 247, 255, 0.32), rgba(126, 118, 255, 0.35));
    animation: auroraSweep 26s ease-in-out infinite;
  }

  .hero__aurora--secondary {
    top: -3rem;
    height: 420px;
    background: linear-gradient(100deg, rgba(255, 193, 149, 0.25), rgba(32, 55, 255, 0.22));
    transform: translateX(-45%) skewX(-14deg);
    opacity: 0.35;
    animation: auroraRise 32s ease-in-out infinite;
  }

  .hero__content {
    max-width: 720px;
    position: relative;
    z-index: 1;
  }

  .hero__spotlight {
    position: absolute;
    top: -7rem;
    left: 50%;
    width: min(680px, 90vw);
    height: 420px;
    transform: translateX(-50%);
    background: radial-gradient(circle at var(--spotlight-x, 50%) var(--spotlight-y, 35%),
        rgba(64, 210, 255, 0.45) 0%,
        rgba(84, 92, 255, 0.35) 35%,
        rgba(6, 12, 40, 0) 70%);
    opacity: 0.55;
    filter: blur(50px);
    animation: heroSpotlightDrift 16s ease-in-out infinite alternate;
    mix-blend-mode: screen;
    pointer-events: none;
    z-index: -1;
  }

  h1 {
    margin-top: 0.5rem;
    font-size: clamp(3.4rem, 6.5vw, 5rem);
    font-weight: 600;
  }

  .hero__subtitle {
    font-size: 1.1rem;
    max-width: 560px;
    margin: 1.6rem auto 2.6rem;
    color: var(--hero-subtitle);
  }



  .hero__actions {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 2.6rem;
    --cta-motion: running;
  }

  .hero__actions a {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
    animation: heroCtaFloat 0.9s cubic-bezier(0.23, 1, 0.32, 1) forwards;
    animation-play-state: var(--cta-motion);
    will-change: transform, opacity;
  }

  .hero__actions a:nth-child(1) {
    animation-delay: 0.12s;
  }

  .hero__actions a:nth-child(2) {
    animation-delay: 0.28s;
  }

  .hero__contact-mobile {
    display: none;
  }

  .hero__metrics {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 2.8rem;
  }

  @keyframes heroSpotlightDrift {
    0% {
      --spotlight-x: 45%;
      --spotlight-y: 25%;
      opacity: 0.45;
    }
    50% {
      --spotlight-x: 60%;
      --spotlight-y: 40%;
      opacity: 0.6;
    }
    100% {
      --spotlight-x: 35%;
      --spotlight-y: 30%;
      opacity: 0.5;
    }
  }

  @keyframes heroCtaFloat {
    0% {
      opacity: 0;
      transform: translateY(18px) scale(0.96);
    }
    60% {
      opacity: 1;
      transform: translateY(-3px) scale(1.01);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes auroraSweep {
    0% {
      transform: translateX(-55%) skewX(-8deg) translateY(0);
    }
    50% {
      transform: translateX(-45%) skewX(-4deg) translateY(12px);
    }
    100% {
      transform: translateX(-60%) skewX(-10deg) translateY(-6px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero__spotlight {
      animation: none;
      opacity: 0.35;
    }

    .hero__aurora--primary,
    .hero__aurora--secondary {
      animation: none;
    }

    .hero__actions {
      --cta-motion: paused;
    }

    .hero__actions a {
      opacity: 1;
      transform: none;
    }
  }

  .metric {
    min-width: 120px;
  }

  .metric strong {
    display: block;
    font-size: 1.75rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .metric span {
    display: block;
    margin-top: 0.35rem;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--hero-metric-label);
  }

  @media (max-width: 960px) {
    .hero {
      padding-top: 5rem;
    }

    .hero__subtitle {
      font-size: 1.05rem;
    }

  }

  @media (max-width: 720px) {
    .hero {
      padding-top: 5rem;
    }

    .hero__inner {
      align-items: center;
      text-align: center;
      gap: 2.4rem;
    }

    .hero__content {
      text-align: center;
      width: 100%;
      padding: 0 0.5rem;
    }

    .hero__subtitle {
      font-size: 1rem;
      margin: 1.2rem auto 2rem;
    }

    .hero__actions {
      display: grid;
      width: min(420px, 100%);
      gap: 0.85rem;
      margin: 0 auto 2.2rem;
    }

    .hero__metrics {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.25rem;
      margin-inline: auto;
    }

    .metric {
      flex: unset;
      max-width: none;
      padding: 1.1rem 1rem;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(12, 15, 22, 0.55);
      box-shadow: 0 20px 45px rgba(8, 12, 22, 0.26);
    }

    .metric strong {
      font-size: 1.5rem;
    }
  }

  @media (max-width: 720px) {
    :global(:root[data-theme='light']) .metric {
      background: rgba(255, 255, 255, 0.9);
      border-color: rgba(17, 20, 33, 0.08);
      box-shadow: 0 20px 45px rgba(28, 40, 68, 0.18);
    }
  }

  @media (max-width: 720px) {
    .hero__contact-mobile {
      display: inline-flex;
      width: 100%;
    }
  }

  @media (max-width: 560px) {
    h1 {
      font-size: clamp(2.4rem, 9vw, 3.2rem);
    }

    .hero__subtitle {
      font-size: 0.98rem;
      margin: 1rem 0 1.8rem;
    }

    .hero__actions {
      gap: 0.75rem;
    }

    .metric strong {
      font-size: 1.35rem;
    }
  }

  @media (max-width: 520px) {
    .hero__metrics {
      grid-template-columns: 1fr;
      max-width: 340px;
    }
  }
</style>
