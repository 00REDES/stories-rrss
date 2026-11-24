import { updateLayer, getLayer } from '../engine/state.js';
import { GRADIENT_PRESETS, DEFAULT_GRADIENT_STOPS, GRADIENT_MAX_STOPS, sortedStops } from '../engine/gradient.js';
import { icon } from './icons.js';

// Panel del generador de degradados de legibilidad (negro → transparente, 9:16).
// Controles: preajustes, desde qué borde nace, tramo (cuánta altura ocupa),
// opacidad máxima y los puntos del degradado (posición + opacidad de cada uno).

const SIDES = [
  { key: 'bottom', label: 'Abajo' },
  { key: 'top', label: 'Arriba' },
  { key: 'both', label: 'Los dos' },
];

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// slider con su valor en % (usa los estilos ya existentes de los sliders del panel de stickers)
function slider(label, { min = 0, max = 100, value, onInput }) {
  const row = el('label', 'cp-slider');
  const text = el('span', 'cp-slider-text', `${label} `);
  const out = el('b', '', `${Math.round(value)}%`);
  text.appendChild(out);
  const input = el('input');
  Object.assign(input, { type: 'range', min, max, step: 1, value: Math.round(value) });
  input.addEventListener('input', () => { out.textContent = `${input.value}%`; onInput(Number(input.value)); });
  row.appendChild(text);
  row.appendChild(input);
  return row;
}

export function renderGradientPanel(container, { layer, onChange, onDownload }) {
  const id = layer.id;
  const cur = () => getLayer(id) || layer;
  const patch = (p) => { updateLayer(id, p); onChange(); };
  const rerender = () => renderGradientPanel(container, { layer: cur(), onChange, onDownload });

  container.innerHTML = '';
  const l = cur();
  const side = l.gradSide || 'bottom';
  const stops = sortedStops(l.gradStops);
  // lo guardado queda en el mismo orden que se ve, para que cada slider edite su punto
  updateLayer(id, { gradStops: stops.map((x) => ({ ...x })) }, { history: false });

  const g = el('div', 'prop-group');
  g.appendChild(el('p', 'hint', 'Degradado de negro a transparente en formato 9:16. Descárgalo y ponlo en la story debajo de los stickers y textos que quieras que se lean mejor.'));

  // preajustes
  const presets = el('div', 'toggle-row');
  GRADIENT_PRESETS.forEach((p) => {
    const b = el('button', '', p.label);
    b.type = 'button';
    if (Math.abs((l.gradLength ?? 0) - p.gradLength) < 0.001 && Math.abs((l.gradOpacity ?? 0) - p.gradOpacity) < 0.001) b.classList.add('active');
    b.addEventListener('click', () => {
      const max = side === 'both' ? 0.5 : 1;
      patch({ gradLength: Math.min(p.gradLength, max), gradOpacity: p.gradOpacity, gradStops: DEFAULT_GRADIENT_STOPS.map((s) => ({ ...s })) });
      rerender();
    });
    presets.appendChild(b);
  });
  g.appendChild(presets);

  // desde qué borde
  const sideRow = el('div', 'toggle-row');
  sideRow.style.marginTop = '10px';
  SIDES.forEach((s) => {
    const b = el('button', side === s.key ? 'active' : '', s.label);
    b.type = 'button';
    b.addEventListener('click', () => {
      const p = { gradSide: s.key };
      if (s.key === 'both' && (l.gradLength ?? 0.5) > 0.5) p.gradLength = 0.5; // dos tramos no caben más de media altura cada uno
      patch(p);
      rerender();
    });
    sideRow.appendChild(b);
  });
  g.appendChild(sideRow);

  const maxLen = side === 'both' ? 50 : 100;
  g.appendChild(slider('Tramo', { min: 5, max: maxLen, value: Math.min((l.gradLength ?? 0.5) * 100, maxLen), onInput: (v) => patch({ gradLength: v / 100 }) }));
  g.appendChild(slider('Opacidad', { min: 0, max: 100, value: (l.gradOpacity ?? 0.8) * 100, onInput: (v) => patch({ gradOpacity: v / 100 }) }));
  container.appendChild(g);

  // puntos del degradado
  const pg = el('div', 'prop-group');
  pg.appendChild(el('strong', '', 'Puntos'));
  pg.appendChild(el('p', 'hint', 'Cada punto marca cuánto negro hay en un sitio del tramo: 0 % es el borde y 100 % el final del tramo.'));
  const save = (next) => patch({ gradStops: next });
  stops.forEach((s, i) => {
    const card = el('div', 'grad-stop');
    const head = el('div', 'cp-shadow-head');
    head.appendChild(el('span', 'cp-shadow-label', `Punto ${i + 1}`));
    if (stops.length > 2) {
      const del = el('button', 'cp-round');
      del.type = 'button';
      del.innerHTML = icon('trash', 20);
      del.setAttribute('aria-label', `Quitar el punto ${i + 1}`);
      del.addEventListener('click', () => { save(stops.filter((_, k) => k !== i)); rerender(); });
      head.appendChild(del);
    }
    card.appendChild(head);
    // las ediciones en vivo no repintan el panel (se perdería el dedo del slider);
    // el orden lo arregla sortedStops al dibujar
    const live = () => cur().gradStops.map((x) => ({ pos: x.pos, op: x.op }));
    card.appendChild(slider('Posición', { value: s.pos * 100, onInput: (v) => { const n = live(); n[i].pos = v / 100; save(n); } }));
    card.appendChild(slider('Opacidad', { value: s.op * 100, onInput: (v) => { const n = live(); n[i].op = v / 100; save(n); } }));
    pg.appendChild(card);
  });
  if (stops.length < GRADIENT_MAX_STOPS) {
    const add = el('button', 'btn small');
    add.type = 'button';
    add.style.cssText = 'width:100%;margin-top:10px';
    add.innerHTML = `${icon('plus', 18)} Añadir punto`;
    add.addEventListener('click', () => {
      // nuevo punto en mitad del hueco más grande, con la opacidad que ya tiene el degradado ahí
      let at = 0;
      let gap = -1;
      for (let i = 0; i < stops.length - 1; i += 1) {
        const d = stops[i + 1].pos - stops[i].pos;
        if (d > gap) { gap = d; at = i; }
      }
      const a = stops[at];
      const b = stops[at + 1] || a;
      save([...stops, { pos: (a.pos + b.pos) / 2, op: (a.op + b.op) / 2 }]);
      rerender();
    });
    pg.appendChild(add);
  }
  const reset = el('button', 'btn small');
  reset.type = 'button';
  reset.style.cssText = 'width:100%;margin-top:8px';
  reset.textContent = 'Volver a los puntos de fábrica';
  reset.addEventListener('click', () => { save(DEFAULT_GRADIENT_STOPS.map((s) => ({ ...s }))); rerender(); });
  pg.appendChild(reset);
  container.appendChild(pg);

  const dl = el('button', 'btn');
  dl.type = 'button';
  dl.style.cssText = 'width:100%;margin-top:12px';
  dl.innerHTML = `${icon('download', 20)} Descargar degradado (PNG 9:16)`;
  dl.addEventListener('click', onDownload);
  container.appendChild(dl);
}
