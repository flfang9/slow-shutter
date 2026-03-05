// Standard vertex shader used by all effects
export const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

// Lateral Motion Blur - horizontal directional blur
export const lateralMotionShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  void main() {
    // If intensity is 0, return original image
    if (u_intensity < 0.01) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    vec4 color = vec4(0.0);
    float total = 0.0;

    // Number of samples based on intensity
    int samples = int(mix(8.0, 30.0, u_intensity));
    float offset = mix(0.005, 0.03, u_intensity);

    for (int i = 0; i < 30; i++) {
      if (i >= samples) break;

      float t = float(i) / float(samples - 1);
      float x = (t - 0.5) * offset;
      vec2 sampleCoord = v_texCoord + vec2(x, 0.0);

      // Sample the texture
      vec4 sample = texture2D(u_image, sampleCoord);

      // Luminance-weighted sampling (brighter areas blur more)
      float luminance = dot(sample.rgb, vec3(0.299, 0.587, 0.114));
      float weight = mix(0.5, 1.0, luminance);

      color += sample * weight;
      total += weight;
    }

    gl_FragColor = color / total;
  }
`;

// Vertical Zoom Pull - radial blur from bottom center
export const verticalZoomShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  void main() {
    // If intensity is 0, return original image
    if (u_intensity < 0.01) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    vec2 center = vec2(0.5, 0.0); // Bottom center
    vec2 direction = v_texCoord - center;

    vec4 color = vec4(0.0);
    float total = 0.0;

    int samples = int(mix(8.0, 25.0, u_intensity));
    float strength = mix(0.02, 0.15, u_intensity);

    // Gradient mask - stronger at top, subtle at bottom
    float gradient = v_texCoord.y;
    strength *= gradient;

    for (int i = 0; i < 25; i++) {
      if (i >= samples) break;

      float t = float(i) / float(samples - 1);
      vec2 offset = direction * t * strength;
      vec2 sampleCoord = v_texCoord - offset;

      vec4 sample = texture2D(u_image, sampleCoord);
      float weight = 1.0 - t * 0.3; // Fade outer samples

      color += sample * weight;
      total += weight;
    }

    gl_FragColor = color / total;
  }
`;

// Cinematic Swirl - radial zoom with rotation (like Tokyo night street photography)
export const cinematicSwirlShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    // If intensity is 0, return original image
    if (u_intensity < 0.01) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    // Center point (can be slightly off-center for more dynamic look)
    vec2 center = vec2(0.5, 0.45);
    vec2 direction = v_texCoord - center;
    float distance = length(direction);

    vec4 color = vec4(0.0);
    float total = 0.0;

    int samples = int(mix(12.0, 35.0, u_intensity));
    float zoomStrength = mix(0.01, 0.12, u_intensity);
    float rotationStrength = mix(0.0, 0.15, u_intensity);

    // Subject preservation - keep center sharper
    float centerFalloff = smoothstep(0.0, 0.3, distance);
    zoomStrength *= centerFalloff;
    rotationStrength *= centerFalloff;

    for (int i = 0; i < 35; i++) {
      if (i >= samples) break;

      float t = float(i) / float(samples - 1);

      // Radial zoom component
      vec2 zoomOffset = direction * t * zoomStrength;

      // Rotational component (swirl)
      float angle = t * rotationStrength;
      float randomAngle = random(v_texCoord + float(i)) * 0.1 - 0.05;
      angle += randomAngle;

      float cosAngle = cos(angle);
      float sinAngle = sin(angle);
      vec2 rotatedDir = vec2(
        direction.x * cosAngle - direction.y * sinAngle,
        direction.x * sinAngle + direction.y * cosAngle
      );

      // Combine zoom and rotation
      vec2 sampleCoord = center + rotatedDir + zoomOffset;

      vec4 sample = texture2D(u_image, sampleCoord);

      // Weight samples - outer samples fade for smooth blur
      float weight = 1.0 - t * 0.3;

      // Boost bright areas (lights streak more)
      float luminance = dot(sample.rgb, vec3(0.299, 0.587, 0.114));
      weight *= mix(0.7, 1.3, luminance);

      color += sample * weight;
      total += weight;
    }

    gl_FragColor = color / total;
  }
`;

// Handheld Drift - diagonal blur with organic feel
export const handheldDriftShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  // Simple pseudo-random function
  float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    // If intensity is 0, return original image
    if (u_intensity < 0.01) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    vec4 color = vec4(0.0);
    float total = 0.0;

    int samples = int(mix(8.0, 25.0, u_intensity));
    float strength = mix(0.005, 0.025, u_intensity);

    // Diagonal drift direction with subtle randomization
    vec2 driftDir = normalize(vec2(1.0, 0.3));

    for (int i = 0; i < 25; i++) {
      if (i >= samples) break;

      float t = float(i) / float(samples - 1);

      // Add organic randomization to offset
      float randomOffset = random(v_texCoord + float(i)) * 0.3;
      vec2 offset = driftDir * (t + randomOffset) * strength;

      vec2 sampleCoord = v_texCoord + offset;
      vec4 sample = texture2D(u_image, sampleCoord);

      float weight = 1.0 - t * 0.2;
      color += sample * weight;
      total += weight;
    }

    gl_FragColor = color / total;
  }
`;

// Film Grain - randomized luminance noise
export const filmGrainShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_time;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);

    // Generate grain based on position and time (for animation)
    float grain = random(v_texCoord * u_time) * 2.0 - 1.0;
    grain *= 0.05; // 5% opacity

    // Add grain to luminance only, preserve color
    color.rgb += vec3(grain);

    gl_FragColor = color;
  }
`;

// Vibrance Boost - selective saturation increase
export const vibranceShader = `
  precision mediump float;
  uniform sampler2D u_image;
  varying vec2 v_texCoord;

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);

    // Calculate luminance
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Calculate saturation
    float maxColor = max(max(color.r, color.g), color.b);
    float minColor = min(min(color.r, color.g), color.b);
    float saturation = maxColor - minColor;

    // Vibrance boost - affects muted colors more than saturated ones
    float boost = 1.18; // 18% boost
    float adjustment = (1.0 - saturation) * (boost - 1.0);

    vec3 boosted = mix(vec3(luminance), color.rgb, 1.0 + adjustment);

    gl_FragColor = vec4(boosted, color.a);
  }
`;

// Light Bloom - soft glow on bright areas
export const bloomShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);

    // Calculate luminance
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Only bloom bright areas
    if (luminance > 0.8) {
      vec4 bloom = vec4(0.0);
      float total = 0.0;

      // Simple box blur for bloom
      int radius = 2;
      for (int x = -2; x <= 2; x++) {
        for (int y = -2; y <= 2; y++) {
          vec2 offset = vec2(float(x), float(y)) / u_resolution;
          bloom += texture2D(u_image, v_texCoord + offset);
          total += 1.0;
        }
      }

      bloom /= total;

      // Blend bloom with original
      float bloomStrength = (luminance - 0.8) * 5.0; // 0-1 range
      color = mix(color, bloom, bloomStrength * 0.3);
    }

    gl_FragColor = color;
  }
`;

// Contrast Curve - S-curve for deeper blacks and brighter highlights
export const contrastCurveShader = `
  precision mediump float;
  uniform sampler2D u_image;
  varying vec2 v_texCoord;

  // S-curve function
  float sCurve(float x) {
    return x * x * (3.0 - 2.0 * x);
  }

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);

    // Apply S-curve to each channel
    color.r = sCurve(color.r);
    color.g = sCurve(color.g);
    color.b = sCurve(color.b);

    gl_FragColor = color;
  }
`;

// Soft Light - Halation + secondary glow (DaVinci Resolve style)
export const softLightShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  void main() {
    // If intensity is 0, return original image
    if (u_intensity < 0.01) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    vec4 original = texture2D(u_image, v_texCoord);
    float luminance = dot(original.rgb, vec3(0.299, 0.587, 0.114));

    vec4 primaryGlow = vec4(0.0);
    vec4 secondaryGlow = vec4(0.0);
    vec4 tertiaryGlow = vec4(0.0);
    float primaryTotal = 0.0;
    float secondaryTotal = 0.0;
    float tertiaryTotal = 0.0;

    // Much stronger strength range for visible bloom
    float strength = mix(0.03, 0.25, u_intensity);

    // Primary glow - tight halo around light sources (more samples for smoothness)
    int primarySamples = 16;
    for (int i = 0; i < 16; i++) {
      float angle = float(i) * 3.14159 * 2.0 / 16.0;
      float radius = strength * 1.2; // Increased radius

      vec2 offset = vec2(cos(angle), sin(angle)) * radius;
      vec4 sample = texture2D(u_image, v_texCoord + offset);

      primaryGlow += sample;
      primaryTotal += 1.0;
    }
    primaryGlow /= primaryTotal;

    // Secondary glow - wider spread (halation effect)
    int secondarySamples = 20;
    for (int i = 0; i < 20; i++) {
      float angle = float(i) * 3.14159 * 2.0 / 20.0;
      float radius = strength * 3.0; // Much wider spread

      vec2 offset = vec2(cos(angle), sin(angle)) * radius;
      vec4 sample = texture2D(u_image, v_texCoord + offset);

      secondaryGlow += sample;
      secondaryTotal += 1.0;
    }
    secondaryGlow /= secondaryTotal;

    // Tertiary glow - very wide atmospheric glow
    int tertiarySamples = 24;
    for (int i = 0; i < 24; i++) {
      float angle = float(i) * 3.14159 * 2.0 / 24.0;
      float radius = strength * 6.0; // Very wide for atmosphere

      vec2 offset = vec2(cos(angle), sin(angle)) * radius;
      vec4 sample = texture2D(u_image, v_texCoord + offset);

      tertiaryGlow += sample;
      tertiaryTotal += 1.0;
    }
    tertiaryGlow /= tertiaryTotal;

    // Lower threshold so more lights get bloom (0.35 instead of 0.6)
    float glowStrength = max(0.0, (luminance - 0.35) * 1.5);

    // Start with original
    vec4 result = original;

    // Layer the glows with aggressive strength
    result = mix(result, primaryGlow, glowStrength * 0.7 * u_intensity);
    result = mix(result, secondaryGlow, glowStrength * 0.5 * u_intensity);
    result = mix(result, tertiaryGlow, glowStrength * 0.3 * u_intensity);

    // Halation color bleed - boost warm tones in highlights
    if (luminance > 0.4) {
      float halation = (luminance - 0.4) * 1.5;

      // Boost red/yellow channels for warm halation
      result.r = mix(result.r, result.r * 1.3, halation * u_intensity * 0.6);
      result.g = mix(result.g, result.g * 1.2, halation * u_intensity * 0.5);

      // Add overall brightness to simulate light bleed
      result.rgb = mix(result.rgb, result.rgb * 1.4, halation * u_intensity * 0.4);
    }

    gl_FragColor = result;
  }
`;

// Filmic Grain Effect - Japanese cinema style (Fuji film stocks)
export const filmicGrainShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    // If intensity is 0, return original image
    if (u_intensity < 0.01) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    vec4 color = texture2D(u_image, v_texCoord);

    // Heavy grain structure (Japanese film stocks)
    float grain = random(v_texCoord * 1000.0) * 2.0 - 1.0;
    float grainStrength = mix(0.03, 0.12, u_intensity);

    // Vary grain by luminance (more visible in midtones)
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    float grainMask = 1.0 - abs(luminance - 0.5) * 2.0; // Peak at midtones
    grain *= grainMask;

    // Apply grain
    color.rgb += vec3(grain * grainStrength);

    // Subtle color shift (cooler tones, Fuji-style)
    color.r = mix(color.r, color.r * 0.95, u_intensity * 0.15);
    color.b = mix(color.b, color.b * 1.05, u_intensity * 0.15);

    // Vignette
    vec2 center = v_texCoord - vec2(0.5);
    float vignette = 1.0 - dot(center, center) * 0.8;
    vignette = mix(1.0, vignette, u_intensity * 0.3);
    color.rgb *= vignette;

    // Slight halation on highlights
    if (luminance > 0.8) {
      float bloom = (luminance - 0.8) * 5.0;
      color.rgb = mix(color.rgb, color.rgb * 1.2, bloom * u_intensity * 0.2);
    }

    gl_FragColor = color;
  }
`;

// Pass-through shader - simple copy for final render
export const passThroughShader = `
  precision mediump float;
  uniform sampler2D u_image;
  varying vec2 v_texCoord;

  void main() {
    gl_FragColor = texture2D(u_image, v_texCoord);
  }
`;
