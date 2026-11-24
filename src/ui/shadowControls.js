import { getState, updateLayer } from '../engine/state.js';
import { SHADOW_FALLBACK } from '../engine/shadow.js';

// Controles de la sombra difusa (interruptor + opacidad, difuminado y
// distancia en %). Valen para una capa o para varias que se tratan como un
// solo sticker (todas reciben los mismos valores). Los cambios se ven en vivo.
//   targetIds: capas que reciben la sombra
//   onChange:  redibuja el lienzo (se llama en cada paso de slider)
//   rerender:  vuelve a pintar el panel (al activar/desactivar)

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function shadowControls(targetIds, { onChange, rerender }) {
  const wrap = el('div', 'shadow-controls');
  const layersNow = () => targetIds.map((id) => getState().layers.find((l) => l.id === id)).filter(Boolean);
  const first = layersNow()[0];
  if (!first) return wrap;
  const patchAll = (patch) => layersNow().forEach((l) => updateLayer(l.id, patch));

  const top = el('div', 'cp-shadow-head');
  const sw = el('button', 'cp-switch' + (first.shadowOn ? ' on' : ''));
  sw.type = 'button';
  sw.setAttribute('role', 'switch');
  sw.setAttribute('aria-checked', String(!!first.shadowOn));
  sw.setAttribute('aria-label', 'Sombra');
  sw.appendChild(el('i'));
  sw.addEventListener('click', () => {
    const on = !(layersNow()[0] || first).shadowOn;
    const f = layersNow()[0] || first;
    patchAll(on ? {
      shadowOn: true,
      shadowOpacity: f.shadowOpacity ?? SHADOW_FALLBACK.shadowOpacity,
      shadowBlurPct: f.shadowBlurPct ?? SHADOW_FALLBACK.shadowBlurPct,
      shadowDistPct: f.shadowDistPct ?? SHADOW_FALLBACK.shadowDistPct,
    } : { shadowOn: false });
    onChange();
    rerender();
  });
  top.appendChild(el('span', 'cp-shadow-label', first.shadowOn ? 'Activada' : 'Desactivada'));
  top.appendChild(sw);
  wrap.appendChild(top);

  if (first.shadowOn) {
    const slider = (label, key, fallback, max) => {
      const row = el('label', 'cp-slider');
      const isOpacity = key === 'shadowOpacity';
      const value = Math.round((first[key] ?? fallback) * (isOpacity ? 100 : 1));
      const text = el('span', 'cp-slider-text', `${label} `);
      const out = el('b', '', `${value}%`);
      text.appendChild(out);
      const input = el('input');
      Object.assign(input, { type: 'range', min: 0, max, step: 1, value });
      input.addEventListener('input', () => {
        out.textContent = `${input.value}%`;
        patchAll({ [key]: isOpacity ? Number(input.value) / 100 : Number(input.value) });
        onChange();
      });
      row.appendChild(text);
      row.appendChild(input);
      return row;
    };
    wrap.appendChild(slider('Opacidad', 'shadowOpacity', SHADOW_FALLBACK.shadowOpacity, 100));
    wrap.appendChild(slider('Difuminado', 'shadowBlurPct', SHADOW_FALLBACK.shadowBlurPct, 100));
    wrap.appendChild(slider('Distancia', 'shadowDistPct', SHADOW_FALLBACK.shadowDistPct, 100));
  }
  return wrap;
}

// Bloque con título «Sombra», con el aspecto de los paneles de propiedades
export function shadowGroup(targetIds, opts) {
  const g = el('div', 'prop-group');
  g.appendChild(el('strong', '', 'Sombra'));
  g.appendChild(shadowControls(targetIds, opts));
  return g;
}
