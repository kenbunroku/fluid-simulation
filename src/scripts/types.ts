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

export type Agent = {
  id: string;
  active: boolean;
  pos: { x: number; y: number }; // ピクセル座標
  prev: { x: number; y: number }; // ひとつ前のピクセル座標
  // vel: { x: number; y: number }; // ピクセル/秒
  // target: { x: number; y: number }; // 次の目標地点（ピクセル座標）
  keys: { t: number; x: number; y: number }[];
};

type TrajSample = { x: number; y: number };
type TrajInterval = { start: number; end: number; samples: TrajSample[] };
type Trajectory = { person_id: string; intervals: TrajInterval[] };
export type TrajectoryCollection = {
  type: "trajectory_collection";
  place: number;
  real_time: { t0: string; dt: number; duration: number };
  anim_time: { t0: number; dt: number; duration: number };
  trajectories: Trajectory[];
};
