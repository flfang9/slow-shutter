import { EffectType } from '@/types';
import { createWebGLContext, setupQuad, createTexture } from './context';
import { compileShaderProgram } from './program';
import {
  vertexShaderSource,
  lateralMotionShader,
  verticalZoomShader,
  handheldDriftShader,
  filmGrainShader,
  vibranceShader,
  bloomShader,
  contrastCurveShader,
} from './shaders';

export class EffectProcessor {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private programs: Map<string, WebGLProgram> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = createWebGLContext(canvas);
    if (!gl) {
      throw new Error('Failed to initialize WebGL');
    }
    this.gl = gl;
    this.initializePrograms();
  }

  private initializePrograms() {
    const shaderMap: Record<string, string> = {
      'lateral-motion': lateralMotionShader,
      'vertical-zoom': verticalZoomShader,
      'handheld-drift': handheldDriftShader,
      'film-grain': filmGrainShader,
      'vibrance': vibranceShader,
      'bloom': bloomShader,
      'contrast-curve': contrastCurveShader,
    };

    for (const [name, fragmentSource] of Object.entries(shaderMap)) {
      const program = compileShaderProgram(
        this.gl,
        vertexShaderSource,
        fragmentSource
      );
      if (program) {
        this.programs.set(name, program);
      }
    }
  }

  private renderPass(
    program: WebGLProgram,
    inputTexture: WebGLTexture,
    uniforms: Record<string, any> = {}
  ): WebGLTexture {
    const gl = this.gl;

    // Use the program
    gl.useProgram(program);

    // Setup quad geometry
    setupQuad(gl, program);

    // Bind input texture
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

    // Create framebuffer for output
    const framebuffer = gl.createFramebuffer();
    const outputTexture = gl.createTexture();

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

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      outputTexture,
      0
    );

    // Render
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Cleanup
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(framebuffer);

    return outputTexture!;
  }

  public async applyEffect(
    image: HTMLImageElement,
    effect: EffectType,
    intensity: number
  ): Promise<HTMLCanvasElement> {
    const gl = this.gl;

    // Set canvas size to match image
    this.canvas.width = image.width;
    this.canvas.height = image.height;

    // Create initial texture from image
    let currentTexture = createTexture(gl, image);
    if (!currentTexture) {
      throw new Error('Failed to create texture from image');
    }

    const resolution = [image.width, image.height];
    const normalizedIntensity = intensity / 100;

    // Step 1: Apply blur effect
    const effectProgram = this.programs.get(effect);
    if (effectProgram) {
      currentTexture = this.renderPass(effectProgram, currentTexture, {
        u_intensity: normalizedIntensity,
        u_resolution: resolution,
      });
    }

    // Step 2: Post-processing stack
    // Film grain
    const grainProgram = this.programs.get('film-grain');
    if (grainProgram) {
      currentTexture = this.renderPass(grainProgram, currentTexture, {
        u_time: Math.random() * 1000,
        u_resolution: resolution,
      });
    }

    // Vibrance boost
    const vibranceProgram = this.programs.get('vibrance');
    if (vibranceProgram) {
      currentTexture = this.renderPass(vibranceProgram, currentTexture);
    }

    // Light bloom
    const bloomProgram = this.programs.get('bloom');
    if (bloomProgram) {
      currentTexture = this.renderPass(bloomProgram, currentTexture, {
        u_resolution: resolution,
      });
    }

    // Contrast curve
    const contrastProgram = this.programs.get('contrast-curve');
    if (contrastProgram) {
      currentTexture = this.renderPass(contrastProgram, currentTexture);
    }

    // Final render to canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const finalProgram = this.programs.get('contrast-curve');
    if (finalProgram) {
      gl.useProgram(finalProgram);
      setupQuad(gl, finalProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, currentTexture);
      gl.uniform1i(gl.getUniformLocation(finalProgram, 'u_image'), 0);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    return this.canvas;
  }

  public dispose() {
    for (const program of this.programs.values()) {
      this.gl.deleteProgram(program);
    }
    this.programs.clear();
  }
}
