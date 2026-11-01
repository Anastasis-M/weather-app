export const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uRes;
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uCloud;
uniform vec3 uShade;
uniform vec3 uGlow;
uniform float uCover;
uniform float uRain;
uniform float uSnow;
uniform float uFog;
uniform float uStars;
uniform float uSun;
uniform float uFlash;

varying vec2 vUv;

const mat2 OCTAVE = mat2(1.6, -1.2, 1.2, 1.6);
const vec2 SUN_UV = vec2(0.8, 0.88);

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

float noise(vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  vec2 o = a.x > a.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(dot(a, hash2(i)), dot(b, hash2(i + o)), dot(c, hash2(i + 1.0)));
  return 0.5 + 45.0 * (n.x + n.y + n.z);
}

float fbm(vec2 p, int octaves) {
  float v = 0.0;
  float a = 0.5;
  vec2 evolve = vec2(uTime * 0.011, -uTime * 0.007);
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    v += a * noise(p);
    p = OCTAVE * p + evolve;
    a *= 0.5;
  }
  return v / (1.0 - a);
}

vec2 skyPlane(vec2 uv, float aspect, float horizon) {
  float z = 1.0 / (uv.y + horizon);
  return vec2((uv.x - 0.5) * aspect * z, z * (1.0 + horizon) * 1.2);
}

struct Layer {
  float horizon;
  float scale;
  float speed;
  float seed;
  float threshold;
  float soft;
  float absorb;
  float shadeBias;
  int octaves;
};

vec4 cloudLayer(Layer l, vec2 uv, float aspect, float sunNear, float day) {
  vec2 offset = vec2(uTime * l.speed + l.seed * 13.7, l.seed * 7.3);
  vec2 plane = skyPlane(uv, aspect, l.horizon);
  vec2 q = plane * l.scale + offset;
  float cluster = (noise(OCTAVE * q * 0.15 + l.seed) - 0.5) * 0.42 * (1.0 - uCover * 0.6);
  float n = fbm(q, l.octaves) + cluster;
  float alpha = smoothstep(l.threshold, l.threshold + l.soft * (1.0 + 2.0 * uCover * uCover), n);
  if (alpha < 0.002) return vec4(0.0);

  vec2 qs = skyPlane(SUN_UV, aspect, l.horizon) * l.scale + offset;
  vec2 toSun = normalize(normalize(qs - q) * 0.6 + vec2(0.0, -1.0));
  float ahead = fbm(q + toSun * 0.3, 3) + cluster;
  float thick = max(n - l.threshold, 0.0);
  float occluded = max(ahead - l.threshold, 0.0) * l.absorb + thick * 2.5;
  float light = exp(-occluded);
  float powder = 1.0 - exp(-thick * 12.0);
  light *= 0.6 + 0.4 * powder;
  light = mix(light, exp(-thick * 4.0), smoothstep(0.55, 0.95, uCover));
  light = clamp(light + l.shadeBias, 0.0, 1.0);

  vec3 col = mix(uShade, uCloud, light);
  vec3 sunWhite = mix(vec3(1.0), uGlow, 0.35);
  float clearAround = 1.0 - uCover * 0.6;
  col += sunWhite * exp(-thick * 8.0) * sunNear * day * clearAround * 0.6;
  col += sunWhite * sunNear * day * 0.1 * (0.4 + 0.6 * light);
  col += vec3(0.78, 0.8, 0.92) * uFlash * (0.4 + thick * 1.5);

  col *= 0.88 + 0.16 * uv.y;
  float haze = smoothstep(1.2, 2.4, 1.0 / (uv.y + l.horizon));
  col = mix(col, mix(uBottom, uTop, 0.35), haze * 0.4);
  return vec4(col, alpha);
}

float gust() {
  return 0.12 + 0.08 * sin(uTime * 0.35) + 0.04 * sin(uTime * 1.1);
}

float rainLayer(vec2 p, float scale, float speed, float len) {
  p.x += p.y * gust();
  vec2 g = vec2(p.x * scale, p.y * scale * 0.08 + uTime * speed);
  vec2 id = floor(g);
  vec2 f = fract(g);
  float h = hash(id);
  float present = step(1.0 - uRain * 0.6, h);
  float x = abs(f.x - 0.2 - h * 0.6);
  float start = fract(h * 7.13) * (1.0 - len);
  float streak = smoothstep(start, start + len * 0.2, f.y) * smoothstep(start + len, start + len * 0.6, f.y);
  return present * smoothstep(0.07, 0.0, x) * streak;
}

float snowLayer(vec2 p, float scale, float speed, float size) {
  vec2 g = p * scale + vec2(uTime * 0.25 + sin(uTime * 0.3) * 0.8, uTime * speed);
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash(id);
  float present = step(1.0 - uSnow * 0.75, h);
  vec2 c = vec2(sin(uTime * 0.7 + h * 6.28) * 0.25, (fract(h * 3.7) - 0.5) * 0.5);
  return present * smoothstep(size, size * 0.3, length(f - c));
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  float day = smoothstep(0.6, 1.0, uSun);

  vec3 col = mix(uBottom, uTop, pow(smoothstep(-0.05, 1.0, uv.y), 0.8));

  if (uStars > 0.001) {
    vec2 g = p * 90.0;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash(id);
    vec2 jitter = (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.6;
    float bright = 0.35 + 0.65 * hash(id + 11.3);
    float star = step(0.98, h) * smoothstep(0.12, 0.0, length(f - jitter)) * bright * 1.3;
    star *= 0.6 + 0.4 * sin(uTime * (0.8 + h * 2.5) + h * 40.0);
    col += vec3(0.84, 0.89, 1.0) * star * uStars * smoothstep(0.15, 0.7, uv.y);
  }

  vec2 sunPos = vec2(SUN_UV.x * aspect, SUN_UV.y);
  float d = length(p - sunPos);
  float clearSky = (1.0 - uCover * 0.8) * (1.0 - uFog * 0.75);
  vec3 sunWhite = mix(vec3(1.0, 0.98, 0.93), uGlow, 0.25);
  col = mix(col, mix(col, sunWhite, 0.6), exp(-d * 2.6) * 0.5 * day * clearSky);
  col += uGlow * exp(-d * 1.2) * 0.07 * day * clearSky;
  col += sunWhite * (exp(-d * 45.0) * 1.0 + exp(-d * 14.0) * 0.35 + exp(-d * 5.0) * 0.12) * day * clearSky;
  float disc = smoothstep(0.03, 0.022, d) * day * smoothstep(0.85, 0.55, uCover) * (1.0 - uFog * 0.6);
  col = mix(col, max(col, vec3(1.0, 0.995, 0.975)), disc);
  col += uGlow * (exp(-d * 6.0) * 0.12 + exp(-d * 2.0) * 0.05) * (1.0 - day) * uSun * clearSky;

  float sunNear = exp(-d * 4.5);

  if (uCover > 0.03) {
    float c = uCover;
    Layer far = Layer(0.7, 3.5, 0.016, 1.0, mix(1.05, 0.2, pow(c, 1.4)), 0.22, 6.0, 0.2, 4);
    Layer mid = Layer(0.5, 1.9, 0.026, 2.6, mix(0.82, 0.36, c), 0.1, 10.0, -0.1 * c, 5);
    Layer near = Layer(0.45, 1.35, 0.04, 3.0, mix(0.98, 0.5, c * c), 0.08, 12.0, -0.05 - 0.3 * c * c, 5);

    float presence = smoothstep(0.03, 0.15, c);
    vec4 l = cloudLayer(far, uv, aspect, sunNear, day);
    col = mix(col, l.rgb, l.a * 0.85 * presence);
    l = cloudLayer(mid, uv, aspect, sunNear, day);
    col = mix(col, l.rgb, l.a * presence);
    l = cloudLayer(near, uv, aspect, sunNear, day);
    col = mix(col, l.rgb, l.a * presence);
  }

  if (uFog > 0.001) {
    float bank = 0.6 * fbm(p * 1.6 + vec2(uTime * 0.05, 0.0), 3) + 0.4 * fbm(p * 2.7 - vec2(uTime * 0.08, uTime * 0.01), 3);
    col = mix(col, uCloud * 0.9, uFog * smoothstep(0.75, 0.0, uv.y) * (0.35 + 0.4 * bank));
  }

  if (uRain > 0.001) {
    float r = rainLayer(p, 38.0, 4.2, 0.35) * 0.24
            + rainLayer(p + 1.7, 64.0, 5.6, 0.3) * 0.17
            + rainLayer(p + 3.1, 96.0, 7.0, 0.25) * 0.11;
    col += vec3(0.68, 0.78, 0.92) * r;
    float mist = fbm(p * 3.0 + vec2(uTime * 0.3 * gust() / 0.12, 0.0), 3);
    col = mix(col, uShade, uRain * 0.22 * mist * smoothstep(0.45, 0.0, uv.y));
  }

  if (uSnow > 0.001) {
    float s = snowLayer(p, 9.0, 0.45, 0.09) * 0.5
            + snowLayer(p + 2.3, 15.0, 0.75, 0.1) * 0.45
            + snowLayer(p + 4.1, 24.0, 1.1, 0.09) * 0.3;
    col += vec3(0.86, 0.9, 0.96) * s;
  }

  col += vec3(0.62, 0.65, 0.78) * uFlash * (0.15 + 0.35 * uv.y);

  col *= 1.0 - 0.12 * length(uv - vec2(0.5, 0.62));
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`;
