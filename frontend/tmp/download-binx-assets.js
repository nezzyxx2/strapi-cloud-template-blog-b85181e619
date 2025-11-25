import { writeFile } from 'node:fs/promises';

const assetUrl = 'https://binx.cc/assets/index-c-qXKp66.js';
const res = await fetch(assetUrl);
if (!res.ok) {
  console.error('Failed to fetch asset', res.status, res.statusText);
  process.exit(1);
}
const js = await res.text();
await writeFile('tmp/binx-app.js', js, 'utf8');
console.log('Saved asset with length', js.length);
