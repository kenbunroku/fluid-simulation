// create vec2 from x and y
export const vec2 = (x: number, y: number) => ({ x, y });

export const rand = (min: number, max: number) => {
  return min + Math.random() * (max - min);
};

export const lerp = (a: number, b: number, t: number) => {
  return a + (b - a) * t;
};
