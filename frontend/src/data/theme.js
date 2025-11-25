export function applyPalette(palette = {}, mode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode) {
    root.dataset.theme = mode;
  }

  Object.entries(palette).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key.toLowerCase()}`, value);
  });
}
