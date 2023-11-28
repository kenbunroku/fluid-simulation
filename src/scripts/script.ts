const resolution = 0.25;
let canvas: HTMLCanvasElement | null = null;
let width = 0;
let height = 0;
let gl: WebGL2RenderingContext | null = null;
let program: WebGLProgram | null = null;
let vao = null;

const init = () => {
  // Find the canvas element
  canvas = document.querySelector("#canvas");

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("No html canvas element.");
  }

  width = Math.floor(window.innerWidth * resolution);
  height = Math.floor(window.innerHeight * resolution);

  // WebGL rendering context
  gl = canvas.getContext("webgl2");

  if (!gl) {
    throw new Error("Unable to initialize WebGL2.");
  }
};

// A user-defined function to create and compile shaders
const initShader = (
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

const initProgram = () => {
  if (!gl) {
    throw new Error("No WebGL2 context.");
  }

  // Vertex shader
  const vertexShader = initShader(
    "VERTEX_SHADER",
    `
    attribute vec4 a_position;

    void main() {
      gl_Position = a_position;
    }
  `
  );

  // Fragment shader
  const fragmentShader = initShader(
    "FRAGMENT_SHADER",
    `
    void main() {
      gl_FragColor = vec4(0, 0, 0, 1);
    }
  `
  );

  // WebGL program
  program = gl.createProgram();

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

  gl.useProgram(program);
};

const setup = () => {
  // Clear color
  if (!gl) {
    throw new Error("No WebGL2 context.");
  }
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  initProgram();
  initBuffer();
};

const initBuffer = () => {
  if (!gl) {
    throw new Error("No WebGL2 context.");
  }

  // Vertext buffer
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const positions = [0, 1, 0.866, -0.5, -0.866, -0.5];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  if (!program) {
    throw new Error("No program found.");
  }

  const index = gl.getAttribLocation(program, "a_position");
  const size = 2;
  const type = gl.FLOAT;
  const normalized = false;
  const stride = 0;
  const offset = 0;
  gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
  gl.enableVertexAttribArray(index);
};

const run = () => {
  // Find the canvas element
  init();
  setup();

  if (!gl) {
    throw new Error("No WebGL2 context.");
  }

  // Draw the scene
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};

window.onload = run;
