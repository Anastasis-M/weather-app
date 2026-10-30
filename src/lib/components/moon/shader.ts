export const vertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPos;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;

uniform float uCycle;
uniform float uMirror;

varying vec3 vNormal;
varying vec3 vPos;

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

float crater(vec2 q, vec2 c, float r) {
  float d = length(q - c) / r;
  return smoothstep(1.0, 0.75, d) * 0.6 - smoothstep(1.15, 0.95, d) * smoothstep(0.75, 1.0, d) * 0.25;
}

void main() {
  vec3 n = normalize(vNormal);
  float phase = 6.2831853 * uCycle;
  vec3 sunDir = normalize(vec3(sin(phase) * uMirror, 0.0, -cos(phase)));
  float facing = dot(n, sunDir);
  float lit = smoothstep(-0.03, 0.08, facing);

  vec2 q = vPos.xy;
  float maria = smoothstep(0.5, 0.68, fbm(q * 1.7 + vec2(2.3, 7.1)));
  float pits = crater(q, vec2(-0.32, -0.55), 0.13) + crater(q, vec2(0.38, 0.22), 0.09)
             + crater(q, vec2(-0.05, 0.6), 0.07) + crater(q, vec2(0.55, -0.35), 0.06);
  float grain = fbm(q * 9.0) * 0.12;
  vec3 albedo = mix(vec3(0.95, 0.94, 0.9), vec3(0.6, 0.62, 0.66), maria * 0.75);
  albedo *= 1.0 - pits * 0.2 - grain;

  float limb = 0.7 + 0.3 * pow(max(n.z, 0.0), 0.5);
  vec3 day = albedo * limb * (0.55 + 0.45 * max(facing, 0.0));
  vec3 night = albedo * vec3(0.16, 0.19, 0.27);
  float alpha = mix(0.6, 1.0, lit);

  gl_FragColor = vec4(mix(night, day, lit) * alpha, alpha);
}
`;
