import { writeFile } from 'node:fs/promises';

const assetUrl = 'https://binx.cc/assets/AiChat-C5UzZZJ9.js';
const res = await fetch(assetUrl);
if (!res.ok) {
  console.error('Failed to fetch AI asset', res.status, res.statusText);
  process.exit(1);
}
const js = await res.text();
await writeFile('tmp/binx-ai.js', js, 'utf8');
console.log('Saved AI asset with length', js.length);
