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

export const createTexture = (
  gl: WebGL2RenderingContext,
  width: number,
  height: number
): WebGLTexture => {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Unable to create a texture.");
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    gl.RGBA, // internalFormat
    width, // width
    height, // height
    0, // border
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    null // data
  );
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
};

export const createFramebuffer = (
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  texture: WebGLTexture
) => {
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  const depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
  gl.framebufferRenderbuffer(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.RENDERBUFFER,
    depthBuffer
  );
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0
  );
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return framebuffer;
};

type UniformType =
  | "uniform1f"
  | "uniform2f"
  | "uniform3f"
  | "uniform4f"
  | "uniform1i"
  | "uniform2i"
  | "uniform3i"
  | "uniform4i"
  | "uniform1ui"
  | "uniform2ui"
  | "uniform3ui"
  | "uniform4ui"
  | "uniform1fv"
  | "uniform2fv"
  | "uniform3fv"
  | "uniform4fv"
  | "uniform1iv"
  | "uniform2iv"
  | "uniform3iv"
  | "uniform4iv"
  | "uniform1uiv"
  | "uniform2uiv"
  | "uniform3uiv"
  | "uniform4uiv"
  | "uniformMatrix2fv"
  | "uniformMatrix3fv"
  | "uniformMatrix4fv";

export const setUniform = (
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  uniformName: string,
  type: UniformType,
  ...values: any[]
) => {
  const location = gl.getUniformLocation(program, uniformName);
  if (location === null) {
    console.warn(`Uniform '${uniformName}' not found.`);
    return;
  }

  switch (type) {
    case "uniform1f":
    case "uniform1i":
    case "uniform1ui":
      gl[type](location, values[0]);
      break;

    case "uniform2f":
    case "uniform2i":
    case "uniform2ui":
      gl[type](location, values[0], values[1]);
      break;

    case "uniform1fv":
    case "uniform1iv":
    case "uniform1uiv":
      if (values.length === 1) {
        gl[type](location, values[0]);
      } else if (values.length === 2) {
        gl[type](location, values[0], values[1]);
      } else if (values.length === 3) {
        gl[type](location, values[0], values[1], values[2]);
      }
      break;

    case "uniformMatrix2fv":
    case "uniformMatrix3fv":
    case "uniformMatrix4fv":
      gl[type](location, false, values[0]); // Assuming matrices are not transposed
      break;

    default:
      console.warn(`Unknown uniform type: '${type}'`);
  }
};
