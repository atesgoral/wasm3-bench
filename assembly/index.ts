memory.grow(1);

const COLS: i32 = 16;
const ROWS: i32 = 16;

const OFF: u8 = 0;
const LIGHT_GRAY: u8 = 1;
const DARK_GRAY: u8 = 2;
const ON: u8 = 3;

const ASPECT_RATIO: f32 = 13 / 19.25;

function set(index: i32, color: u8): void {
  store<u8>(index, color);
}

function setXY(x: i32, y: i32, color: u8): void {
  store<u8>(x + y * COLS, color);
}

function clamp_f32(x: f32, min: f32, max: f32): f32 {
  return Mathf.max(min, Mathf.min(max, x));
}

function smoothstep_f32(edge0: f32, edge1: f32, x: f32): f32 {
  const t: f32 = clamp_f32((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3 - 2 * t);
}

export function metaballs_f32(count: i32): f64 {
  for (let i = 0; i < count; i++) {
    const s: f32 = <f32>count / 60;

    for (let y: i32 = 0; y < ROWS; y++) {
      for (let x: i32 = 0; x < COLS; x++) {
        let d: f32 = 0;

        d += 3 / Mathf.hypot(
          7.5 + Mathf.sin(s * 1.1) * 7.5 - <f32>x,
          (7.5 + Mathf.cos(s * 1.3) * 7.5 - <f32>y) / ASPECT_RATIO
        );

        d += 2 / Mathf.hypot(
          7.5 + Mathf.sin(s * 1.5) * 7.5 - <f32>x,
          (7.5 + Mathf.cos(s * 1.7) * 7.5 - <f32>y) / ASPECT_RATIO
        );

        setXY(x, y, <u8>Mathf.round(smoothstep_f32(0.75, 1.0, d) * 3));
      }
    }
  }

  return 0;
}

/**
 * Math
 */

export function loop_sin_f32(count: i32): f64 {
  let sum: f32 = 0;

  for (let i = 0; i < count; i++) {
    sum += Mathf.sin(<f32>i);
  }

  return sum;
}

export function loop_sin_f64(count: i32): f64 {
  let sum: f64 = 0;

  for (let i = 0; i < count; i++) {
    sum += Math.sin(<f64>i);
  }

  return sum;
}

export function loop_sqrt_f32(count: i32): f64 {
  let sum: f32 = 0;

  for (let i = 0; i < count; i++) {
    sum += Mathf.sqrt(<f32>i);
  }

  return sum;
}

export function loop_sqrt_f64(count: i32): f64 {
  let sum: f64 = 0;

  for (let i = 0; i < count; i++) {
    sum += Math.sqrt(<f64>i);
  }

  return sum;
}

export function loop_sqrt_native(count: i32): f64 {
  let sum: f64 = 0;

  for (let i = 0; i < count; i++) {
    sum += sqrt(<f64>i);
  }

  return sum;
}
