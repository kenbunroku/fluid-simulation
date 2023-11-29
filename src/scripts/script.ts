import { vec2 } from "../util/math";
import {
  loadFile,
  createProgram,
  createTexture,
  createFramebuffer,
  setUniform,
} from "../util/webglUtil";

let canvas: HTMLCanvasElement | null = null;
const resolution = 0.25;
let width: number = 0;
let height: number = 0;
let gl: WebGL2RenderingContext | null = null;
let cellScale = vec2(0, 0);
let fboSize = vec2(0, 0);

const programs: { [key: string]: WebGLProgram | null } = {
  advection: null,
  viscousity: null,
  divergence: null,
  poisson: null,
  pressure: null,
  draw: null,
};

const textures: { [key: string]: WebGLTexture | null } = {
  vel_0: null,
  vel_1: null,
  vel_viscous0: null,
  vel_viscous1: null,
  div: null,
  pressure_0: null,
  pressure_1: null,
};

const fbos: { [key: string]: WebGLFramebuffer | null } = {
  vel_0: null,
  vel_1: null,
  vel_viscous0: null,
  vel_viscous1: null,
  div: null,
  pressure_0: null,
  pressure_1: null,
};

const options: { [key: string]: number | boolean } = {
  iterations_poisson: 32,
  iterations_viscous: 32,
  mouse_force: 20,
  resolution: 0.5,
  cursor_size: 100,
  viscous: 30,
  isBounce: false,
  dt: 0.014,
  isViscous: false,
  BFECC: true,
};

let quadVao: WebGLVertexArrayObject | null = null;

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
  canvas.width = width;
  canvas.height = height;

  fboSize = vec2(width, height);
  cellScale = vec2(1 / width, 1 / height);
};

const resize = () => {
  if (!canvas) {
    throw new Error("No canvas element.");
  }

  width = Math.floor(window.innerWidth * resolution);
  height = Math.floor(window.innerHeight * resolution);

  canvas.width = width;
  canvas.height = height;

  fboSize = vec2(width, height);
  cellScale = vec2(1 / width, 1 / height);
};

const load = async () => {
  if (!gl) {
    throw new Error("No WebGL2 context.");
  }

  // Load shaders
  const vs = await loadFile("/shaders/main.vert");
  const fs = await loadFile("/shaders/main.frag");
  const lineVs = await loadFile("/shaders/line.vert");
  const advecFs = await loadFile("/shaders/advection.frag");
  const externalForcesFs = await loadFile("/shaders/externalForce.frag");
  const viscousityFs = await loadFile("/shaders/viscous.frag");
  const divergenceFs = await loadFile("/shaders/divergence.frag");
  const pressureFs = await loadFile("/shaders/pressure.frag");
  const mouseVs = await loadFile("/shaders/mouse.vert");
  const poissonFs = await loadFile("/shaders/poisson.frag");

  // Create program and fbos for velocity advection
  programs.advection = await createProgram(gl, vs, advecFs);
  textures.vel_0 = createTexture(gl, width, height);
  textures.vel_1 = createTexture(gl, width, height);
  fbos.vel_0 = createFramebuffer(gl, width, height, textures.vel_0);
  fbos.vel_1 = createFramebuffer(gl, width, height, textures.vel_1);

  // Create program and fbos for external forces
  programs.externalForces = await createProgram(gl, mouseVs, externalForcesFs);

  // Create program and fbos for viscoustiy
  programs.viscousity = await createProgram(gl, vs, viscousityFs);
  textures.vel_viscous0 = createTexture(gl, width, height);
  textures.vel_viscous1 = createTexture(gl, width, height);
  fbos.vel_viscous0 = createFramebuffer(
    gl,
    width,
    height,
    textures.vel_viscous0
  );
  fbos.vel_viscous1 = createFramebuffer(
    gl,
    width,
    height,
    textures.vel_viscous1
  );

  // Create program and fbo for divergence
  programs.divergence = await createProgram(gl, vs, divergenceFs);
  textures.div = createTexture(gl, width, height);
  fbos.div = createFramebuffer(gl, width, height, textures.div);

  // Create program and fbo for poisson
  programs.poisson = await createProgram(gl, vs, poissonFs);

  // Create program and fbo for pressure
  programs.pressure = await createProgram(gl, vs, pressureFs);
  textures.pressure_0 = createTexture(gl, width, height);
  textures.pressure_1 = createTexture(gl, width, height);
  fbos.pressure_0 = createFramebuffer(gl, width, height, textures.pressure_0);
  fbos.pressure_1 = createFramebuffer(gl, width, height, textures.pressure_1);

  // Create program for drawing
  programs.draw = await createProgram(gl, vs, fs);
};

const setupVAO = () => {
  if (!gl) {
    throw new Error("No WebGL2 context.");
  }

  const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

  // Create a vertex array object
  quadVao = gl.createVertexArray();

  // Bind the vertex array object to the context
  gl.bindVertexArray(quadVao);

  // Create a buffer
  const buffer = gl.createBuffer();

  // Bind the buffer to the context
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  // Fill the buffer with the vertex array
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Get the location of the position attribute
  const positionAttributeLocation = gl.getAttribLocation(
    programs.draw!,
    "position"
  );

  // Enable the position attribute
  gl.enableVertexAttribArray(positionAttributeLocation);

  // Tell the position attribute how to get data out of the position buffer
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  // Clean
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
};

const setup = () => {
  if (!gl) {
    throw new Error("No WebGL2 context.");
  }
  gl.clearColor(0, 0, 0, 0);

  setupVAO();
};

const draw = () => {
  if (!gl) {
    throw new Error("No WebGL2 context.");
  }

  requestAnimationFrame(draw);

  // clear color and viewport
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0, 0, width, height);

  gl.bindVertexArray(quadVao);
  // gl.bindFramebuffer(gl.FRAMEBUFFER, fbos.vel_0);
  // gl.useProgram(programs.externalForces);
  // setUniform(gl, programs.externalForces!, "px", "uniform2f", cellScale);
  // setUniform(gl, programs.externalForces!, "force", "uniform2f", vec2(0, 0));
  // setUniform(gl, programs.externalForces!, "center", "uniform2f", vec2(0, 0));
  // setUniform(
  //   gl,
  //   programs.externalForces!,
  //   "scale",
  //   "uniform2f",
  //   vec2(options.cursor_size as number, options.cursor_size as number)
  // );
  // gl.drawArrays(gl.TRIANGLES, 0, 4);

  // gl.bindVertexArray(quadVao);

  // Advection
  gl.useProgram(programs.advection);
  // setUniform(gl, programs.advection!, "px", "uniform2f", cellScale);
  setUniform(gl, programs.advection!, "fboSize", "uniform2f", fboSize);
  setUniform(gl, programs.advection!, "velocity", "uniform1i", fbos.vel_0);
  setUniform(gl, programs.advection!, "dt", "uniform1f", options.dt);
  gl.drawArrays(gl.TRIANGLES, 0, 4);

  // Viscousity
  gl.useProgram(programs.viscousity);
  setUniform(gl, programs.viscousity!, "px", "uniform2f", cellScale);
  setUniform(gl, programs.viscousity!, "v", "uniform1f", options.viscous);
  setUniform(gl, programs.viscousity!, "velocity", "uniform1i", fbos.vel_1);
  setUniform(
    gl,
    programs.viscousity!,
    "velocity_new",
    "uniform1i",
    fbos.vel_viscous0
  );
  setUniform(gl, programs.viscousity!, "dt", "uniform1f", options.dt);
  gl.drawArrays(gl.TRIANGLES, 0, 4);

  // Divergence
  gl.useProgram(programs.divergence);
  setUniform(gl, programs.divergence!, "px", "uniform2f", cellScale);
  setUniform(
    gl,
    programs.divergence!,
    "velocity",
    "uniform1i",
    fbos.vel_viscous0
  );
  setUniform(gl, programs.divergence!, "dt", "uniform1f", options.dt);
  gl.drawArrays(gl.TRIANGLES, 0, 4);

  // Pressure
  gl.useProgram(programs.pressure);
  setUniform(gl, programs.pressure!, "px", "uniform2f", cellScale);
  setUniform(gl, programs.pressure!, "pressure", "uniform1i", fbos.pressure_0);
  setUniform(
    gl,
    programs.pressure!,
    "velocity",
    "uniform1i",
    fbos.vel_viscous0
  );
  setUniform(gl, programs.pressure!, "dt", "uniform1f", options.dt);

  [fbos.vel_0, fbos.vel_1] = [fbos.vel_1, fbos.vel_0];
  gl.drawArrays(gl.TRIANGLES, 0, 4);

  // Draw
  gl.useProgram(programs.draw);
  setUniform(gl, programs.draw!, "velocity", "uniform1i", fbos.vel_0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Clean
  gl.bindVertexArray(null);
};

const run = async () => {
  init();
  await load();
  setup();
  draw();
};

window.onload = run;
window.onresize = resize;
