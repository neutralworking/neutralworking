import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { systems, worklist } from '../config.js';
import { extractPage } from '../lib/extract.js';
import { normalise } from '../lib/normalise.js';

await mkdir('out/extract', { recursive: true });
const browser = await chromium.launch();

for (const sysKey of ['alpha', 'bravo']) {
  const sys = systems[sysKey];
  const ctx = await browser.newContext({ storageState: sys.storageState });
  for (const item of worklist) {
    const url = sys.baseURL + item[sysKey].replace('{platform}', item.platform);
    try {
      const out = normalise(await extractPage(ctx, url));
      await writeFile(`out/extract/${item.module}.${sysKey}.json`, JSON.stringify(out, null, 2));
      console.log(`ok  ${sysKey}/${item.module}  ${out.fields.length} fields`);
    } catch (e) {
      console.log(`ERR ${sysKey}/${item.module}  ${e.message}`);
    }
  }
  await ctx.close();
}
await browser.close();
