import { makeGradientLayer } from '../engine/layerFactory.js';
import { DEFAULT_GRADIENT_STOPS } from '../engine/gradient.js';

// Degradado negro → transparente en 9:16, para dar legibilidad a stickers y
// textos que se ponen encima de una foto en la story. Se exporta como PNG
// transparente de 1080×1920 para colocarlo debajo de lo que se quiere leer.
export function buildGradientDoc() {
  return {
    canvas: { width: 1080, height: 1920 },
    templateName: 'Degradado de legibilidad',
    quickGenerator: 'gradient',
    layers: [
      {
        ...makeGradientLayer({ name: 'Degradado', x: 0, y: 0, width: 1080, height: 1920, color: '#000000' }),
        locked: true,
        gradSide: 'bottom', // 'bottom' | 'top' | 'both'
        gradLength: 0.55,
        gradOpacity: 0.8,
        gradStops: DEFAULT_GRADIENT_STOPS.map((s) => ({ ...s })),
      },
    ],
  };
}
