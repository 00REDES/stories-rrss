// Sombra difusa opcional de textos y stickers. Los valores se guardan en la
// capa (shadowOn, shadowOpacity, shadowBlurPct, shadowDistPct) y se traducen a
// píxeles aquí, en un solo sitio, para que el lienzo, el PNG exportado y la
// descarga de los stickers ya hechos den exactamente la misma sombra.

export const SHADOW_FALLBACK = { shadowOpacity: 0.5, shadowBlurPct: 35, shadowDistPct: 20 };

// `base` = lado corto del elemento/lienzo sobre el que se mide el porcentaje.
export function shadowMetrics(d, base) {
  const blurPct = d.shadowBlurPct ?? SHADOW_FALLBACK.shadowBlurPct;
  const distPct = d.shadowDistPct ?? SHADOW_FALLBACK.shadowDistPct;
  return {
    blur: (blurPct / 100) * base * 0.05,
    dist: (distPct / 100) * base * 0.03,
    opacity: d.shadowOpacity ?? SHADOW_FALLBACK.shadowOpacity,
  };
}

// Hueco que hace falta dejar alrededor para que la sombra no se corte.
export function shadowExtent(d, base) {
  if (!d || !d.shadowOn) return 0;
  const m = shadowMetrics(d, base);
  return Math.ceil(m.blur * 1.25 + m.dist) + 2;
}

// Capas que reciben la sombra desde el panel. En las plantillas de varias
// capas es la capa elegida; en los generadores rápidos (un sticker = varias
// capas sueltas) se tratan como un solo elemento.
export function shadowTargets(state, layerId = null) {
  const mode = state.quickGenerator;
  const layers = state.layers || [];
  if (!mode || mode === 'compose') {
    const l = layers.find((x) => x.id === layerId);
    return l && (l.type === 'text' || l.type === 'logo' || l.type === 'pin' || l.cmpKind) ? [l] : [];
  }
  if (mode === 'gallery' || mode === 'logoAjt') return layers.filter((l) => l.type === 'image');
  if (mode === 'title' || mode === 'body' || mode === 'location') {
    const pill = layers.find((l) => l.type === 'pill');
    if (pill) return [pill]; // con fondo, lo que se ve es la pastilla
    return layers.filter((l) => l.type === 'text' || l.type === 'pin');
  }
  return [];
}
