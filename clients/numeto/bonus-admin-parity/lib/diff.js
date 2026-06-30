export function diffModule(alpha, bravo) {
  const idx = (m) => Object.fromEntries(m.fields.map((f) => [f.key, f]));
  const A = idx(alpha), B = idx(bravo);
  const report = { add: [], deprecate: [], drift: [], aligned: [] };

  for (const k of Object.keys(A)) {
    if (!(k in B)) { report.add.push(A[k].path); continue; }
    const a = A[k], b = B[k], issues = [];
    if (a.type !== b.type) issues.push(`type ${a.type} -> ${b.type}`);
    if (a.dynamic !== b.dynamic) issues.push(`dynamic ${a.dynamic} -> ${b.dynamic}`);
    if (a.options && b.options &&
        JSON.stringify(a.options.map((o) => o.value)) !== JSON.stringify(b.options.map((o) => o.value)))
      issues.push('enum options differ');
    if (JSON.stringify(a.default) !== JSON.stringify(b.default))
      issues.push(`default ${JSON.stringify(a.default)} -> ${JSON.stringify(b.default)}`);
    issues.length ? report.drift.push({ path: a.path, issues }) : report.aligned.push(a.path);
  }
  for (const k of Object.keys(B)) if (!(k in A)) report.deprecate.push(B[k].path);
  return report;
}

export function toMarkdown(module, r) {
  const sec = (t, arr, fmt = (x) => `- ${x}`) => (arr.length ? `\n### ${t}\n${arr.map(fmt).join('\n')}\n` : '');
  return (
    `## ${module}\n` +
    sec('Add to Bravo (Alpha-only)', r.add) +
    sec('Deprecation candidates (Bravo-only -> FE usage check)', r.deprecate) +
    sec('Contract drift', r.drift, (d) => `- ${d.path}: ${d.issues.join('; ')}`) +
    sec('Aligned', r.aligned)
  );
}
