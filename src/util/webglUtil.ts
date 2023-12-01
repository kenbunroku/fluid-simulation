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
  gl: WebGL2RenderingContext,
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
  gl: WebGL2RenderingContext,
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
  gl: WebGL2RenderingContext,
  width: number,
  height: number
): { framebuffer: WebGLFramebuffer; texture: WebGLTexture } => {
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
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
  gl: WebGL2RenderingContext,
  framebuffer: WebGLFramebuffer | null,
  texture: WebGLTexture | null
) => {
  gl.deleteFramebuffer(framebuffer);
  gl.deleteTexture(texture);
  framebuffer = null;
  texture = null;
};
