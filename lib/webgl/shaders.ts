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

// Lateral Motion Blur - horizontal directional blur with ghosting + Comet Effect
// Comet Effect: Brighter at start/end of motion, dimmer in middle (variable camera velocity)
export const lateralMotionShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  // Cubic bezier approximation for comet curve
  float cometBezier(float t) {
    // U-shape: bright at edges, dim in middle (simulates acceleration/deceleration)
    float t2 = t * 2.0 - 1.0; // Remap to -1 to 1
    float u = t2 * t2;        // Parabola (0 at edges, 1 at middle)
    float cubic = u * u * (3.0 - 2.0 * u);
    return 1.0 - cubic * 0.55; // 0.45 at middle, 1.0 at edges
  }

  void main() {
    if (u_intensity < 0.00001) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    vec4 original = texture2D(u_image, v_texCoord);
    vec4 color = vec4(0.0);
    float total = 0.0;

    // Motion sweep with ghosting echoes
    int samples = int(mix(10.0, 32.0, u_intensity));
    float offset = mix(0.006, 0.05, u_intensity);

    // Create ghosting effect - multiple discrete echoes
    int ghosts = int(mix(2.0, 6.0, u_intensity));

    for (int g = 0; g < 6; g++) {
      if (g >= ghosts) break;

      float ghostOffset = float(g) * offset / float(ghosts);
      float ghostOpacity = exp(-float(g) * 1.4);

      for (int i = 0; i < 32; i++) {
        if (i >= samples) break;

        float t = float(i) / float(samples - 1);

        // === COMET EFFECT: Bezier curve opacity ===
        // Brighter at start (t=0) and end (t=1), dimmer in middle (t=0.5)
        // Simulates variable camera velocity during motion
        float cometCurve = cometBezier(t);

        float x = (t - 0.5) * offset + ghostOffset;
        vec2 sampleCoord = v_texCoord + vec2(x, 0.0);

        vec4 sample = texture2D(u_image, sampleCoord);

        // Luminance-weighted sampling (brighter areas trail more)
        float luminance = dot(sample.rgb, vec3(0.299, 0.587, 0.114));
        float weight = mix(0.5, 1.0, luminance) * ghostOpacity * cometCurve;

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

    // Gentler intensity curve for more natural progression
    float intensityCurve = u_intensity * u_intensity;

    int samples = int(mix(12.0, 35.0, intensityCurve));
    float zoomStrength = mix(0.01, 0.12, intensityCurve);
    float rotationStrength = mix(0.0, 0.15, intensityCurve);

    // Subject preservation - keep center completely clear
    // Inner radius: completely sharp, no blur
    // Outer radius: full effect
    float innerRadius = 0.03;  // Clear center zone (reduced from 0.08)
    float outerRadius = 0.25;  // Full effect zone (reduced from 0.35)
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

// Handheld Drift - diagonal blur with organic feel, ghosting + Comet Effect
export const handheldDriftShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // Comet curve - variable camera velocity
  float cometBezier(float t) {
    float t2 = t * 2.0 - 1.0;
    float u = t2 * t2;
    float cubic = u * u * (3.0 - 2.0 * u);
    return 1.0 - cubic * 0.5;
  }

  void main() {
    if (u_intensity < 0.00001) {
      gl_FragColor = texture2D(u_image, v_texCoord);
      return;
    }

    vec4 original = texture2D(u_image, v_texCoord);
    vec4 color = vec4(0.0);
    float total = 0.0;

    int samples = int(mix(10.0, 28.0, u_intensity));
    float strength = mix(0.006, 0.04, u_intensity);

    // Diagonal drift with ghosting echoes
    vec2 driftDir = normalize(vec2(1.0, 0.3));
    int ghosts = int(mix(2.0, 5.0, u_intensity));

    for (int g = 0; g < 5; g++) {
      if (g >= ghosts) break;

      float ghostOffset = float(g) * strength * 0.4;
      float ghostOpacity = exp(-float(g) * 1.6);

      for (int i = 0; i < 28; i++) {
        if (i >= samples) break;

        float t = float(i) / float(samples - 1);

        // Comet effect for variable velocity feel
        float cometCurve = cometBezier(t);

        // Organic randomization
        float randomOffset = random(v_texCoord + float(i) + float(g)) * 0.25;
        vec2 offset = driftDir * (t + randomOffset) * strength + driftDir * ghostOffset;

        vec2 sampleCoord = v_texCoord + offset;
        vec4 sample = texture2D(u_image, sampleCoord);

        // Luminance weighting for more pronounced trails on bright areas
        float luminance = dot(sample.rgb, vec3(0.299, 0.587, 0.114));
        float weight = mix(0.6, 1.0, luminance) * cometCurve * ghostOpacity;

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

// Soft Light - Instagram-style subtle glow
// Lifts midtones and adds dreamy glow to highlights without overexposure
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

    // Quadratic intensity curve for gentle progression
    float intensityCurve = u_intensity * u_intensity;

    // === Subtle Glow on Highlights ===
    vec3 glow = vec3(0.0);
    float glowWeight = 0.0;

    // Single soft glow pass (wider radius for dreamy effect)
    float glowRadius = mix(0.012, 0.035, intensityCurve);
    for (int i = 0; i < 12; i++) {
      float angle = float(i) * 3.14159 * 2.0 / 12.0;
      vec2 offset = vec2(cos(angle), sin(angle)) * glowRadius;

      vec4 sample = texture2D(u_image, v_texCoord + offset);
      float sampleLum = dot(sample.rgb, vec3(0.299, 0.587, 0.114));

      // Only moderately bright pixels contribute (softer threshold)
      float brightMask = smoothstep(0.50, 0.85, sampleLum);

      // Very subtle warm tint
      vec3 warmSample = sample.rgb;
      warmSample.r *= 1.05;
      warmSample.b *= 0.98;

      glow += warmSample * brightMask;
      glowWeight += brightMask;
    }

    if (glowWeight > 0.01) {
      glow /= glowWeight;
    }

    // === COMPOSITE: Soft blend (Instagram Soft Light style) ===
    vec3 result = original.rgb;

    // Lift midtones slightly (opens up shadows without crushing blacks)
    float midtoneLift = intensityCurve * 0.08;
    result = mix(result, sqrt(result), midtoneLift * (1.0 - luminance)); // Lift shadows more than highlights

    // Add subtle glow to bright areas (no overexposure)
    float glowStrength = intensityCurve * 0.3;
    result += glow * glowStrength * glowWeight * 0.08;

    // Very subtle warmth overall
    result.r *= 1.0 + (intensityCurve * 0.02);
    result.b *= 1.0 - (intensityCurve * 0.01);

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), original.a);
  }
`;

// Light Trails - Long Smooth Light Streaks
// Creates long, continuous light trails like slow shutter car lights
// Strong chromatic separation with smooth blending
export const lightTrailsShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_intensity;  // Controls trail length and strength
  uniform vec2 u_resolution;
  uniform float u_angle;      // Trail direction 0-360 degrees
  varying vec2 v_texCoord;

  void main() {
    vec4 original = texture2D(u_image, v_texCoord);

    if (u_intensity < 0.00001) {
      gl_FragColor = original;
      return;
    }

    float luminance = dot(original.rgb, vec3(0.299, 0.587, 0.114));

    // Convert angle to radians and calculate direction vector
    float angleRad = u_angle * 0.017453292519943295; // PI / 180
    vec2 direction = vec2(cos(angleRad), sin(angleRad));

    // Aspect ratio correction for proper diagonal trails
    vec2 aspectCorrection = vec2(1.0, u_resolution.x / u_resolution.y);

    // Much longer trails - quadratic curve for smooth ramp
    float trailLength = u_intensity * u_intensity * 0.65; // 2.5x longer than before

    // More samples for ultra-smooth continuous streaks (20 samples)
    vec3 trailAccum = vec3(0.0);
    float totalWeight = 0.0;

    for (int i = 0; i < 20; i++) {
      float t = float(i) / 19.0; // 0.0 to 1.0

      // Very gentle exponential falloff for long smooth trails
      float falloff = exp(-1.8 * t); // Gentler than before (-1.8 vs -3.0)
      float echoOpacity = falloff;

      // Offset position along trail direction
      vec2 offset = direction * aspectCorrection * t * trailLength;
      vec4 sample = texture2D(u_image, v_texCoord + offset);

      // Only bright pixels contribute - lower threshold for more visible trails
      float sampleLum = dot(sample.rgb, vec3(0.299, 0.587, 0.114));
      float brightThreshold = mix(0.50, 0.40, u_intensity);
      float brightMask = smoothstep(brightThreshold, 0.82, sampleLum);

      // Strong chromatic separation (like car lights: red, yellow, green, cyan)
      vec3 chromaShift = sample.rgb;
      float chromaAmount = t * 0.7 * u_intensity; // Stronger chroma split

      // Enhanced RGB split for vivid color trails
      chromaShift.r *= 1.0 - chromaAmount * 0.35; // Red fades back
      chromaShift.g *= 1.0 + chromaAmount * 0.15; // Green stays strong
      chromaShift.b *= 1.0 + chromaAmount * 0.55; // Blue intensifies at tail

      // Accumulate with smooth weighting
      float weight = brightMask * echoOpacity;
      trailAccum += chromaShift * weight;
      totalWeight += weight;
    }

    if (totalWeight > 0.01) {
      trailAccum /= totalWeight;
    }

    // Strong additive blend for dramatic light trails
    vec3 result = original.rgb;

    // Screen blend for luminous glow
    float blendStrength = u_intensity * 1.8; // Stronger blend
    vec3 screenBlend = 1.0 - (1.0 - result) * (1.0 - trailAccum * blendStrength);
    result = mix(result, screenBlend, u_intensity);

    // Strong additive component for vivid trails
    result += trailAccum * u_intensity * 0.65;

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), original.a);
  }
`;

// Wong Kar-Wai / Chungking Express Film Effect
// LAYER 1: Luminance-Aware Grain (fBm noise, visible in midtones only)
// LAYER 2: Red-Shift Halation (red #FF3E3E blur on bright edges, luminance > 0.8)
// LAYER 3: WKW Color Grading (teal shadows, hot reds/yellows, heavy S-curve)
export const filmicGrainShader = `
  precision highp float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  // === LAYER 1: fBm Turbulence Noise (like feTurbulence) ===
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep interpolation
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Fractal Brownian Motion - mimics feTurbulence with multiple octaves
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  // === LAYER 3: Heavy S-Curve for crushed blacks ===
  float sCurve(float x) {
    // Aggressive S-curve: crushes blacks, pushes highlights
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
  }

  void main() {
    vec4 original = texture2D(u_image, v_texCoord);
    if (u_intensity < 0.00001) {
      gl_FragColor = original;
      return;
    }

    // Quadratic intensity curve
    float ic = u_intensity * u_intensity;
    vec3 color = original.rgb;
    float lum = dot(color, vec3(0.299, 0.587, 0.114));

    // ================================================================
    // LAYER 2: RED-SHIFT HALATION
    // Identify bright edges (luminance > 0.8), apply soft red blur
    // Mimics chemical bleed into red layer of 35mm film stock
    // ================================================================
    vec3 halation = vec3(0.0);
    float halationWeight = 0.0;

    // Multi-ring blur for soft halation glow
    float baseRadius = mix(0.008, 0.025, ic);

    for (int ring = 0; ring < 3; ring++) {
      float ringRadius = baseRadius * (1.0 + float(ring) * 0.8);
      float ringFalloff = 1.0 - float(ring) * 0.25;

      for (int i = 0; i < 12; i++) {
        float angle = float(i) * 6.28318 / 12.0 + float(ring) * 0.3;
        vec2 offset = vec2(cos(angle), sin(angle)) * ringRadius;
        vec4 s = texture2D(u_image, v_texCoord + offset);
        float sLum = dot(s.rgb, vec3(0.299, 0.587, 0.114));

        // Only bright areas contribute (luminance > 0.8)
        float brightMask = smoothstep(0.75, 0.95, sLum);

        halation += s.rgb * brightMask * ringFalloff;
        halationWeight += brightMask * ringFalloff;
      }
    }

    if (halationWeight > 0.01) {
      halation /= halationWeight;

      // RED TINT: Push halation toward #FF3E3E
      // Original: (1.0, 0.24, 0.24)
      vec3 redTint = vec3(1.0, 0.35, 0.35);
      halation = mix(halation, halation * redTint, 0.6);

      // Screen blend for luminous glow (doesn't darken)
      vec3 screenBlend = 1.0 - (1.0 - color) * (1.0 - halation);
      color = mix(color, screenBlend, ic * 0.4 * min(halationWeight, 1.0));
    }

    // ================================================================
    // LAYER 3: WKW COLOR GRADING (Teal & Gold)
    // ================================================================

    // --- SHADOWS: Teal/Cyan tint ---
    vec3 tealTint = vec3(-0.03, 0.06, 0.08);
    float shadowMask = 1.0 - smoothstep(0.0, 0.35, lum);
    color += tealTint * shadowMask * ic;

    // --- HIGHLIGHTS: Hot reds and yellows ---
    float highlightMask = smoothstep(0.5, 0.9, lum);
    float redAmount = max(0.0, color.r - max(color.g, color.b));

    // Push reds hotter
    color.r *= 1.0 + redAmount * highlightMask * ic * 0.5;
    // Add warmth (yellow/orange push)
    color.r *= 1.0 + highlightMask * ic * 0.08;
    color.g *= 1.0 + highlightMask * ic * 0.03;

    // --- HEAVY S-CURVE: Crush blacks, moody contrast ---
    float curveStrength = ic * 0.7;
    color.r = mix(color.r, sCurve(color.r), curveStrength);
    color.g = mix(color.g, sCurve(color.g), curveStrength);
    color.b = mix(color.b, sCurve(color.b), curveStrength);

    // ================================================================
    // LAYER 1: LUMINANCE-AWARE GRAIN
    // Visible in midtones, invisible in highlights and deep blacks
    // Feels like it's part of the film emulsion
    // ================================================================
    float grainScale = 150.0 * (u_resolution.x / 1000.0); // Resolution-aware
    float g1 = fbm(v_texCoord * grainScale) * 2.0 - 1.0;
    float g2 = fbm(v_texCoord * grainScale * 1.7 + 50.0) * 2.0 - 1.0;
    float grain = (g1 + g2 * 0.5) / 1.5;

    // Midtone mask: peaks at 0.5, fades to 0 at blacks and whites
    float midtoneMask = 1.0 - pow(abs(lum - 0.5) * 2.0, 1.5);
    midtoneMask = clamp(midtoneMask, 0.0, 1.0);

    // Apply grain
    float grainStrength = mix(0.03, 0.10, ic);
    color += vec3(grain * grainStrength * midtoneMask);

    // ================================================================
    // VIGNETTE: Darken edges for that moody WKW look
    // ================================================================
    vec2 vignette = v_texCoord - 0.5;
    float vignetteAmount = 1.0 - dot(vignette, vignette) * 1.2;
    vignetteAmount = smoothstep(0.0, 1.0, vignetteAmount);
    color *= mix(1.0, vignetteAmount, ic * 0.4);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), original.a);
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

// Vintage Halation - Warm glow bleeding from bright areas (70s/80s film stock)
export const vintageHalationShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  void main() {
    vec4 original = texture2D(u_image, v_texCoord);
    float luminance = dot(original.rgb, vec3(0.299, 0.587, 0.114));

    // Warm halation glow from bright areas
    vec3 halation = vec3(0.0);
    float halationWeight = 0.0;

    // Sample ring around current pixel
    float radius = 0.015;
    for (int i = 0; i < 16; i++) {
      float angle = float(i) * 3.14159 * 2.0 / 16.0;
      vec2 offset = vec2(cos(angle), sin(angle)) * radius;

      vec4 sample = texture2D(u_image, v_texCoord + offset);
      float sampleLum = dot(sample.rgb, vec3(0.299, 0.587, 0.114));

      // Only very bright pixels contribute (> 70%)
      float brightMask = smoothstep(0.70, 0.95, sampleLum);

      // Warm vintage tint: orange/amber glow
      vec3 warmSample = sample.rgb;
      warmSample.r *= 1.4;
      warmSample.g *= 1.1;
      warmSample.b *= 0.6;

      halation += warmSample * brightMask;
      halationWeight += brightMask;
    }

    if (halationWeight > 0.01) {
      halation /= halationWeight;
    }

    // Blend halation with original
    vec3 result = original.rgb + halation * halationWeight * 0.25;

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), original.a);
  }
`;

// Vintage Color Grade - Faded, warm 70s film look
export const vintageColorGradeShader = `
  precision mediump float;
  uniform sampler2D u_image;
  varying vec2 v_texCoord;

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Lift blacks slightly (faded look)
    color.rgb = mix(color.rgb, color.rgb + vec3(0.05, 0.04, 0.03), 0.4);

    // Warm shift (vintage amber tones)
    color.r *= 1.08;
    color.g *= 1.02;
    color.b *= 0.92;

    // Reduce saturation slightly (faded film)
    vec3 gray = vec3(luminance);
    color.rgb = mix(gray, color.rgb, 0.85);

    // Soft roll-off on highlights (film latitude)
    if (luminance > 0.7) {
      float rolloff = (luminance - 0.7) / 0.3;
      color.rgb = mix(color.rgb, vec3(1.0), rolloff * 0.15);
    }

    gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
  }
`;
