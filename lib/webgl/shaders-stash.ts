// ============================================================================
// STASHED SHADERS - Historical versions kept for reference
// ============================================================================

// STASHED: 2026-04-05 - Web shaders BEFORE mobile sync
// These were the web-specific implementations before porting mobile shaders

export const lateralMotionShader_WEB_2026_04_05 = `
  precision highp float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  uniform vec2 u_swirlCenter;
  varying vec2 v_texCoord;

  float cometBezier(float t) {
    float t2 = t * 2.0 - 1.0;
    float u = t2 * t2;
    float cubic = u * u * (3.0 - 2.0 * u);
    return 1.0 - cubic * 0.55;
  }

  void main() {
    if (u_intensity < 0.00001) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    vec4 original = texture2D(u_image, v_texCoord);
    vec4 color = vec4(0.0);
    float total = 0.0;

    float intensityCurve = 0.44 + pow(u_intensity, 0.9) * 0.56;
    float offset = mix(0.042, 0.10, intensityCurve);

    for (int g = 0; g < 6; g++) {
      float ghostIndex = float(g);
      float ghostThreshold = mix(3.0, 5.0, intensityCurve);
      if (ghostIndex >= ghostThreshold) break;

      float ghostCenter = (ghostThreshold - 1.0) * 0.5;
      float ghostDistance = abs(ghostIndex - ghostCenter);
      float ghostOffset = (ghostIndex - ghostCenter) * offset * 0.36;
      float ghostOpacity = exp(-ghostDistance * 1.1);

      for (int i = 0; i < 32; i++) {
        float sampleIndex = float(i);
        float maxSamples = mix(18.0, 32.0, intensityCurve);
        if (sampleIndex >= maxSamples) break;

        float t = sampleIndex / (maxSamples - 1.0);
        float cometCurve = cometBezier(t);

        float x = (t - 0.5) * offset * 1.35 + ghostOffset;
        float wobble = sin(v_texCoord.y * 18.0 + sampleIndex * 0.7 + ghostIndex * 1.3) * 0.5;
        vec2 sampleCoord = v_texCoord + vec2(x, wobble * offset * 0.10);
        vec4 s = texture2D(u_image, sampleCoord);

        float centerBias = max(0.22, 1.0 - abs(t - 0.5) * 1.35);
        float weight = ghostOpacity * centerBias * mix(0.9, 1.0, cometCurve);

        color += s * weight;
        total += weight;
      }
    }

    vec4 result = color / total;
    float blend = 0.54 + u_intensity * 0.22;
    gl_FragColor = mix(original, result, blend);
  }
`;

export const verticalZoomShader_WEB_2026_04_05 = `
  precision highp float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  uniform vec2 u_swirlCenter;
  varying vec2 v_texCoord;

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

    float intensityCurve = 0.30 + pow(u_intensity, 0.95) * 0.70;
    float strength = mix(0.045, 0.16, intensityCurve);

    for (int i = 0; i < 18; i++) {
      float sampleIndex = float(i);
      float maxSamples = 18.0;
      if (sampleIndex >= maxSamples) break;

      float t = sampleIndex / (maxSamples - 1.0);
      float shutterT = t;
      vec2 rawCoord = v_texCoord - direction * shutterT * strength;
      vec2 sampleCoord = clamp(rawCoord, vec2(0.0), vec2(1.0));
      float edgeFade = exp(-length(rawCoord - sampleCoord) * 18.0);
      if (edgeFade < 0.02) continue;

      vec4 s = texture2D(u_image, sampleCoord);

      float distanceWeight = smoothstep(0.06, 0.62, distance);
      float weight = (1.0 - t * 0.42) * mix(0.34, 1.18, distanceWeight) * edgeFade;

      color += s * weight;
      total += weight;
    }

    vec4 result = total > 0.0 ? color / total : original;
    float blend = 0.38 + u_intensity * 0.34;
    gl_FragColor = mix(original, result, blend);
  }
`;

export const handheldDriftShader_WEB_2026_04_05 = `
  precision highp float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  uniform vec2 u_swirlCenter;
  varying vec2 v_texCoord;

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    if (u_intensity < 0.00001) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    vec4 original = texture2D(u_image, v_texCoord);
    vec4 color = vec4(0.0);
    float total = 0.0;

    float intensity2 = u_intensity * u_intensity;

    vec2 driftDir = normalize(vec2(1.0, 0.26));
    vec2 orthoDir = vec2(-driftDir.y, driftDir.x);
    float strength = mix(0.02, 0.10, intensity2);
    float swayAmount = strength * mix(0.12, 0.20, intensity2);

    for (int i = 0; i < 18; i++) {
      float t = float(i) / 17.0;
      float centered = t - 0.5;

      float sway = sin(float(i) * 1.6 + v_texCoord.y * 5.0) * swayAmount;
      float jitter = (rand(vec2(float(i) * 13.0, dot(v_texCoord, vec2(19.0, 27.0)))) - 0.5) * strength * 0.08;

      vec2 offset = driftDir * centered * strength * 1.4;
      offset += orthoDir * (sway + jitter);

      vec4 s = texture2D(u_image, clamp(v_texCoord + offset, vec2(0.0), vec2(1.0)));

      float luminance = dot(s.rgb, vec3(0.299, 0.587, 0.114));
      float weight = max(0.2, 1.0 - abs(centered) * 1.2);
      weight *= mix(0.92, 1.1, smoothstep(0.2, 0.9, luminance));

      color += s * weight;
      total += weight;
    }

    vec4 effect = color / total;
    float blend = 0.45 + u_intensity * 0.25;
    gl_FragColor = mix(original, effect, blend);
  }
`;

export const vortexShader_WEB_2026_04_05 = `
  precision highp float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  uniform vec2 u_swirlCenter;
  varying vec2 v_texCoord;

  void main() {
    vec4 original = texture2D(u_image, v_texCoord);

    if (u_intensity < 0.001) {
      gl_FragColor = original;
      return;
    }

    vec2 center = u_swirlCenter;
    vec2 direction = v_texCoord - center;
    float distance = length(direction);

    float curve = u_intensity * u_intensity;
    float maxRotation = curve * 0.65;
    float centerBlend = smoothstep(0.0, 0.15, distance);

    vec4 color = original * 1.5;
    float totalWeight = 1.5;

    for (int i = 1; i <= 16; i++) {
      float t = float(i) / 16.0;
      float angle = t * maxRotation * distance;

      float cosA = cos(angle);
      float sinA = sin(angle);

      vec2 cwPos = center + vec2(
        direction.x * cosA - direction.y * sinA,
        direction.x * sinA + direction.y * cosA
      );

      vec2 ccwPos = center + vec2(
        direction.x * cosA + direction.y * sinA,
        -direction.x * sinA + direction.y * cosA
      );

      float falloff = 1.0 - t * 0.4;
      float weight = falloff * centerBlend * u_intensity;

      if (cwPos.x >= 0.0 && cwPos.x <= 1.0 && cwPos.y >= 0.0 && cwPos.y <= 1.0) {
        color += texture2D(u_image, cwPos) * weight;
        totalWeight += weight;
      }
      if (ccwPos.x >= 0.0 && ccwPos.x <= 1.0 && ccwPos.y >= 0.0 && ccwPos.y <= 1.0) {
        color += texture2D(u_image, ccwPos) * weight;
        totalWeight += weight;
      }
    }

    vec3 result = (color / totalWeight).rgb;
    result = (result - 0.5) * (1.0 + u_intensity * 0.2) + 0.5;
    float gray = dot(result, vec3(0.299, 0.587, 0.114));
    result = mix(vec3(gray), result, 1.0 + u_intensity * 0.1);

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
  }
`;

// ============================================================================

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
