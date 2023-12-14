export interface FramebufferObject {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
}

export interface Options {
  iterations_poisson: number;
  iterations_viscous: number;
  mouse_force: number;
  resolution: number;
  cursor_size: number;
  viscous: number;
  isBounce: boolean;
  dt: number;
  isViscous: boolean;
  BFECC: boolean;
}

export type Position = number[];

export interface Vec2 {
  x: number;
  y: number;
}

export interface HandPointData {
  annotation: string;
  currentPosition: Position;
  previousPosition: Position;
  force: Position;
}
