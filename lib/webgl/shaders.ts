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

// Lateral Motion Blur - horizontal directional blur (mobile sync)
export const lateralMotionShader = `
  precision highp float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  uniform vec2 u_swirlCenter;
  varying vec2 v_texCoord;

  void main() {
    vec4 original = texture2D(u_image, v_texCoord);
    if (u_intensity < 0.00001) {
      gl_FragColor = original;
      return;
    }

    // Use softer curve: pow(1.5) for better low-value visibility
    float curve = pow(u_intensity, 1.5);

    vec4 color = vec4(0.0);
    float total = 0.0;
    float blur = curve * 0.15;

    for (int i = 0; i < 15; i++) {
      float t = (float(i) / 14.0) - 0.5;
      vec2 offset = vec2(t * blur, 0.0);
      vec4 s = texture2D(u_image, v_texCoord + offset);
      float w = 1.0 - abs(t);
      color += s * w;
      total += w;
    }

    vec4 effect = color / total;
    gl_FragColor = mix(original, effect, curve);
  }
`;

// Vertical Zoom Pull - radial blur from center (mobile sync)
export const verticalZoomShader = `
  precision highp float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  uniform vec2 u_swirlCenter;
  varying vec2 v_texCoord;

  void main() {
    vec4 original = texture2D(u_image, v_texCoord);
    if (u_intensity < 0.00001) {
      gl_FragColor = original;
      return;
    }

    float curve = pow(u_intensity, 1.5);
    vec2 center = u_swirlCenter;
    vec2 dir = v_texCoord - center;

    vec4 color = vec4(0.0);
    float total = 0.0;
    float strength = curve * 0.25;

    for (int i = 0; i < 12; i++) {
      float t = float(i) / 11.0;
      vec2 sampleCoord = center + dir * (1.0 - t * strength);
      vec4 s = texture2D(u_image, sampleCoord);
      float w = 1.0 - t * 0.5;
      color += s * w;
      total += w;
    }

    vec4 effect = color / total;
    gl_FragColor = mix(original, effect, curve);
  }
`;

// Cinematic Swirl - radial zoom with rotation (mobile sync)
export const cinematicSwirlShader = `
  precision highp float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  uniform vec2 u_swirlCenter;
  varying vec2 v_texCoord;

  void main() {
    vec4 original = texture2D(u_image, v_texCoord);
    if (u_intensity < 0.00001) {
      gl_FragColor = original;
      return;
    }

    float curve = pow(u_intensity, 1.5);
    vec2 center = u_swirlCenter;
    vec2 dir = v_texCoord - center;

    vec4 color = vec4(0.0);
    float total = 0.0;
    float zoomStr = curve * 0.2;
    float rotStr = curve * 0.25;

    for (int i = 0; i < 16; i++) {
      float t = float(i) / 15.0;
      float angle = t * rotStr;
      float c = cos(angle);
      float s = sin(angle);
      vec2 rotDir = vec2(dir.x * c - dir.y * s, dir.x * s + dir.y * c);
      vec2 sampleCoord = center + rotDir * (1.0 - t * zoomStr);
      vec4 samp = texture2D(u_image, sampleCoord);
      float w = 1.0 - t * 0.3;
      color += samp * w;
      total += w;
    }

    vec4 effect = color / total;
    gl_FragColor = mix(original, effect, curve);
  }
`;

// Handheld Drift - diagonal blur with organic feel (mobile sync)
export const handheldDriftShader = `
  precision highp float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  uniform vec2 u_swirlCenter;
  varying vec2 v_texCoord;

  void main() {
    vec4 original = texture2D(u_image, v_texCoord);
    if (u_intensity < 0.00001) {
      gl_FragColor = original;
      return;
    }

    float curve = pow(u_intensity, 1.5);

    vec4 color = vec4(0.0);
    float total = 0.0;
    float strength = curve * 0.075;
    vec2 driftDir = normalize(vec2(1.0, 0.3));
    vec2 ortho = vec2(-driftDir.y, driftDir.x);

    for (int i = 0; i < 12; i++) {
      float t = float(i) / 11.0;
      float centered = t - 0.5;
      float sway = sin(float(i) * 1.7) * strength * 0.12;
      vec2 offset = driftDir * centered * strength + ortho * sway;
      vec4 s = texture2D(u_image, v_texCoord + offset);
      float w = 1.0 - abs(centered) * 1.15;
      color += s * w;
      total += w;
    }

    vec4 effect = color / total;
    gl_FragColor = mix(original, effect, curve);
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

// Soft Light - Instagram-style glow (mobile sync - multi-pass)
export const softLightShader = `
  precision highp float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  uniform vec2 u_swirlCenter;
  varying vec2 v_texCoord;

  void main() {
    vec4 original = texture2D(u_image, v_texCoord);
    if (u_intensity < 0.00001) {
      gl_FragColor = original;
      return;
    }

    float curve = pow(u_intensity, 1.5);
    vec3 color = original.rgb;
    float origLum = dot(original.rgb, vec3(0.299, 0.587, 0.114));

    // === 1. NOISE REDUCTION (stronger in shadows/midtones) ===
    vec3 smoothed = vec3(0.0);
    float smoothRadius = curve * 0.012;

    for (int i = 0; i < 12; i++) {
      float angle = float(i) * 0.5236;
      vec2 offset = vec2(cos(angle), sin(angle)) * smoothRadius;
      smoothed += texture2D(u_image, v_texCoord + offset).rgb;
    }
    smoothed /= 12.0;

    // Blur more in shadows, less in highlights (preserve detail in lights)
    float noiseReductionStrength = curve * 0.5 * (1.0 - origLum * 0.6);
    color = mix(color, smoothed, noiseReductionStrength);

    // === 2. SOFT BLUR (pro-mist diffusion) ===
    vec3 blurred = vec3(0.0);
    float blurRadius = curve * 0.02;

    for (int i = 0; i < 12; i++) {
      float angle = float(i) * 0.5236;
      vec2 offset = vec2(cos(angle), sin(angle)) * blurRadius;
      blurred += texture2D(u_image, v_texCoord + offset).rgb;
    }
    blurred /= 12.0;
    color = mix(color, blurred, curve * 0.35);

    // === 3. HIGHLIGHT + MIDTONE BLOOM (IG-style soft glow) ===
    vec3 bloom = vec3(0.0);
    float bloomRadius = curve * 0.065;

    // Inner ring samples
    for (int i = 0; i < 12; i++) {
      float angle = float(i) * 0.5236;
      vec2 offset1 = vec2(cos(angle), sin(angle)) * bloomRadius * 0.4;
      vec3 s1 = texture2D(u_image, v_texCoord + offset1).rgb;
      float lum1 = dot(s1, vec3(0.299, 0.587, 0.114));
      bloom += s1 * smoothstep(0.15, 0.6, lum1);
    }
    // Outer ring samples
    for (int i = 0; i < 12; i++) {
      float angle = float(i) * 0.5236;
      vec2 offset2 = vec2(cos(angle), sin(angle)) * bloomRadius;
      vec3 s2 = texture2D(u_image, v_texCoord + offset2).rgb;
      float lum2 = dot(s2, vec3(0.299, 0.587, 0.114));
      bloom += s2 * smoothstep(0.15, 0.6, lum2) * 0.6;
    }
    bloom /= 19.2;

    // Warm the bloom (subtle golden glow)
    bloom.r *= 1.10;
    bloom.g *= 1.05;
    bloom.b *= 0.90;

    // Add bloom
    color += bloom * curve * 0.5;

    // === 4. FLATTEN CONTRAST (dreamy haze) ===
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color, vec3(lum), curve * 0.06);
    color = mix(vec3(0.52), color, 1.0 - curve * 0.22);

    // === 5. SHADOW LIFT (milky blacks like IG) ===
    float shadowMask = 1.0 - smoothstep(0.0, 0.4, lum);
    color += vec3(curve * 0.06);
    color += vec3(curve * 0.04) * shadowMask;

    // === 6. WARM GRADE (creamy, balanced) ===
    color.r *= 1.0 + curve * 0.07;
    color.g *= 1.0 + curve * 0.05;
    color.b *= 1.0 - curve * 0.04;

    // Soft pink-warmth on highlights (IG signature)
    float hlMask = smoothstep(0.5, 0.9, lum);
    color.r += hlMask * curve * 0.04;
    color.g += hlMask * curve * 0.03;

    gl_FragColor = vec4(mix(original.rgb, clamp(color, 0.0, 1.0), curve), 1.0);
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

// Film Grain - cinematic color grade (mobile sync)
export const filmicGrainShader = `
  precision highp float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  uniform vec2 u_swirlCenter;
  varying vec2 v_texCoord;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec4 original = texture2D(u_image, v_texCoord);
    if (u_intensity < 0.001) {
      gl_FragColor = original;
      return;
    }

    float curve = pow(u_intensity, 1.5);
    vec3 color = original.rgb;
    float lum = dot(color, vec3(0.299, 0.587, 0.114));

    // === 1. HALATION - warm glow around highlights ===
    vec3 halation = vec3(0.0);
    float halationRadius = curve * 0.04;
    for (int i = 0; i < 8; i++) {
      float angle = float(i) * 0.785398;
      vec2 offset = vec2(cos(angle), sin(angle)) * halationRadius;
      vec3 s = texture2D(u_image, v_texCoord + offset).rgb;
      float sLum = dot(s, vec3(0.299, 0.587, 0.114));
      halation += s * smoothstep(0.5, 0.9, sLum);
    }
    halation /= 8.0;
    // Halation is warm/red tinted
    halation.r *= 1.4;
    halation.g *= 1.0;
    halation.b *= 0.6;
    color += halation * curve * 0.4;

    // === 2. FILM CURVE - lifted blacks, soft highlights ===
    color = max(color, vec3(curve * 0.03));
    color = color * color * (3.0 - 2.0 * color);
    color = mix(color, sqrt(color), curve * 0.3);

    // === 3. COLOR GRADE - cinematic film stock ===
    float shadowMask = 1.0 - smoothstep(0.0, 0.35, lum);
    color += vec3(-0.01, 0.02, 0.04) * shadowMask * curve;
    float hlMask = smoothstep(0.55, 0.85, lum);
    color.r += hlMask * curve * 0.04;
    color.g += hlMask * curve * 0.02;

    // === 4. FILM GRAIN - organic, varies by luminance ===
    float grain = hash(v_texCoord * 150.0 + vec2(4.2, 9.1)) * 2.0 - 1.0;
    float grainMask = 1.0 - abs(lum - 0.5) * 1.5;
    grainMask = max(grainMask, 0.12);
    color += vec3(grain) * curve * 0.018 * grainMask;

    // === 5. VIGNETTE ===
    vec2 vig = v_texCoord - 0.5;
    float vigAmount = 1.0 - dot(vig, vig) * curve * 0.6;
    color *= max(vigAmount, 0.7);

    gl_FragColor = vec4(mix(original.rgb, clamp(color, 0.0, 1.0), curve), 1.0);
  }
`;

// Fisheye - barrel lens distortion (mobile sync)
export const fisheyeShader = `
  precision highp float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  uniform vec2 u_swirlCenter;
  varying vec2 v_texCoord;

  void main() {
    vec4 original = texture2D(u_image, v_texCoord);
    if (u_intensity < 0.00001) {
      gl_FragColor = original;
      return;
    }

    float curve = pow(u_intensity, 1.5);

    // Center the UV
    vec2 uv = v_texCoord - 0.5;
    float dist = length(uv);

    // Simple barrel distortion - edges bow outward
    float k = curve * 0.4;

    // Distortion formula: pulls center pixels outward, stretches edges
    float distortionFactor = 1.0 + k * dist * dist;

    // Apply distortion
    vec2 distortedUV = uv / distortionFactor + 0.5;

    // Sample the texture
    vec4 color = texture2D(u_image, distortedUV);

    // Subtle vignette for that lens feel
    float vig = 1.0 - dist * dist * curve * 0.5;
    color.rgb *= max(vig, 0.7);

    // Mix with original
    gl_FragColor = vec4(mix(original.rgb, color.rgb, curve), 1.0);
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

// ENHANCE - Scene-aware post-processing boost
// Stacks ON TOP of any effect, doesn't modify effects themselves
// Silent scene detection: night (boost lights/contrast), day (protect highlights, add punch)
export const enhanceShader = `
  precision highp float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  void main() {
    vec4 original = texture2D(u_image, v_texCoord);

    if (u_intensity < 0.001) {
      gl_FragColor = original;
      return;
    }

    vec3 color = original.rgb;
    float ic = u_intensity;

    // ================================================================
    // SCENE DETECTION (silent, based on sampling)
    // ================================================================
    // Sample 9 points to estimate scene characteristics
    float totalLum = 0.0;
    float maxLum = 0.0;
    float minLum = 1.0;
    float brightPoints = 0.0;

    for (int y = 0; y < 3; y++) {
      for (int x = 0; x < 3; x++) {
        vec2 samplePos = vec2(float(x) + 0.5, float(y) + 0.5) / 3.0;
        vec3 s = texture2D(u_image, samplePos).rgb;
        float l = dot(s, vec3(0.299, 0.587, 0.114));
        totalLum += l;
        maxLum = max(maxLum, l);
        minLum = min(minLum, l);
        if (l > 0.7) brightPoints += 1.0;
      }
    }

    float avgLum = totalLum / 9.0;
    float contrast = maxLum - minLum;

    // Scene classification
    // Night: low avg luminance (<0.3), may have bright point lights
    // Day: higher avg luminance (>0.4)
    // Mixed/Golden: in between
    float isNight = smoothstep(0.35, 0.15, avgLum);
    float isDay = smoothstep(0.35, 0.55, avgLum);
    float hasBrightLights = smoothstep(1.0, 4.0, brightPoints);

    // Current pixel luminance
    float lum = dot(color, vec3(0.299, 0.587, 0.114));

    // ================================================================
    // NIGHT ENHANCEMENTS
    // ================================================================
    // Boost contrast, enhance bright points, deepen shadows

    // A. Contrast boost (S-curve)
    float nightContrast = isNight * ic * 0.4;
    vec3 nightColor = color;
    nightColor = (nightColor - 0.5) * (1.0 + nightContrast) + 0.5;

    // B. Bloom on bright points (light sources pop more)
    if (lum > 0.6 && isNight > 0.3) {
      float bloomAmount = smoothstep(0.6, 0.95, lum) * isNight * ic * 0.15;
      nightColor += nightColor * bloomAmount;
    }

    // C. Deepen shadows for night
    float shadowDeepen = isNight * ic * 0.08;
    nightColor = max(vec3(0.0), nightColor - shadowDeepen * (1.0 - lum));

    // ================================================================
    // DAY ENHANCEMENTS
    // ================================================================
    // Protect highlights, add color punch, subtle clarity

    vec3 dayColor = color;

    // A. Highlight protection (soft roll-off)
    if (lum > 0.85 && isDay > 0.3) {
      float excess = (lum - 0.85) / 0.15;
      float protection = 1.0 - excess * isDay * ic * 0.3;
      dayColor *= protection;
    }

    // B. Color punch (vibrance boost on less-saturated colors)
    float maxC = max(max(dayColor.r, dayColor.g), dayColor.b);
    float minC = min(min(dayColor.r, dayColor.g), dayColor.b);
    float sat = (maxC - minC) / max(maxC, 0.001);
    float vibranceBoost = (1.0 - sat) * isDay * ic * 0.25;
    vec3 dayGray = vec3(dot(dayColor, vec3(0.299, 0.587, 0.114)));
    dayColor = mix(dayGray, dayColor, 1.0 + vibranceBoost);

    // C. Subtle clarity (local contrast in midtones)
    float midMask = smoothstep(0.2, 0.4, lum) * (1.0 - smoothstep(0.6, 0.8, lum));
    float clarity = isDay * ic * 0.1 * midMask;
    dayColor = mix(dayColor, dayColor * (1.0 + (lum - 0.5) * 0.5), clarity);

    // ================================================================
    // BLEND BASED ON SCENE
    // ================================================================
    // Interpolate between night and day enhancements

    color = mix(color, nightColor, isNight);
    color = mix(color, dayColor, isDay);

    // For mixed scenes, apply subtle universal boost
    float isMixed = 1.0 - max(isNight, isDay);
    if (isMixed > 0.2) {
      // Gentle contrast + saturation
      color = (color - 0.5) * (1.0 + isMixed * ic * 0.15) + 0.5;
      vec3 mixedGray = vec3(dot(color, vec3(0.299, 0.587, 0.114)));
      color = mix(mixedGray, color, 1.0 + isMixed * ic * 0.1);
    }

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), original.a);
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
