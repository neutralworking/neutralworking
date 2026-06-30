import { dynamicEndpointHints } from '../config.js';

// Fold hyphen/underscore + trailing plural so naming drift matches across systems.
const norm = (k) => (k || '').replace(/[-_]/g, '').toLowerCase().replace(/s$/, '');

export function normalise(extracted) {
  const dataByProp = {};
  for (const c of extracted.components)
    for (const [k, v] of Object.entries(c.data || {})) dataByProp[k] = v;

  const fields = extracted.controls
    .map((ctrl) => {
      const path = ctrl.model || ctrl.name;
      const def = path ? dataByProp[path.split('.')[0]] : undefined;
      const dynamic = ctrl.options
        ? ctrl.searchable ||
          ctrl.options.length <= 1 ||
          dynamicEndpointHints.some((h) => extracted.network.some((u) => u.includes(h)))
        : false;
      return {
        path,
        key: norm(path),
        type: ctrl.tag === 'select' ? 'select' : ctrl.type || ctrl.tag,
        default: def ?? null,
        required: ctrl.required,
        options: ctrl.options && !dynamic ? ctrl.options : undefined, // keep options only for static enums
        dynamic: ctrl.options ? dynamic : undefined,
        conditional: ctrl.conditional,
        constraints: ctrl.constraints,
      };
    })
    .filter((f) => f.path);

  return { url: extracted.url, fields };
}
