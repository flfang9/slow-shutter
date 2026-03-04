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
    vec4 color = vec4(0.0);
    float total = 0.0;

    // Number of samples based on intensity
    int samples = int(mix(5.0, 25.0, u_intensity));
    float offset = mix(0.001, 0.005, u_intensity);

    for (int i = 0; i < 25; i++) {
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
    vec2 center = vec2(0.5, 0.0); // Bottom center
    vec2 direction = v_texCoord - center;

    vec4 color = vec4(0.0);
    float total = 0.0;

    int samples = int(mix(5.0, 20.0, u_intensity));
    float strength = mix(0.01, 0.08, u_intensity);

    // Gradient mask - stronger at top, subtle at bottom
    float gradient = v_texCoord.y;
    strength *= gradient;

    for (int i = 0; i < 20; i++) {
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
    vec4 color = vec4(0.0);
    float total = 0.0;

    int samples = int(mix(5.0, 18.0, u_intensity));
    float strength = mix(0.001, 0.004, u_intensity);

    // Diagonal drift direction with subtle randomization
    vec2 driftDir = normalize(vec2(1.0, 0.3));

    for (int i = 0; i < 18; i++) {
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
