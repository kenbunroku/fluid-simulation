import { vec2 } from "../util/math";
import { initMouseEvents, mouseState } from "../util/mouse";
import {
  loadFile,
  createProgram,
  createFramebuffer,
  deleteFramebuffer,
} from "../util/webglUtil";
import { Pane } from "tweakpane";
import { FramebufferObject, Options } from "./types";

let canvas: HTMLCanvasElement | null = null;
let width: number = 0;
let height: number = 0;
let gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
let cellScale = vec2(0, 0);
let fboSize = vec2(0, 0);
let boundarySpace = vec2(0, 0);

const programs: { [key: string]: WebGLProgram | null } = {
  advection: null,
  viscosity: null,
  divergence: null,
  poisson: null,
  pressure: null,
  draw: null,
};
let quadVao: WebGLVertexArrayObject | null = null;
let vertexBuffer: WebGLBuffer | null = null;
let uvBuffer: WebGLBuffer | null = null;

const fbos: { [key: string]: FramebufferObject | null } = {
  vel_0: null,
  vel_1: null,
  vel_viscous0: null,
  vel_viscous1: null,
  div: null,
  pressure_0: null,
  pressure_1: null,
};

const options: Options = {
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

const mouseProps = {
  mouse_force: options.mouse_force,
  cursor_size: options.cursor_size,
  cellScale,
};

let ext: any = null;

const init = () => {
  // Find the canvas element
  canvas = document.querySelector("#canvas");

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("No html canvas element.");
  }

  width = window.innerWidth;
  height = window.innerHeight;

  // WebGL rendering context
  const param = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  };
  gl = canvas.getContext("webgl2", param) as WebGL2RenderingContext | null;
  canvas.width = width;
  canvas.height = height;
  const isWebGL2 = !!gl;

  if (!isWebGL2) {
    gl = (canvas.getContext("webgl", param) ||
      canvas.getContext(
        "experimental-webgl",
        param
      )) as WebGLRenderingContext | null;
  }
  if (!gl) {
    throw new Error("No WebGL2 context.");
  }

  ext = {
    colorBufferFloat: gl.getExtension("EXT_color_buffer_float"),
    floatTexture: gl.getExtension("OES_texture_float_linear"),
  };

  fboSize = vec2(
    Math.floor(window.innerWidth * options.resolution),
    Math.floor(window.innerHeight * options.resolution)
  );
  cellScale = vec2(1 / width, 1 / height);
  mouseProps.cellScale = cellScale;

  if (!ext) {
    throw new Error("Unable to get the extension.");
  }

  // Set up tweakpane
  const pane = new Pane();
  pane
    .addBinding(options, "iterations_poisson", {
      min: 1,
      max: 100,
      step: 1,
    })
    .on("change", (event) => {
      options.iterations_poisson = event.value;
    });
  pane
    .addBinding(options, "iterations_viscous", {
      min: 1,
      max: 100,
      step: 1,
    })
    .on("change", (event) => {
      options.iterations_viscous = event.value;
    });
  pane
    .addBinding(options, "mouse_force", {
      min: 1,
      max: 100,
      step: 1,
    })
    .on("change", (event) => {
      options.mouse_force = event.value;
    });
  pane
    .addBinding(options, "resolution", {
      min: 0.1,
      max: 1,
      step: 0.1,
    })
    .on("change", (event) => {
      options.resolution = event.value;
    });
  pane
    .addBinding(options, "cursor_size", {
      min: 1,
      max: 100,
      step: 1,
    })
    .on("change", (event) => {
      options.cursor_size = event.value;
    });
  pane
    .addBinding(options, "viscous", {
      min: 1,
      max: 100,
      step: 1,
    })
    .on("change", (event) => {
      options.viscous = event.value;
    });
  pane.addBinding(options, "isBounce").on("change", (event) => {
    options.isBounce = event.value;
  });
  pane
    .addBinding(options, "dt", {
      min: 0.001,
      max: 0.1,
      step: 0.001,
    })
    .on("change", (event) => {
      options.dt = event.value;
    });
  pane.addBinding(options, "isViscous").on("change", (event) => {
    options.isViscous = event.value;
  });
  pane.addBinding(options, "BFECC").on("change", (event) => {
    options.BFECC = event.value;
  });
};

const resize = () => {
  if (!canvas) {
    throw new Error("No canvas element.");
  }

  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;

  fboSize = vec2(
    Math.floor(window.innerWidth * options.resolution),
    Math.floor(window.innerHeight * options.resolution)
  );
  cellScale = vec2(1 / width, 1 / height);
  mouseProps.cellScale = cellScale;

  // recreate the frame buffers
  Object.keys(fbos).forEach((key) => {
    const fbo = fbos[key];
    if (fbo !== null && gl !== null) {
      deleteFramebuffer(gl, fbo.framebuffer, fbo.texture);
      fbos[key] = createFramebuffer(gl, width, height);
    }
  });
};

const load = async () => {
  if (!gl) {
    throw new Error("No WebGL2 context.");
  }

  // Load shaders
  const vs = await loadFile("/fluid-simulation/shaders/face.vert");
  const fs = await loadFile("/fluid-simulation/shaders/color.frag");
  const advectionFs = await loadFile(
    "/fluid-simulation/shaders/advection.frag"
  );
  const mouseVs = await loadFile("/fluid-simulation/shaders/mouse.vert");
  const externalForcesFs = await loadFile(
    "/fluid-simulation/shaders/externalForce.frag"
  );
  const divergenceFs = await loadFile(
    "/fluid-simulation/shaders/divergence.frag"
  );
  const viscousFs = await loadFile("/fluid-simulation/shaders/viscous.frag");
  const pressureFs = await loadFile("/fluid-simulation/shaders/pressure.frag");
  const poissonFs = await loadFile("/fluid-simulation/shaders/poisson.frag");

  // Create program and fbos for velocity advection
  programs.advection = await createProgram(gl, vs, advectionFs);
  fbos.vel_0 = createFramebuffer(gl, width, height);
  fbos.vel_1 = createFramebuffer(gl, width, height);

  // Create program and fbos for external forces
  programs.externalForces = await createProgram(gl, mouseVs, externalForcesFs);

  // Create program and fbos for viscosity
  programs.viscosity = await createProgram(gl, vs, viscousFs);
  fbos.vel_viscous0 = createFramebuffer(gl, width, height);
  fbos.vel_viscous1 = createFramebuffer(gl, width, height);

  // Create program and fbo for divergence
  programs.divergence = await createProgram(gl, vs, divergenceFs);
  fbos.div = createFramebuffer(gl, width, height);

  // Create program and fbo for poisson
  programs.poisson = await createProgram(gl, vs, poissonFs);

  // Create program and fbo for pressure
  programs.pressure = await createProgram(gl, vs, pressureFs);
  fbos.pressure_0 = createFramebuffer(gl, width, height);
  fbos.pressure_1 = createFramebuffer(gl, width, height);

  // Create program for drawing
  programs.draw = await createProgram(gl, vs, fs);
};

const setupVAO = (gl: WebGL2RenderingContext) => {
  const vertices = new Float32Array([
    -1.0, -1.0, 0.0, 1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 1.0, 1.0, 0.0,
  ]);
  const uvs = new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0]);

  // Create a vertex array object
  quadVao = gl.createVertexArray();

  // Bind the vertex array object to the context
  gl.bindVertexArray(quadVao);

  // Create and bind a buffer for vertices
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  // Create and bind a buffer for UVs
  const uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

  // Clean
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
};

const setupVBO = (gl: WebGLRenderingContext) => {
  const vertices = new Float32Array([
    -1.0, -1.0, 0.0, 1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 1.0, 1.0, 0.0,
  ]);
  const uvs = new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0]);

  // Create and bind a buffer for vertices
  vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  // Create and bind a buffer for UVs
  uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
};

const setup = (gl: WebGL2RenderingContext | WebGLRenderingContext) => {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  if (gl instanceof WebGL2RenderingContext) {
    setupVAO(gl);
  } else {
    setupVBO(gl);
  }
};

const draw = () => {
  if (!gl) {
    throw new Error("No WebGL2 context.");
  }
  if (!canvas) {
    throw new Error("No canvas element.");
  }
  if (
    !fbos.vel_0 ||
    !fbos.vel_1 ||
    !fbos.div ||
    !fbos.vel_viscous0 ||
    !fbos.vel_viscous1 ||
    !fbos.pressure_0 ||
    !fbos.pressure_1
  ) {
    throw new Error("Framebuffer is null.");
  }
  if (options.isBounce) {
    boundarySpace = vec2(0, 0);
  } else {
    boundarySpace = vec2(cellScale.x, cellScale.y);
  }

  requestAnimationFrame(draw);

  // clear color and viewport
  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Bind VAO
  if (gl instanceof WebGL2RenderingContext) {
    gl.bindVertexArray(quadVao);
  } else {
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
  }

  // Advection
  // Read from vel_0 and Write to vel_1
  gl.useProgram(programs.advection);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, fbos.vel_0.texture);
  const velUniLoc = gl.getUniformLocation(programs.advection!, "velocity");
  gl.uniform1i(velUniLoc, 0);
  const boundarySpaceUniLoc = gl.getUniformLocation(
    programs.advection!,
    "boundarySpace"
  );
  gl.uniform2f(boundarySpaceUniLoc, boundarySpace.x, boundarySpace.y);
  const fboSizeUniLoc = gl.getUniformLocation(programs.advection!, "fboSize");
  gl.uniform2f(fboSizeUniLoc, fboSize.x, fboSize.y);
  const dtUniLoc = gl.getUniformLocation(programs.advection!, "dt");
  gl.uniform1f(dtUniLoc, options.dt);
  const BFECCUniLoc = gl.getUniformLocation(programs.advection!, "isBFECC");
  gl.uniform1i(BFECCUniLoc, options.BFECC ? 1 : 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbos.vel_1.framebuffer);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Add external forces from mouse movement
  // Write to vel_1
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.useProgram(programs.externalForces);
  const pxUniLoc = gl.getUniformLocation(programs.externalForces!, "px");
  gl.uniform2f(pxUniLoc, cellScale.x, cellScale.y);
  const forceUniLoc = gl.getUniformLocation(programs.externalForces!, "force");
  gl.uniform2f(forceUniLoc, mouseState.force.x, mouseState.force.y);
  const centerUniLoc = gl.getUniformLocation(
    programs.externalForces!,
    "center"
  );
  gl.uniform2f(centerUniLoc, mouseState.center.x, mouseState.center.y);
  const scaleUniLoc = gl.getUniformLocation(programs.externalForces!, "scale");
  gl.uniform2f(scaleUniLoc, options.cursor_size, options.cursor_size);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.disable(gl.BLEND);

  // Viscous
  // Read from vel_1 and vel_viscous0 and Write to vel_viscous1
  if (options.isViscous) {
    gl.useProgram(programs.viscosity);

    for (let i = 0; i < options.iterations_viscous; i++) {
      // Swap the viscous buffers
      let viscousSrc = i % 2 === 0 ? fbos.vel_viscous0 : fbos.vel_viscous1;
      let viscousDst = i % 2 === 0 ? fbos.vel_viscous1 : fbos.vel_viscous0;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fbos.vel_1.texture);
      const velUniLoc = gl.getUniformLocation(programs.viscosity!, "velocity");
      gl.uniform1i(velUniLoc, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, viscousSrc.texture);
      const velUniLoc2 = gl.getUniformLocation(
        programs.viscosity!,
        "velocity_new"
      );
      gl.uniform1i(velUniLoc2, 1);
      const pxUniLoc3 = gl.getUniformLocation(programs.viscosity!, "px");
      gl.uniform2f(pxUniLoc3, cellScale.x, cellScale.y);
      const viscousUniLoc = gl.getUniformLocation(programs.viscosity!, "v");
      gl.uniform1f(viscousUniLoc, options.viscous);
      const dtUniLoc = gl.getUniformLocation(programs.viscosity!, "dt");
      gl.uniform1f(dtUniLoc, options.dt);
      const boundarySpace2 = gl.getUniformLocation(
        programs.viscosity!,
        "boundarySpace"
      );
      gl.uniform2f(boundarySpace2, boundarySpace.x, boundarySpace.y);
      gl.bindFramebuffer(gl.FRAMEBUFFER, viscousDst.framebuffer);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  // Divergence
  // Read from vel_viscous0 or vel_1 and Write to div
  gl.useProgram(programs.divergence);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(
    gl.TEXTURE_2D,
    options.isViscous ? fbos.vel_viscous0.texture : fbos.vel_1.texture
  );
  const velocityUniLoc = gl.getUniformLocation(
    programs.divergence!,
    "velocity"
  );
  gl.uniform1i(velocityUniLoc, 0);
  const pxUniLoc2 = gl.getUniformLocation(programs.divergence!, "px");
  gl.uniform2f(pxUniLoc2, cellScale.x, cellScale.y);
  const dtUniLoc2 = gl.getUniformLocation(programs.divergence!, "dt");
  gl.uniform1f(dtUniLoc2, options.dt);
  const boundarySpace3 = gl.getUniformLocation(
    programs.divergence!,
    "boundarySpace"
  );
  gl.uniform2f(boundarySpace3, boundarySpace.x, boundarySpace.y);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbos.div.framebuffer);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Poisson
  // Read from div and Write to pressure_1
  gl.useProgram(programs.poisson);
  for (let i = 0; i < options.iterations_poisson; i++) {
    // Swap the pressure buffers
    let pressureSrc = i % 2 === 0 ? fbos.pressure_0 : fbos.pressure_1;
    let pressureDst = i % 2 === 0 ? fbos.pressure_1 : fbos.pressure_0;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fbos.div.texture);
    const divergenceUniLoc = gl.getUniformLocation(
      programs.poisson!,
      "divergence"
    );
    gl.uniform1i(divergenceUniLoc, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, pressureSrc.texture);
    const pressureUniLoc = gl.getUniformLocation(programs.poisson!, "pressure");
    gl.uniform1i(pressureUniLoc, 1);
    const pxUniLoc3 = gl.getUniformLocation(programs.poisson!, "px");
    gl.uniform2f(pxUniLoc3, cellScale.x, cellScale.y);
    const boundarySpace4 = gl.getUniformLocation(
      programs.poisson!,
      "boundarySpace"
    );
    gl.uniform2f(boundarySpace4, boundarySpace.x, boundarySpace.y);
    gl.bindFramebuffer(gl.FRAMEBUFFER, pressureDst.framebuffer);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // Pressure
  // Read from vel_1 and pressure_1 and Write to pressure_0
  gl.useProgram(programs.pressure);
  const pxUniLoc4 = gl.getUniformLocation(programs.pressure!, "px");
  gl.uniform2f(pxUniLoc4, cellScale.x, cellScale.y);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, fbos.vel_1.texture);
  const velocityUniLoc2 = gl.getUniformLocation(programs.pressure!, "velocity");
  gl.uniform1i(velocityUniLoc2, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, fbos.pressure_1.texture);
  const pressureUniLoc2 = gl.getUniformLocation(programs.pressure!, "pressure");
  gl.uniform1i(pressureUniLoc2, 1);
  const dtUniLoc3 = gl.getUniformLocation(programs.pressure!, "dt");
  gl.uniform1f(dtUniLoc3, options.dt);
  const boundarySpace5 = gl.getUniformLocation(
    programs.pressure!,
    "boundarySpace"
  );
  gl.uniform2f(boundarySpace5, cellScale.x, cellScale.y);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbos.vel_0.framebuffer);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // go back to the default framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // Draw the final result
  // Read from vel_0 for the first iteration
  gl.useProgram(programs.draw);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, fbos.vel_0.texture);
  const velocityUniLoc3 = gl.getUniformLocation(programs.draw!, "velocity");
  gl.uniform1i(velocityUniLoc3, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Clean
  if (gl instanceof WebGL2RenderingContext) {
    gl.bindVertexArray(null);
  } else {
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
};

const run = async () => {
  init();
  await load();
  if (!gl) {
    throw new Error("No WebGL2 context.");
  }
  setup(gl);
  initMouseEvents(canvas, mouseProps);
  draw();
};

window.onload = run;
window.onresize = resize;
