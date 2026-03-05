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

// Lateral Motion Blur - horizontal directional blur with ghosting
export const lateralMotionShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  void main() {
    if (u_intensity < 0.00001) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    vec4 original = texture2D(u_image, v_texCoord);
    vec4 color = vec4(0.0);
    float total = 0.0;

    // Motion sweep with ghosting echoes
    int samples = int(mix(8.0, 30.0, u_intensity));
    float offset = mix(0.005, 0.04, u_intensity);

    // Create ghosting effect - multiple discrete echoes
    int ghosts = int(mix(2.0, 6.0, u_intensity));

    for (int g = 0; g < 6; g++) {
      if (g >= ghosts) break;

      float ghostOffset = float(g) * offset / float(ghosts);
      float ghostOpacity = exp(-float(g) * 1.5);

      for (int i = 0; i < 30; i++) {
        if (i >= samples) break;

        float t = float(i) / float(samples - 1);
        float x = (t - 0.5) * offset + ghostOffset;
        vec2 sampleCoord = v_texCoord + vec2(x, 0.0);

        vec4 sample = texture2D(u_image, sampleCoord);

        // Luminance-weighted sampling (brighter areas trail more)
        float luminance = dot(sample.rgb, vec3(0.299, 0.587, 0.114));
        float weight = mix(0.5, 1.0, luminance) * ghostOpacity;

        color += sample * weight;
        total += weight;
      }
    }

    vec4 result = color / total;

    // Blend with original to preserve detail
    gl_FragColor = mix(original, result, u_intensity);
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
    if (u_intensity < 0.00001) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    vec2 center = vec2(0.5, 0.5); // Center of image for radial zoom
    vec2 direction = v_texCoord - center;
    float distance = length(direction);

    vec4 color = vec4(0.0);
    float total = 0.0;

    int samples = int(mix(8.0, 30.0, u_intensity));
    float strength = mix(0.015, 0.10, u_intensity);

    // Radial zoom blur - sample along the line from center
    for (int i = 0; i < 30; i++) {
      if (i >= samples) break;

      float t = float(i) / float(samples - 1);
      // Zoom out effect - sample from center outward
      vec2 offset = direction * t * strength;
      vec2 sampleCoord = v_texCoord - offset;

      vec4 sample = texture2D(u_image, sampleCoord);

      // Weight based on distance - stronger effect farther from center
      float distanceWeight = smoothstep(0.0, 0.5, distance);
      float weight = (1.0 - t * 0.3) * mix(0.5, 1.0, distanceWeight);

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
  uniform vec2 u_swirlCenter; // Center point for swirl
  varying vec2 v_texCoord;

  float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    // If intensity is 0, return original image
    if (u_intensity < 0.00001) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    // Center point (from user tap or default)
    vec2 center = u_swirlCenter;
    vec2 direction = v_texCoord - center;
    float distance = length(direction);

    vec4 color = vec4(0.0);
    float total = 0.0;

    int samples = int(mix(12.0, 35.0, u_intensity));
    float zoomStrength = mix(0.01, 0.12, u_intensity);
    float rotationStrength = mix(0.0, 0.15, u_intensity);

    // Subject preservation - keep center completely clear
    // Inner radius: completely sharp, no blur
    // Outer radius: full effect
    float innerRadius = 0.08;  // Clear center zone
    float outerRadius = 0.35;  // Full effect zone
    float centerFalloff = smoothstep(innerRadius, outerRadius, distance);

    // Apply falloff to both effects
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

// Handheld Drift - diagonal blur with organic feel and ghosting
export const handheldDriftShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    if (u_intensity < 0.00001) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    vec4 original = texture2D(u_image, v_texCoord);
    vec4 color = vec4(0.0);
    float total = 0.0;

    int samples = int(mix(8.0, 25.0, u_intensity));
    float strength = mix(0.005, 0.035, u_intensity);

    // Diagonal drift with ghosting echoes
    vec2 driftDir = normalize(vec2(1.0, 0.3));
    int ghosts = int(mix(2.0, 5.0, u_intensity));

    for (int g = 0; g < 5; g++) {
      if (g >= ghosts) break;

      float ghostOffset = float(g) * strength * 0.4;
      float ghostOpacity = exp(-float(g) * 1.8);

      for (int i = 0; i < 25; i++) {
        if (i >= samples) break;

        float t = float(i) / float(samples - 1);

        // Organic randomization
        float randomOffset = random(v_texCoord + float(i) + float(g)) * 0.3;
        vec2 offset = driftDir * (t + randomOffset) * strength + driftDir * ghostOffset;

        vec2 sampleCoord = v_texCoord + offset;
        vec4 sample = texture2D(u_image, sampleCoord);

        // Luminance weighting for more pronounced trails on bright areas
        float luminance = dot(sample.rgb, vec3(0.299, 0.587, 0.114));
        float weight = mix(0.6, 1.0, luminance) * (1.0 - t * 0.2) * ghostOpacity;

        color += sample * weight;
        total += weight;
      }
    }

    vec4 result = color / total;
    gl_FragColor = mix(original, result, u_intensity);
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

// Soft Light - Halation + edge glow (Film stock light bleed)
// Soft Light - DaVinci-style Halation + Secondary Glow
// Bright lights get warm glow, dark areas stay dark
export const softLightShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  void main() {
    vec4 original = texture2D(u_image, v_texCoord);

    if (u_intensity < 0.00001) {
      gl_FragColor = original;
      return;
    }

    float luminance = dot(original.rgb, vec3(0.299, 0.587, 0.114));

    // === HALATION: Warm glow bleeding from bright areas ===
    vec3 halation = vec3(0.0);
    float halationWeight = 0.0;

    // Inner halation ring (tighter, more saturated)
    float innerRadius = mix(0.008, 0.025, u_intensity);
    for (int i = 0; i < 16; i++) {
      float angle = float(i) * 3.14159 * 2.0 / 16.0;
      vec2 offset = vec2(cos(angle), sin(angle)) * innerRadius;

      vec4 sample = texture2D(u_image, v_texCoord + offset);
      float sampleLum = dot(sample.rgb, vec3(0.299, 0.587, 0.114));

      // Only very bright pixels contribute (>75%)
      float brightMask = smoothstep(0.70, 0.95, sampleLum);

      // Warm tint: shift toward orange/gold
      vec3 warmSample = sample.rgb;
      warmSample.r *= 1.3;
      warmSample.g *= 1.05;
      warmSample.b *= 0.7;

      halation += warmSample * brightMask;
      halationWeight += brightMask;
    }

    // Outer halation ring (wider, softer)
    float outerRadius = mix(0.02, 0.06, u_intensity);
    for (int i = 0; i < 24; i++) {
      float angle = float(i) * 3.14159 * 2.0 / 24.0;
      vec2 offset = vec2(cos(angle), sin(angle)) * outerRadius;

      vec4 sample = texture2D(u_image, v_texCoord + offset);
      float sampleLum = dot(sample.rgb, vec3(0.299, 0.587, 0.114));

      // Slightly lower threshold for outer glow
      float brightMask = smoothstep(0.65, 0.90, sampleLum);

      // Even warmer tint for outer glow
      vec3 warmSample = sample.rgb;
      warmSample.r *= 1.4;
      warmSample.g *= 1.0;
      warmSample.b *= 0.6;

      halation += warmSample * brightMask * 0.6; // Softer weight
      halationWeight += brightMask * 0.6;
    }

    // === SECONDARY GLOW: Extended soft bloom ===
    vec3 secondaryGlow = vec3(0.0);
    float glowWeight = 0.0;

    float glowRadius = mix(0.04, 0.12, u_intensity);
    for (int ring = 0; ring < 3; ring++) {
      float ringRadius = glowRadius * (float(ring) + 1.0) / 3.0;
      float ringFalloff = 1.0 - float(ring) * 0.35;

      for (int i = 0; i < 16; i++) {
        float angle = float(i) * 3.14159 * 2.0 / 16.0 + float(ring) * 0.4;
        vec2 offset = vec2(cos(angle), sin(angle)) * ringRadius;

        vec4 sample = texture2D(u_image, v_texCoord + offset);
        float sampleLum = dot(sample.rgb, vec3(0.299, 0.587, 0.114));

        // Only bright areas
        float brightMask = smoothstep(0.60, 0.85, sampleLum);

        // Slight warm tint
        vec3 warmSample = sample.rgb;
        warmSample.r *= 1.15;
        warmSample.g *= 1.02;
        warmSample.b *= 0.85;

        secondaryGlow += warmSample * brightMask * ringFalloff;
        glowWeight += brightMask * ringFalloff;
      }
    }

    // Normalize
    if (halationWeight > 0.01) halation /= halationWeight;
    if (glowWeight > 0.01) secondaryGlow /= glowWeight;

    // === COMPOSITE: Additive blend (preserves dark areas) ===
    vec3 result = original.rgb;

    // Halation strength (more intense, tighter)
    float halationStrength = u_intensity * 0.7;
    result += halation * halationStrength * halationWeight * 0.15;

    // Secondary glow strength (softer, wider)
    float glowStrength = u_intensity * 0.5;
    result += secondaryGlow * glowStrength * glowWeight * 0.1;

    // Slight contrast boost to keep darks punchy
    result = mix(result, result * result * (3.0 - 2.0 * result), 0.08 * u_intensity);

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), original.a);
  }
`;

// Light Trails - Echoing/ghosting with luminance masking
export const lightTrailsShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  uniform float u_angle; // Trail direction in degrees
  varying vec2 v_texCoord;

  void main() {
    if (u_intensity < 0.00001) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    vec4 original = texture2D(u_image, v_texCoord);
    float luminance = dot(original.rgb, vec3(0.299, 0.587, 0.114));

    // VERY aggressive luminance masking - ONLY bright lights create trails
    float trailMask = smoothstep(0.7, 0.9, luminance);

    if (trailMask < 0.01) {
      gl_FragColor = original;
      return;
    }

    // Convert angle to radians and calculate direction vector
    float angleRad = u_angle * 0.017453292519943295; // PI / 180
    vec2 direction = vec2(cos(angleRad), sin(angleRad));

    // Number of echoes based on intensity (ensure at least 3)
    int echoes = int(mix(5.0, 10.0, u_intensity));
    if (echoes < 3) echoes = 3;
    float trailLength = mix(0.02, 0.08, u_intensity); // Longer trails

    vec4 trailColor = vec4(0.0);
    float totalWeight = 0.0;

    // Create echoing effect with decreasing opacity and positional offset
    for (int i = 0; i < 10; i++) {
      if (i >= echoes) break;

      float t = float(i) / max(float(echoes), 1.0);

      // Exponential falloff for opacity (more realistic)
      float opacity = exp(-t * 4.0);

      // Positional offset along direction
      vec2 offset = direction * t * trailLength;
      vec4 sample = texture2D(u_image, v_texCoord + offset);

      // Only contribute if sample is also bright (prevents muddy shadows)
      float sampleLum = dot(sample.rgb, vec3(0.299, 0.587, 0.114));
      float sampleMask = smoothstep(0.5, 0.8, sampleLum);

      float weight = opacity * sampleMask;
      trailColor += sample * weight;
      totalWeight += weight;
    }

    if (totalWeight > 0.0) {
      trailColor /= totalWeight;
    }

    // Blend trails with original based on trail mask
    vec4 result = mix(original, trailColor, trailMask * u_intensity * 0.7);

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
    if (u_intensity < 0.00001) {
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
