export function createWebGLContext(
  canvas: HTMLCanvasElement
): WebGLRenderingContext | null {
  const gl = canvas.getContext('webgl', {
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });

  if (!gl) {
    console.error('WebGL not supported');
    return null;
  }

  return gl;
}

export function setupQuad(gl: WebGLRenderingContext, program: WebGLProgram) {
  // Create a quad that covers the entire canvas
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
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  // Texture coordinate buffer
  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

  const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
}

export function createTexture(
  gl: WebGLRenderingContext,
  image: HTMLImageElement | HTMLCanvasElement
): WebGLTexture | null {
  const texture = gl.createTexture();
  if (!texture) return null;

  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Upload image to texture
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  return texture;
}
