// Keyboard and pointer input: one-shot presses queue bit flags (taken once by
// the loop), held controls (blast, boost) stay live and are read every frame,
// and the pointer position is always tracked for mouse-follow steering.
export const WORLD_PER_PX = 0.055; // 1280x800 -> world plane: screen centre (640,400) maps to world (0,0).
export const ACTION_CONFIRM = 1; // Enter / Space tap
export const ACTION_PAUSE = 2; // P / Escape
export const ACTION_BLAST = 4; // Space held or mouse button 0 held (a held action)
export const ACTION_BOOST = 8; // Shift held (a held action)
export const ACTION_RETARDANT = 16; // Q tap
export const ACTION_MUTE = 32; // M tap
export const ACTION_SPEED = 64; // F tap
export const ACTION_RESTART = 128; // R tap
export const ACTION_DIFFICULTY_1 = 256; // Digit1
export const ACTION_DIFFICULTY_2 = 512; // Digit2
export const ACTION_DIFFICULTY_3 = 1024; // Digit3
export const ACTION_CLICK = 2048; // pointer released over the canvas

export function createInput(canvas) {
  let bits = 0;
  let blastKey = false; // Space held
  let boostKey = false; // Shift held
  let pointerHeld = false; // mouse button 0 held
  let pointer = { x: 640, y: 400 };
  let click = null;
  let keys = { up: false, down: false, left: false, right: false };

  // Fit-scale: map a client pointer onto the fixed 1280x800 logical grid, the
  // same letterbox math the renderer uses so steering and clicks line up.
  function locate(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 800);
    pointer = {
      x: (event.clientX - rect.left - (rect.width - 1280 * scale) / 2) / scale,
      y: (event.clientY - rect.top - (rect.height - 800 * scale) / 2) / scale,
    };
    return pointer;
  }

  window.addEventListener('keydown', (event) => {
    const code = event.code;
    if (code === 'Space') {
      blastKey = true;
      if (!event.repeat) bits |= ACTION_CONFIRM;
    } else if (code === 'KeyW' || code === 'ArrowUp') keys.up = true;
    else if (code === 'KeyS' || code === 'ArrowDown') keys.down = true;
    else if (code === 'KeyA' || code === 'ArrowLeft') keys.left = true;
    else if (code === 'KeyD' || code === 'ArrowRight') keys.right = true;
    else if (code === 'Enter') { if (!event.repeat) bits |= ACTION_CONFIRM; }
    else if (code === 'KeyP' || code === 'Escape') { if (!event.repeat) bits |= ACTION_PAUSE; }
    else if (code === 'ShiftLeft' || code === 'ShiftRight') boostKey = true;
    else if (code === 'KeyQ') { if (!event.repeat) bits |= ACTION_RETARDANT; }
    else if (code === 'KeyM') { if (!event.repeat) bits |= ACTION_MUTE; }
    else if (code === 'KeyF') { if (!event.repeat) bits |= ACTION_SPEED; }
    else if (code === 'KeyR') { if (!event.repeat) bits |= ACTION_RESTART; }
    else if (code === 'Digit1') bits |= ACTION_DIFFICULTY_1;
    else if (code === 'Digit2') bits |= ACTION_DIFFICULTY_2;
    else if (code === 'Digit3') bits |= ACTION_DIFFICULTY_3;
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') blastKey = false;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') boostKey = false;
    else if (event.code === 'KeyW' || event.code === 'ArrowUp') keys.up = false;
    else if (event.code === 'KeyS' || event.code === 'ArrowDown') keys.down = false;
    else if (event.code === 'KeyA' || event.code === 'ArrowLeft') keys.left = false;
    else if (event.code === 'KeyD' || event.code === 'ArrowRight') keys.right = false;
  });
  window.addEventListener('blur', () => {
    blastKey = false; boostKey = false; pointerHeld = false;
    keys.up = keys.down = keys.left = keys.right = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    locate(event);
    if (event.button === 0) {
      pointerHeld = true;
      if (!event.repeat) bits |= ACTION_BLAST;
    }
    event.preventDefault();
  });
  canvas.addEventListener('pointerup', (event) => {
    locate(event);
    if (event.button === 0) {
      pointerHeld = false;
      click = { x: pointer.x, y: pointer.y };
      bits |= ACTION_CLICK;
    }
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', (event) => {
    locate(event);
    event.preventDefault();
  });
  canvas.addEventListener('pointercancel', () => {
    pointerHeld = false;
    blastKey = false;
  });

  return {
    takeActions() {
      const actions = { bits, click };
      bits = 0; click = null;
      return actions;
    },
    isBlasting() { return blastKey || pointerHeld; },
    isBoosting() { return boostKey; },
    keys,
    pointer() { return { x: pointer.x, y: pointer.y }; },
    worldTarget() {
      return { mx: (pointer.x - 640) * WORLD_PER_PX, mz: (pointer.y - 400) * WORLD_PER_PX };
    },
  };
}