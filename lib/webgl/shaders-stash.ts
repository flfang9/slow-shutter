// STASHED: Modern Swirl shader (replaced 2026-04-05 with v1 original)
// Kept here for reference - has tap-to-reposition, edge handling, blending

export const cinematicSwirlShader_MODERN = `
  precision highp float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  uniform vec2 u_swirlCenter;
  varying vec2 v_texCoord;

  float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec2 rotate2D(vec2 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  }

  void main() {
    if (u_intensity < 0.00001) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    vec4 original = texture2D(u_image, v_texCoord);
    vec2 center = u_swirlCenter;
    vec2 direction = v_texCoord - center;
    float distance = length(direction);

    vec4 color = vec4(0.0);
    float total = 0.0;

    float intensityCurve = 0.28 + pow(u_intensity, 0.95) * 0.72;
    float zoomStrength = mix(0.03, 0.13, intensityCurve);
    float rotationStrength = mix(0.04, 0.18, intensityCurve);

    for (int i = 0; i < 20; i++) {
      float sampleIndex = float(i);
      float maxSamples = 20.0;
      if (sampleIndex >= maxSamples) break;

      float t = sampleIndex / (maxSamples - 1.0);
      float shutterT = t;

      float angle = shutterT * rotationStrength;
      float randomAngle = random(v_texCoord + sampleIndex) * 0.06 - 0.03;
      angle += randomAngle;

      float cosAngle = cos(angle);
      float sinAngle = sin(angle);
      vec2 rotatedDir = vec2(
        direction.x * cosAngle - direction.y * sinAngle,
        direction.x * sinAngle + direction.y * cosAngle
      );

      vec2 rawCoord = center + rotatedDir * (1.0 - shutterT * zoomStrength);
      vec2 sampleCoord = clamp(rawCoord, vec2(0.0), vec2(1.0));
      float edgeFade = exp(-length(rawCoord - sampleCoord) * 18.0);
      if (edgeFade < 0.02) continue;

      vec4 s = texture2D(u_image, sampleCoord);

      float distanceWeight = smoothstep(0.06, 0.68, distance);
      float weight = (1.0 - t * 0.3) * mix(0.30, 1.12, distanceWeight) * edgeFade;
      float luminance = dot(s.rgb, vec3(0.299, 0.587, 0.114));
      weight *= mix(0.82, 1.18, luminance);

      color += s * weight;
      total += weight;
    }

    vec4 result = total > 0.0 ? color / total : original;
    float blend = 0.36 + u_intensity * 0.34;
    gl_FragColor = mix(original, result, blend);
  }
`;
