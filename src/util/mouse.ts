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

export const initMouseEvents = (
  canvas: HTMLCanvasElement | null,
  props: MouseProps
) => {
  if (!canvas) return;

  const resetMouseState = () => {
    mouseState.force = vec2(0, 0);
  };

  let timeoutId = setTimeout(resetMouseState, 100);

  const onMouseMove = (event: MouseEvent | TouchEvent) => {
    clearTimeout(timeoutId);
    const target = event.target as HTMLCanvasElement;
    if (!target) return;

    let mouseX, mouseY;
    // Check if event is a touch event
    if (event instanceof TouchEvent) {
      const touch = event.touches[0] || event.changedTouches[0];
      if (!touch) return;
      mouseX = touch.clientX;
      mouseY = touch.clientY;
    } else {
      mouseX = event.clientX;
      mouseY = event.clientY;
    }

    // Convert mouse position to normalized device coordinates
    const rect = target.getBoundingClientRect();
    mouseX = (mouseX / rect.width) * 2 - 1;
    mouseY = -(mouseY / rect.height) * 2 + 1;

    const cursorSizeX = props.cursor_size * props.cellScale.x;
    const cursorSizeY = props.cursor_size * props.cellScale.y;

    const centerX = Math.min(
      Math.max(mouseX, -1 + cursorSizeX + props.cellScale.x * 2),
      1 - cursorSizeX - props.cellScale.x * 2
    );
    const centerY = Math.min(
      Math.max(mouseY, -1 + cursorSizeY + props.cellScale.y * 2),
      1 - cursorSizeY - props.cellScale.y * 2
    );

    // Update mouse state
    mouseState.center = vec2(centerX, centerY);

    // Calculate force
    const forceX =
      ((mouseState.center.x - previousMouseCoords.x) / 2) * props.mouse_force;

    const forceY =
      ((mouseState.center.y - previousMouseCoords.y) / 2) * props.mouse_force;
    mouseState.force = vec2(forceX, forceY);

    // Update previous mouse position
    previousMouseCoords = mouseState.center;

    timeoutId = setTimeout(resetMouseState, 100);
  };

  canvas.addEventListener("mousemove", onMouseMove, false);
  // create touch events
  canvas.addEventListener(
    "touchmove",
    (event) => {
      event.preventDefault();
      onMouseMove(event);
    },
    false
  );
};
