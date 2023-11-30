import { vec2 } from "./math";

interface MouseProps {
  mouse_force: number;
  cursor_size: number;
  cellScale: {
    x: number;
    y: number;
  };
}

export const mouseState = {
  center: vec2(0, 0),
  force: vec2(0, 0),
};

let previousMouseCoords = vec2(0, 0);
let mouseMoved = false;

export const initMouseEvents = (
  canvas: HTMLCanvasElement | null,
  props: MouseProps
) => {
  if (!canvas) return;

  const onMouseMove = (event: MouseEvent) => {
    const target = event.target as HTMLCanvasElement;
    if (!target) return;

    // Convert mouse position to normalized device coordinates
    const rect = target.getBoundingClientRect();
    const mouseX = (event.clientX / rect.width) * 2 - 1;
    const mouseY = -(event.clientY / rect.height) * 2 + 1;

    // Update mouse state
    mouseState.center = vec2(mouseX, mouseY);
    mouseMoved = true;
    updateMouseState();
  };

  canvas.addEventListener("mousemove", onMouseMove, false);

  const updateMouseState = () => {
    if (!mouseMoved) {
      mouseState.force = vec2(0, 0);
      return;
    }

    // Calculate force
    const forceX =
      ((mouseState.center.x - previousMouseCoords.x) / 2) * props.mouse_force;
    const forceY =
      ((mouseState.center.y - previousMouseCoords.y) / 2) * props.mouse_force;
    mouseState.force = vec2(forceX, forceY);

    // Update previous mouse position
    previousMouseCoords = mouseState.center;

    mouseMoved = false;
  };

  return updateMouseState;
};
