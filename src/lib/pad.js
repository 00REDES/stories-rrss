// Margen de transparencia de los stickers. Instagram pinta de BLANCO la
// transparencia de algunos PNG de sticker (depende del móvil) cuando el dibujo
// llega hasta el borde del archivo o el archivo es muy alargado. Con un margen
// transparente razonable alrededor, y el sticker centrado en un lienzo
// cuadrado, no pasa. Todos los stickers se descargan así.

import { shadowMetrics, shadowExtent } from '../engine/shadow.js';

export const STICKER_PAD_RATIO = 0.06; // margen mínimo: 6 % del lado largo, por cada lado
// iOS no deja canvas de más de ~16,7 millones de píxeles: lado máximo seguro
const MAX_SIDE = 4000;

// sin caché: son archivos grandes de un solo uso
function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar el sticker'));
    img.src = src;
  });
}

function toBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar el PNG'))), 'image/png'));
}

// img: imagen ya cargada. layer: capa con los ajustes de sombra (opcional).
export function padStickerCanvas(img, layer = null) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const longest = Math.max(w, h);
  // la sombra se mide igual que en el lienzo (sobre el lado corto del sticker)
  const base = Math.min(w, h);
  const shadow = layer && layer.shadowOn ? shadowMetrics(layer, base) : null;
  const margin = Math.max(Math.round(longest * STICKER_PAD_RATIO), shadow ? shadowExtent(layer, base) : 0);
  const side = longest + margin * 2;
  const k = Math.min(1, MAX_SIDE / side);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(side * k));
  c.height = c.width;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (shadow) {
    ctx.shadowColor = `rgba(0,0,0,${shadow.opacity})`;
    ctx.shadowBlur = shadow.blur * k;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = shadow.dist * k;
  }
  ctx.drawImage(img, ((side - w) / 2) * k, ((side - h) / 2) * k, w * k, h * k);
  return c;
}

// PNG (blob) del sticker con su margen transparente y, si se pide, la sombra
export async function padStickerBlob(blob, layer = null) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImg(url);
    return await toBlob(padStickerCanvas(img, layer));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Lo mismo a partir de un PNG en data URL (stickers generados en el lienzo)
export async function padStickerDataURL(dataURL, layer = null) {
  const img = await loadImg(dataURL);
  return padStickerCanvas(img, layer).toDataURL('image/png');
}
