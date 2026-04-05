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

// Lateral Motion - tighter handheld smear with subtle wobble
export const lateralMotionShader = `
  precision highp float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  uniform vec2 u_swirlCenter;
  varying vec2 v_texCoord;

  // Comet curve - brighter at edges, dimmer in middle
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

    // Motion should read immediately, even at lower slider values.
    float intensityCurve = 0.44 + pow(u_intensity, 0.9) * 0.56;
    float offset = mix(0.042, 0.10, intensityCurve);

    // Fewer layers than drift so the blur feels tighter and more handheld.
    for (int g = 0; g < 6; g++) {
      float ghostIndex = float(g);
      float ghostThreshold = mix(3.0, 5.0, intensityCurve);
      if (ghostIndex >= ghostThreshold) break;

      float ghostCenter = (ghostThreshold - 1.0) * 0.5;
      float ghostDistance = abs(ghostIndex - ghostCenter);
      float ghostOffset = (ghostIndex - ghostCenter) * offset * 0.36;
      float ghostOpacity = exp(-ghostDistance * 1.1);

      // Dynamic samples (10-32)
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

// Zoom should feel like a radial shutter pull, not just a softened original.
export const verticalZoomShader = `
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

// Swirl v1 (original 398f27c) - fixed center, more aggressive, no blending
export const cinematicSwirlShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform vec2 u_resolution;
  uniform vec2 u_swirlCenter;
  varying vec2 v_texCoord;

  float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    // Use tappable center (falls back to 0.5, 0.5 if not set)
    vec2 center = u_swirlCenter;
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

// Handheld Drift - restore the earlier diagonal slow-shutter trail.
export const handheldDriftShader = `
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

    // Remapped intensity: 0% slider = 15% effect, always visible
    float curve = 0.15 + u_intensity * 0.85;
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

// RESTORED: WKW/35mm Film - soft-clip, subtractive saturation, density-based grain
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

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float filmGrain(vec2 p) {
    float n = noise(p) * 0.5;
    n += noise(p * 2.0) * 0.25;
    n += noise(p * 4.0) * 0.125;
    return n * 2.0 - 0.875;
  }

  void main() {
    vec4 original = texture2D(u_image, v_texCoord);
    if (u_intensity < 0.001) {
      gl_FragColor = original;
      return;
    }

    // Remapped intensity: 0% slider = 15% effect, always visible
    float ic = 0.15 + u_intensity * 0.85;
    vec3 color = original.rgb;
    float lum = dot(color, vec3(0.299, 0.587, 0.114));

    // === 1. SOFT-CLIP ROLL-OFF ===
    vec3 warmCream = vec3(1.0, 0.976, 0.941);
    float preLum = dot(color, vec3(0.299, 0.587, 0.114));
    if (preLum > 0.9) {
      float excess = (preLum - 0.9) / 0.1;
      float softClip = 0.9 + excess * excess * 0.06;
      float scale = softClip / max(preLum, 0.001);
      color *= scale;
      color = mix(color, warmCream * softClip, excess * ic * 0.5);
    }

    // === 2. SUBTRACTIVE SATURATION ===
    lum = dot(color, vec3(0.299, 0.587, 0.114));
    float preHighlightMask = smoothstep(0.55, 0.7, lum) * (1.0 - smoothstep(0.8, 0.92, lum));
    vec3 gray = vec3(lum);
    float subtractiveSat = 1.0 + preHighlightMask * ic * 0.25;
    color = mix(gray, color, subtractiveSat);

    // === 3. COLOR TIMING ===
    float blackPoint = 0.05 * ic;
    color = max(vec3(0.0), (color - blackPoint) / (1.0 - blackPoint));
    lum = dot(color, vec3(0.299, 0.587, 0.114));

    vec3 tealShadow = vec3(-0.01, 0.04, 0.055);
    float shadowMask = 1.0 - smoothstep(0.0, 0.20, lum);
    color += tealShadow * shadowMask * ic;

    float highlightMask = smoothstep(0.6, 0.88, lum);
    color.r += highlightMask * ic * 0.05;
    color.g += highlightMask * ic * 0.02;

    float midMask = smoothstep(0.2, 0.45, lum) * (1.0 - smoothstep(0.55, 0.75, lum));
    color.r *= 1.0 + midMask * ic * 0.04;
    color.b *= 1.0 - midMask * ic * 0.03;

    // === 4. DENSITY-BASED GRAIN ===
    float grainScale = 160.0 * (u_resolution.x / 1000.0);
    float grain = filmGrain(v_texCoord * grainScale + 100.0);
    float grainLum = dot(color, vec3(0.299, 0.587, 0.114));
    float grainOpacity = clamp(1.0 - (grainLum * 0.8), 0.0, 1.0);
    float grainStrength = mix(0.025, 0.07, ic);
    color += vec3(grain * grainStrength * grainOpacity);

    // === 5. VIGNETTE ===
    vec2 vig = v_texCoord - 0.5;
    float vigAmount = smoothstep(0.25, 1.0, 1.0 - dot(vig, vig) * 0.7);
    color *= mix(1.0, vigAmount, ic * 0.25);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), original.a);
  }
`;

// Vortex - aggressive circular spin blur with concentric streaks
export const vortexShader = `
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

    // AGGRESSIVE rotation - creates visible concentric streaks
    float maxRotation = curve * 0.65;

    // Tight center protection
    float centerBlend = smoothstep(0.0, 0.15, distance);

    // Less original weight = more blur visible
    vec4 color = original * 1.5;
    float totalWeight = 1.5;

    // === HARSH SPIN BLUR ===
    // Fewer samples + stronger rotation = visible circular streaks
    for (int i = 1; i <= 16; i++) {
      float t = float(i) / 16.0;

      // Strong rotation angle
      float angle = t * maxRotation * distance;

      float cosA = cos(angle);
      float sinA = sin(angle);

      // Clockwise rotation
      vec2 cwPos = center + vec2(
        direction.x * cosA - direction.y * sinA,
        direction.x * sinA + direction.y * cosA
      );

      // Counter-clockwise rotation
      vec2 ccwPos = center + vec2(
        direction.x * cosA + direction.y * sinA,
        -direction.x * sinA + direction.y * cosA
      );

      // Sharp falloff - less blending between samples
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

    // Contrast boost to keep it punchy
    result = (result - 0.5) * (1.0 + u_intensity * 0.2) + 0.5;

    // Saturation restoration
    float gray = dot(result, vec3(0.299, 0.587, 0.114));
    result = mix(vec3(gray), result, 1.0 + u_intensity * 0.1);

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
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
