export const loadFile = async (path: string): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", path, true);
    request.onload = () => {
      if (request.status >= 200 && request.status < 400) {
        resolve(request.responseText);
      } else {
        reject(new Error("Failed to load file."));
      }
    };
    request.onerror = () => {
      reject(new Error("Failed to load file."));
    };
    request.send();
  });
};

const createShader = (
  gl: WebGL2RenderingContext | WebGLRenderingContext,
  type: "VERTEX_SHADER" | "FRAGMENT_SHADER",
  source: string
) => {
  if (!gl) {
    throw new Error("No WebGL2 context.");
  }
  const shader = gl.createShader(gl[type]);

  if (!shader) {
    throw new Error("Unable to create a shader.");
  }

  gl.shaderSource(shader, source);

  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(
      `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`
    );
  }

  return shader;
};

export const createProgram = async (
  gl: WebGL2RenderingContext | WebGLRenderingContext,
  vs: string,
  fs: string
) => {
  // Vertex shader
  const vertexShader = createShader(gl, "VERTEX_SHADER", vs);

  // Fragment shader
  const fragmentShader = createShader(gl, "FRAGMENT_SHADER", fs);

  // WebGL program
  const program = gl.createProgram();

  if (!program) {
    throw new Error("Unable to create the program.");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(
      `Unable to link the shaders: ${gl.getProgramInfoLog(program)}`
    );
  }

  return program;
};

export const createFramebuffer = (
  gl: WebGL2RenderingContext | WebGLRenderingContext,
  width: number,
  height: number,
  ext?: any
): { framebuffer: WebGLFramebuffer; texture: WebGLTexture } => {
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const format = gl instanceof WebGL2RenderingContext ? gl.RGBA32F : gl.RGBA;
  const type =
    gl instanceof WebGL2RenderingContext ? gl.FLOAT : ext.HALF_FLOAT_OES;
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    format,
    width,
    height,
    0,
    gl.RGBA,
    type,
    null
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0
  );
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  if (framebuffer === null || texture === null) {
    throw new Error("Unable to create a framebuffer.");
  }

  return { framebuffer: framebuffer, texture: texture };
};

export const deleteFramebuffer = (
  gl: WebGL2RenderingContext | WebGLRenderingContext,
  framebuffer: WebGLFramebuffer | null,
  texture: WebGLTexture | null
) => {
  gl.deleteFramebuffer(framebuffer);
  gl.deleteTexture(texture);
  framebuffer = null;
  texture = null;
};
