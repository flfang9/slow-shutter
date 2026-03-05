import { EffectType } from '@/types';
import { createWebGLContext, createTexture } from './context';
import { compileShaderProgram } from './program';
import {
  vertexShaderSource,
  lateralMotionShader,
  verticalZoomShader,
  handheldDriftShader,
  cinematicSwirlShader,
  softLightShader,
  lightTrailsShader,
  filmicGrainShader,
  filmGrainShader,
  vibranceShader,
  bloomShader,
  contrastCurveShader,
  passThroughShader,
} from './shaders';

export class EffectProcessor {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private programs: Map<string, WebGLProgram> = new Map();
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;

  constructor(canvas: HTMLCanvasElement) {
    console.log('Initializing EffectProcessor with canvas:', canvas);
    this.canvas = canvas;
    const gl = createWebGLContext(canvas);
    if (!gl) {
      console.error('WebGL context creation failed');
      throw new Error('Failed to initialize WebGL');
    }
    console.log('WebGL context created:', gl);
    this.gl = gl;
    this.initializePrograms();
    this.initializeBuffers();
    this.setupContextLossHandling();
  }

  private setupContextLossHandling() {
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('WebGL context lost - preventing default behavior');
    }, false);

    this.canvas.addEventListener('webglcontextrestored', () => {
      console.log('WebGL context restored - reinitializing');
      try {
        this.initializePrograms();
        this.initializeBuffers();
      } catch (err) {
        console.error('Failed to restore WebGL context:', err);
      }
    }, false);
  }

  private initializeBuffers() {
    const gl = this.gl;

    // Create reusable quad buffers
    const positions = new Float32Array([
      -1, -1,  // bottom left
       1, -1,  // bottom right
      -1,  1,  // top left
       1,  1,  // top right
    ]);

    const texCoords = new Float32Array([
      0, 0,  // bottom left
      1, 0,  // bottom right
      0, 1,  // top left
      1, 1,  // top right
    ]);

    // Position buffer
    this.positionBuffer = gl.createBuffer();
    if (this.positionBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    }

    // Texture coordinate buffer
    this.texCoordBuffer = gl.createBuffer();
    if (this.texCoordBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    }
  }

  private initializePrograms() {
    const shaderMap: Record<string, string> = {
      'lateral-motion': lateralMotionShader,
      'vertical-zoom': verticalZoomShader,
      'handheld-drift': handheldDriftShader,
      'cinematic-swirl': cinematicSwirlShader,
      'soft-light': softLightShader,
      'light-trails': lightTrailsShader,
      'film-grain': filmicGrainShader,
      'post-film-grain': filmGrainShader,
      'vibrance': vibranceShader,
      'bloom': bloomShader,
      'contrast-curve': contrastCurveShader,
      'pass-through': passThroughShader,
    };

    console.log('Compiling shaders...');
    for (const [name, fragmentSource] of Object.entries(shaderMap)) {
      const program = compileShaderProgram(
        this.gl,
        vertexShaderSource,
        fragmentSource
      );
      if (program) {
        this.programs.set(name, program);
        console.log(`✓ Shader compiled: ${name}`);
      } else {
        console.error(`✗ Failed to compile shader: ${name}`);
      }
    }
    console.log(`Total shaders compiled: ${this.programs.size}/${Object.keys(shaderMap).length}`);
  }

  private renderPass(
    program: WebGLProgram,
    inputTexture: WebGLTexture,
    uniforms: Record<string, any> = {}
  ): WebGLTexture {
    const gl = this.gl;

    // Create framebuffer and output texture FIRST
    const framebuffer = gl.createFramebuffer();
    const outputTexture = gl.createTexture();

    // Setup output texture
    gl.bindTexture(gl.TEXTURE_2D, outputTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.canvas.width,
      this.canvas.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Attach to framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      outputTexture,
      0
    );

    // Now use the program and bind input texture
    gl.useProgram(program);

    // Setup quad geometry (reuse existing buffers)
    if (this.positionBuffer && this.texCoordBuffer) {
      // Bind position buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      const positionLocation = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Bind texture coordinate buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
    }

    // Bind input texture to texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);

    // Set uniforms
    for (const [name, value] of Object.entries(uniforms)) {
      const location = gl.getUniformLocation(program, name);
      if (location) {
        if (typeof value === 'number') {
          gl.uniform1f(location, value);
        } else if (Array.isArray(value) && value.length === 2) {
          gl.uniform2f(location, value[0], value[1]);
        }
      }
    }

    // Render
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Unbind everything to prevent feedback loops
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Clean up framebuffer (but keep texture for next pass)
    gl.deleteFramebuffer(framebuffer);

    return outputTexture!;
  }

  public async applyEffect(
    image: HTMLImageElement,
    effect: EffectType,
    intensity: number,
    options?: { swirlCenter?: { x: number; y: number } }
  ): Promise<HTMLCanvasElement> {
    console.log(`applyEffect called: effect=${effect}, intensity=${intensity}, image=${image.width}x${image.height}`);

    if (!image || !image.width || !image.height) {
      throw new Error('Invalid image provided');
    }
    const gl = this.gl;

    // Set canvas size to match image
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    console.log(`Canvas resized to: ${this.canvas.width}x${this.canvas.height}`);

    // Create initial texture from image
    let currentTexture = createTexture(gl, image);
    if (!currentTexture) {
      console.error('Failed to create texture from image');
      throw new Error('Failed to create texture from image');
    }
    console.log('Initial texture created');

    const resolution = [image.width, image.height];
    // Use cubic curve for ultra-smooth low-end control
    // This gives: 1% → 0.000001, 10% → 0.001, 50% → 0.125, 100% → 1.0
    const rawIntensity = intensity / 100;
    const normalizedIntensity = Math.pow(rawIntensity, 3); // Cubic curve

    // Track textures for cleanup
    const texturesToCleanup: WebGLTexture[] = [];

    // Step 1: Apply blur effect
    console.log(`Applying effect: ${effect} with intensity: ${normalizedIntensity}`);
    const effectProgram = this.programs.get(effect);
    if (!effectProgram) {
      throw new Error(`Effect "${effect}" not found or failed to compile`);
    }
    if (effectProgram) {
      const oldTexture = currentTexture;

      // Build uniforms - add angle for light-trails effect
      const uniforms: Record<string, any> = {
        u_intensity: normalizedIntensity,
        u_resolution: resolution,
      };

      // Default angle: 0 = horizontal trails (like city lights)
      if (effect === 'light-trails') {
        uniforms.u_angle = 0;
      }

      // Swirl center (from user tap or default)
      if (effect === 'cinematic-swirl') {
        const center = options?.swirlCenter || { x: 0.5, y: 0.45 };
        uniforms.u_swirlCenter = [center.x, center.y];
      }

      currentTexture = this.renderPass(effectProgram, currentTexture, uniforms);
      texturesToCleanup.push(oldTexture);
      console.log(`Effect ${effect} applied successfully`);
    } else {
      console.error(`Effect program not found: ${effect}`);
    }

    // Step 2: Post-processing stack (ONLY for film-grain effect)
    // For all other effects, skip post-processing to preserve original colors
    if (effect === 'film-grain') {
      // Film grain texture
      const grainProgram = this.programs.get('post-film-grain');
      if (grainProgram) {
        const oldTexture = currentTexture;
        currentTexture = this.renderPass(grainProgram, currentTexture, {
          u_time: Math.random() * 1000,
          u_resolution: resolution,
        });
        texturesToCleanup.push(oldTexture);
      }

      // Vibrance boost
      const vibranceProgram = this.programs.get('vibrance');
      if (vibranceProgram) {
        const oldTexture = currentTexture;
        currentTexture = this.renderPass(vibranceProgram, currentTexture);
        texturesToCleanup.push(oldTexture);
      }

      // Light bloom
      const bloomProgram = this.programs.get('bloom');
      if (bloomProgram) {
        const oldTexture = currentTexture;
        currentTexture = this.renderPass(bloomProgram, currentTexture, {
          u_resolution: resolution,
        });
        texturesToCleanup.push(oldTexture);
      }

      // Contrast curve
      const contrastProgram = this.programs.get('contrast-curve');
      if (contrastProgram) {
        const oldTexture = currentTexture;
        currentTexture = this.renderPass(contrastProgram, currentTexture);
        texturesToCleanup.push(oldTexture);
      }
    }

    // Final render to canvas
    console.log('Rendering final result to canvas');
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const finalProgram = this.programs.get('pass-through');
    if (finalProgram) {
      gl.useProgram(finalProgram);

      // Setup quad geometry (reuse existing buffers)
      if (this.positionBuffer && this.texCoordBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        const positionLocation = gl.getAttribLocation(finalProgram, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        const texCoordLocation = gl.getAttribLocation(finalProgram, 'a_texCoord');
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, currentTexture);
      gl.uniform1i(gl.getUniformLocation(finalProgram, 'u_image'), 0);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Unbind texture
      gl.bindTexture(gl.TEXTURE_2D, null);
      console.log('Final render complete');
    } else {
      console.error('Pass-through program not found!');
    }

    // Clean up all intermediate textures
    texturesToCleanup.push(currentTexture);
    for (const texture of texturesToCleanup) {
      gl.deleteTexture(texture);
    }
    console.log(`Cleaned up ${texturesToCleanup.length} textures`);

    console.log('Returning canvas:', this.canvas);
    return this.canvas;
  }

  public dispose() {
    // Delete programs
    for (const program of this.programs.values()) {
      this.gl.deleteProgram(program);
    }
    this.programs.clear();

    // Delete buffers
    if (this.positionBuffer) {
      this.gl.deleteBuffer(this.positionBuffer);
      this.positionBuffer = null;
    }
    if (this.texCoordBuffer) {
      this.gl.deleteBuffer(this.texCoordBuffer);
      this.texCoordBuffer = null;
    }
  }
}
