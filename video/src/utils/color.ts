// タイプカラーから背景グラデーション等の派生色を作る小道具。
/** #RRGGBB を白方向に mix(0..1) だけ寄せる */
export function lighten(hex: string, mix: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v + (255 - v) * mix);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(ch);
  return `rgb(${r},${g},${b})`;
}

/** #RRGGBB を黒方向に mix(0..1) だけ寄せる */
export function darken(hex: string, mix: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v * (1 - mix));
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(ch);
  return `rgb(${r},${g},${b})`;
}
