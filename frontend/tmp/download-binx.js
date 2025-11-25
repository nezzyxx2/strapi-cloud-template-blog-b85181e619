import { writeFile } from 'node:fs/promises';

const res = await fetch('https://binx.cc/ai-chat');
const html = await res.text();
await writeFile('tmp/binx.html', html, 'utf8');
console.log('Saved', html.length, 'chars');
