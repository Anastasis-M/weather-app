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

uniform sampler2D uMap;
uniform float uCycle;
uniform float uMirror;

varying vec3 vNormal;
varying vec3 vPos;

const float PI = 3.14159265;

void main() {
  vec3 n = normalize(vNormal);
  float phase = 2.0 * PI * uCycle;
  vec3 sunDir = normalize(vec3(sin(phase) * uMirror, 0.0, -cos(phase)));
  float facing = dot(n, sunDir);
  float lit = smoothstep(-0.02, 0.06, facing);

  vec3 p = normalize(vPos);
  p.xy *= uMirror;
  vec2 uv = vec2(0.5 + atan(p.x, p.z) / (2.0 * PI), 0.5 + asin(p.y) / PI);
  vec3 albedo = texture2D(uMap, uv).rgb;
  albedo = clamp((albedo - 0.5) * 1.15 + 0.55, 0.0, 1.0);

  float limb = 0.75 + 0.25 * pow(max(n.z, 0.0), 0.4);
  vec3 day = albedo * limb * (0.6 + 0.5 * max(facing, 0.0));
  vec3 night = albedo * vec3(0.14, 0.17, 0.24);
  float alpha = mix(0.6, 1.0, lit);

  gl_FragColor = vec4(mix(night, day, lit) * alpha, alpha);
}
`;
