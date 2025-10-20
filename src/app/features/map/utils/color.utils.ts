export const DEFAULT_TEMPERATURE_RGB: [number, number, number] = [148, 163, 184];
export const DEFAULT_PRESSURE_RGB: [number, number, number] = [59, 130, 246];
export const DEFAULT_PRESSURE_COLOR_RANGE: [number, number] = [980, 1045];

export function normalize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max === min) {
    return 0.5;
  }
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

export function temperatureToRgb(
  value: number | null | undefined,
  range: [number, number] | null,
): [number, number, number] {
  if (typeof value !== 'number' || !range) {
    return DEFAULT_TEMPERATURE_RGB;
  }
  const [min, max] = range;
  const ratio = normalize(value, min, max);
  const hue = 230 - ratio * 230;
  return hslToRgb(hue / 360, 0.85, 0.55);
}

export function pressureToRgb(
  value: number | null | undefined,
  range?: [number, number] | null,
): [number, number, number] {
  if (typeof value !== 'number') {
    return DEFAULT_PRESSURE_RGB;
  }
  const [min, max] = range ?? DEFAULT_PRESSURE_COLOR_RANGE;
  const ratio = normalize(value, min, max);
  const hue = 225 - ratio * 225;
  const saturation = 0.85;
  const lightness = 0.52 - ratio * 0.05;
  return hslToRgb(hue / 360, saturation, lightness);
}

export function rgbToCss([r, g, b]: [number, number, number]): string {
  return 'rgb(' + r + ', ' + g + ', ' + b + ')';
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const val = Math.round(l * 255);
    return [val, val, val];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h + 1 / 3);
  const g = hueToRgb(p, q, h);
  const b = hueToRgb(p, q, h - 1 / 3);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hueToRgb(p: number, q: number, t: number): number {
  let temp = t;
  if (temp < 0) temp += 1;
  if (temp > 1) temp -= 1;
  if (temp < 1 / 6) return p + (q - p) * 6 * temp;
  if (temp < 1 / 2) return q;
  if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
  return p;
}
