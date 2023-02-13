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

    // const xs = new Float32Array(2);
    // const ys = new Float32Array(2);

    // xs[0] = (Mathf.sin(s * 1.1) + 1) * 7.5;
    // ys[0] = (Mathf.cos(s * 1.3) + 1) * 7.5;
    // xs[1] = (Mathf.sin(s * 1.5) + 1) * 7.5;
    // ys[1] = (Mathf.cos(s * 1.7) + 1) * 7.5;

    const xs0: f32 = (Mathf.sin(s * 1.1) + 1) * 7.5;
    const ys0: f32 = (Mathf.cos(s * 1.3) + 1) * 7.5;
    const xs1: f32 = (Mathf.sin(s * 1.5) + 1) * 7.5;
    const ys1: f32 = (Mathf.cos(s * 1.7) + 1) * 7.5;

    for (let y: i32 = 0; y < ROWS; y++) {
      for (let x: i32 = 0; x < COLS; x++) {
        let d: f32 = 0;

        d += 3 / Mathf.hypot(
          xs0 - <f32>x,
          (ys0 - <f32>y) / ASPECT_RATIO
        );
        d += 3 / Mathf.hypot(
          xs1 - <f32>x,
          (ys1 - <f32>y) / ASPECT_RATIO
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

export function loop_hypot_f32(count: i32): f64 {
  let sum: f32 = 0;

  for (let i = 0; i < count; i++) {
    sum += Mathf.hypot(<f32>i, 1.0);
  }

  return sum;
}

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
