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
uniform vec3 uGlow;
uniform float uCover;
uniform float uRain;
uniform float uSnow;
uniform float uFog;
uniform float uStars;
uniform float uSun;
uniform float uFlash;

varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.0);
    a *= 0.5;
  }
  return v;
}

float clouds(vec2 p, float drift, float scale) {
  vec2 q = p * scale + vec2(uTime * drift, 0.0);
  vec2 warp = vec2(fbm(q + vec2(0.0, uTime * 0.01)), fbm(q + vec2(5.2, 1.3)));
  return fbm(q + warp * 1.4);
}

float rainLayer(vec2 p, float scale, float speed, float len) {
  p.x += p.y * 0.12;
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
  vec2 g = p * scale + vec2(0.0, uTime * speed);
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

  vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, uv.y));

  if (uStars > 0.001) {
    vec2 g = p * 90.0;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash(id);
    vec2 offset = (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.6;
    float star = step(0.985, h) * smoothstep(0.09, 0.0, length(f - offset));
    star *= 0.55 + 0.45 * sin(uTime * (0.8 + h * 2.5) + h * 40.0);
    col += vec3(0.82, 0.88, 1.0) * star * uStars * smoothstep(0.2, 0.75, uv.y);
  }

  vec2 sunPos = vec2(aspect * 0.84, 0.94);
  float d = length(p - sunPos);
  float glow = exp(-d * 3.5) * 0.22 + exp(-d * 16.0) * 0.28;
  col += uGlow * glow * uSun * (1.0 - uCover * 0.85);

  float threshold = mix(0.8, 0.28, uCover);
  float back = clouds(p, 0.006, 1.1);
  float backMask = smoothstep(threshold - 0.12, threshold + 0.22, back) * smoothstep(-0.2, 0.7, uv.y);
  col = mix(col, uCloud * (0.62 + 0.25 * back), backMask * 0.75);
  float front = clouds(p + vec2(3.7, 1.9), 0.014, 1.9);
  float frontMask = smoothstep(threshold - 0.08, threshold + 0.2, front) * smoothstep(0.0, 0.85, uv.y);
  col = mix(col, uCloud * (0.72 + 0.28 * front), frontMask * 0.6);

  if (uFog > 0.001) {
    float bank = fbm(p * 1.6 + vec2(uTime * 0.02, 0.0));
    col = mix(col, uCloud * 0.9, uFog * smoothstep(0.75, 0.0, uv.y) * (0.35 + 0.4 * bank));
  }

  if (uRain > 0.001) {
    float r = rainLayer(p, 38.0, 3.2, 0.35) * 0.18
            + rainLayer(p + 1.7, 64.0, 4.4, 0.3) * 0.13
            + rainLayer(p + 3.1, 96.0, 5.6, 0.25) * 0.09;
    col += vec3(0.68, 0.78, 0.92) * r;
  }

  if (uSnow > 0.001) {
    float s = snowLayer(p, 9.0, 0.45, 0.09) * 0.5
            + snowLayer(p + 2.3, 15.0, 0.75, 0.1) * 0.45
            + snowLayer(p + 4.1, 24.0, 1.1, 0.09) * 0.3;
    col += vec3(0.86, 0.9, 0.96) * s;
  }

  col += vec3(0.5, 0.52, 0.68) * uFlash * (0.35 + 0.65 * uv.y);

  col *= 1.0 - 0.22 * length(uv - vec2(0.5, 0.65));
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`;
