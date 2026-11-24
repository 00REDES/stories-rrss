// Degradado de legibilidad (negro → transparente). Una capa 'gradient' con
// gradStops lo describe así:
//   gradSide     'bottom' | 'top' | 'both'  desde qué borde nace
//   gradLength   0.05–1  tramo: cuánto de la altura ocupa (en 'both', por lado)
//   gradOpacity  0–1     opacidad máxima, en el borde
//   gradStops    [{ pos, op }]  puntos del degradado: pos 0 = borde, 1 = final
//                del tramo; op = opacidad relativa (1 = la máxima, 0 = nada)
// Las capas de degradado antiguas (sin gradStops) siguen pintándose como antes.

export const GRADIENT_PRESETS = [
  { key: 'soft', label: 'Suave', gradLength: 0.45, gradOpacity: 0.6 },
  { key: 'medium', label: 'Medio', gradLength: 0.55, gradOpacity: 0.8 },
  { key: 'strong', label: 'Fuerte', gradLength: 0.65, gradOpacity: 0.95 },
];

// curva suave (sin escalón visible al pasar de negro a transparente)
export const DEFAULT_GRADIENT_STOPS = [
  { pos: 0, op: 1 },
  { pos: 0.25, op: 0.74 },
  { pos: 0.5, op: 0.42 },
  { pos: 0.75, op: 0.15 },
  { pos: 1, op: 0 },
];

export const GRADIENT_MAX_STOPS = 8;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function sortedStops(stops) {
  const list = (stops && stops.length ? stops : DEFAULT_GRADIENT_STOPS).map((s) => ({ pos: clamp(Number(s.pos) || 0, 0, 1), op: clamp(Number(s.op) || 0, 0, 1) }));
  return list.sort((a, b) => a.pos - b.pos);
}

// Lista plana [offset, color, offset, color…] para Konva sobre TODA la altura
// de la capa (0 = arriba, 1 = abajo). toRgba(hex, alpha) la pone el renderer.
export function gradientColorStops(d, toRgba) {
  const color = d.color || '#000000';
  if (!d.gradStops) return [0, toRgba(color, 0), 1, toRgba(color, 0.92)]; // degradado antiguo
  const side = d.gradSide || 'bottom';
  const maxLen = side === 'both' ? 0.5 : 1;
  const len = clamp(d.gradLength ?? 0.5, 0.05, maxLen);
  const maxOp = clamp(d.gradOpacity ?? 0.8, 0, 1);
  const edge = sortedStops(d.gradStops).map((s) => ({ dist: s.pos * len, a: s.op * maxOp }));

  const pts = [];
  if (side === 'top' || side === 'both') edge.forEach((e) => pts.push({ off: e.dist, a: e.a }));
  if (side === 'bottom' || side === 'both') edge.forEach((e) => pts.push({ off: 1 - e.dist, a: e.a }));
  pts.sort((a, b) => a.off - b.off);
  // el lienzo entero tiene que estar cubierto: lo que queda fuera del tramo es transparente
  if (pts[0].off > 0) pts.unshift({ off: 0, a: 0 });
  if (pts[pts.length - 1].off < 1) pts.push({ off: 1, a: 0 });

  const out = [];
  pts.forEach((p) => { out.push(clamp(p.off, 0, 1), toRgba(color, +p.a.toFixed(4))); });
  return out;
}
