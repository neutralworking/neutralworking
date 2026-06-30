// Serialised into the page — keep self-contained, no imports.
export function pageExtractor() {
  const out = { components: [], controls: [] };

  // v3 dehydrated tuple [value, meta] → value
  const unwrap = (v) =>
    Array.isArray(v) && v.length === 2 && v[1] && typeof v[1] === 'object' && ('s' in v[1] || 'class' in v[1])
      ? v[0]
      : v;

  // Livewire v3
  document.querySelectorAll('[wire\\:snapshot]').forEach((el) => {
    try {
      const s = JSON.parse(el.getAttribute('wire:snapshot'));
      const data = {};
      for (const [k, val] of Object.entries(s?.data ?? {})) data[k] = unwrap(val);
      out.components.push({ v: 3, name: s?.memo?.name, data });
    } catch {}
  });

  // Livewire v2
  document.querySelectorAll('[wire\\:initial-data]').forEach((el) => {
    try {
      const d = JSON.parse(el.getAttribute('wire:initial-data'));
      out.components.push({ v: 2, name: d?.fingerprint?.name, data: d?.serverMemo?.data ?? {} });
    } catch {}
  });

  document.querySelectorAll('input, select, textarea').forEach((el) => {
    const m = [...el.attributes].find((a) => a.name.startsWith('wire:model'));
    const ctrl = {
      tag: el.tagName.toLowerCase(),
      type: el.type || null,
      name: el.getAttribute('name') || null,
      model: m ? m.value : null,
      required: el.hasAttribute('required') || null,
      constraints: {
        min: el.getAttribute('min'),
        max: el.getAttribute('max'),
        step: el.getAttribute('step'),
        maxlength: el.getAttribute('maxlength'),
        pattern: el.getAttribute('pattern'),
      },
    };
    if (el.tagName === 'SELECT') {
      ctrl.options = [...el.options].map((o, i) => ({ value: o.value, label: o.textContent.trim(), order: i }));
      ctrl.multiple = el.multiple;
      // combobox/search affordance near the control → likely dynamic
      ctrl.searchable = !!el.closest('div,fieldset')?.querySelector('input[type=search],input[placeholder*="search" i]');
    }
    const cond = el.closest('[x-show],[x-if]');
    if (cond) ctrl.conditional = cond.getAttribute('x-show') || cond.getAttribute('x-if');
    out.controls.push(ctrl);
  });

  return out;
}

export async function extractPage(ctx, url) {
  const page = await ctx.newPage();
  const network = [];
  page.on('response', (r) => {
    if (r.request().resourceType() === 'fetch' && r.url().includes('/api/')) network.push(r.url());
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.Livewire !== undefined, { timeout: 10000 }).catch(() => {});
  const raw = await page.evaluate(pageExtractor);
  await page.close();
  return { url, network, ...raw };
}
