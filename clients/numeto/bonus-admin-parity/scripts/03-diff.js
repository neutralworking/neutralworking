import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { worklist } from '../config.js';
import { diffModule, toMarkdown } from '../lib/diff.js';

await mkdir('out/diff', { recursive: true });
let md = '# Bravo -> Alpha field parity (auto-generated)\n';
for (const { module } of worklist) {
  try {
    const a = JSON.parse(await readFile(`out/extract/${module}.alpha.json`));
    const b = JSON.parse(await readFile(`out/extract/${module}.bravo.json`));
    const r = diffModule(a, b);
    await writeFile(`out/diff/${module}.json`, JSON.stringify(r, null, 2));
    md += '\n' + toMarkdown(module, r);
  } catch (e) {
    md += `\n## ${module}\n- skipped: ${e.message}\n`;
  }
}
await writeFile('out/diff/parity.md', md);
console.log('-> out/diff/parity.md');
