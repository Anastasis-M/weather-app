// Absolute temperature → color scale (°C), so colors mean the same thing
// in any city or season instead of restating a chart's local min/max.
const TEMP_STOPS: [number, number, number, number][] = [
  [-15, 0x81, 0x8c, 0xf8], // indigo — severe cold
  [0, 0x60, 0xa5, 0xfa], // blue — freezing (matches --color-rain)
  [8, 0x2d, 0xd4, 0xbf], // teal — chilly
  [16, 0xa3, 0xe6, 0x35], // lime — mild
  [24, 0xfb, 0xbf, 0x24], // amber — warm (matches --color-accent)
  [32, 0xf9, 0x73, 0x16], // orange — hot
  [40, 0xef, 0x44, 0x44], // red — extreme heat
];

function rgb([, r, g, b]: [number, number, number, number]): string {
  return `rgb(${r},${g},${b})`;
}

export function tempColor(t: number): string {
  const s = TEMP_STOPS;
  if (t <= s[0][0]) return rgb(s[0]);
  for (let i = 1; i < s.length; i++) {
    if (t <= s[i][0]) {
      const [t0, ...a] = s[i - 1];
      const [t1, ...b] = s[i];
      const k = (t - t0) / (t1 - t0);
      return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(",")})`;
    }
  }
  return rgb(s[s.length - 1]);
}

// Gradient stops for a min→max span: endpoints plus any scale anchors the
// span crosses, each placed proportionally so e.g. 16°C is lime at the
// exact point of the span where 16°C falls.
export function tempGradient(min: number, max: number, dir = "90deg"): string {
  const stops = [`${tempColor(min)} 0%`];
  if (max > min) {
    for (const [t] of TEMP_STOPS) {
      if (t > min && t < max) {
        stops.push(
          `${tempColor(t)} ${(((t - min) / (max - min)) * 100).toFixed(1)}%`,
        );
      }
    }
  }
  stops.push(`${tempColor(max)} 100%`);
  return `linear-gradient(${dir},${stops.join(",")})`;
}
