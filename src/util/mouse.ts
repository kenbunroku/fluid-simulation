import { vec2 } from "./math";

export const mouseState = {
  center: vec2(0, 0),
  force: vec2(0, 0),
};

let previousMouseX = 0;
let previousMouseY = 0;

export const initMouseEvents = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) return;
  canvas.addEventListener("mousemove", onMouseMove, false);
};

const onMouseMove = (event: MouseEvent) => {
  const target = event.target as HTMLCanvasElement;
  if (!target) return;

  // Convert mouse position to normalized device coordinates
  const rect = target.getBoundingClientRect();
  const mouseX = (event.clientX / rect.width) * 2 - 1;
  const mouseY = (event.clientY / rect.height) * 2 + 1;

  // calculate force based on mouse position
  const forceX = mouseX - previousMouseX;
  const forceY = mouseY - previousMouseY;

  // update previous mouse position
  previousMouseX = mouseX;
  previousMouseY = mouseY;

  const center = vec2(mouseX, mouseY);
  const force = vec2(forceX, forceY);

  console.log("center: ", center, "force: ", force);

  mouseState.center = vec2(mouseX, mouseY);
  mouseState.force = vec2(forceX, forceY);
};
