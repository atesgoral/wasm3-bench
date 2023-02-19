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

function gen_sin(): void {
  for (let i: i32 = 0; i < 256; i++) {
    const s: f32 = Mathf.sin(<f32>i / 256 * Mathf.PI * 2);
    store<f32>(256 + i * 4, s);
  }
}

function gen_cos(): void {
  for (let i: i32 = 0; i < 256; i++) {
    const s: f32 = Mathf.cos(<f32>i / 256 * Mathf.PI * 2);
    store<f32>(256 + 256 + i * 4, s);
  }
}

function gen_sqrt(): void {
  for (let i: i32 = 0; i < 100; i++) {
    const s: f32 = Mathf.sqrt(<f32>i);
    store<f32>(256 + 256 + 256 + i * 4, s);
  }
}

function lu_sin(a: f32): f32 {
  const i: i32 = <i32>((((a / (Mathf.PI * 2) * 256) % 256) + 256) % 256);
  return load<f32>(256 + i * 4);
}

function lu_cos(a: f32): f32 {
  const i: i32 = <i32>((((a / (Mathf.PI * 2) * 256) % 256) + 256) % 256);
  return load<f32>(256 + 256 + i * 4);
}

function lu_sqrt(a: f32): f32 {
  let p: f32 = 1;
  let v: f32 = a;

  while (v >= 100) {
    v /= 100;
    p *= 10;
  }

  const i: i32 = <i32>v;

  return load<f32>(256 + 256 + 256 + i * 4) * p;
}

function hypot_32(a: f32, b: f32): f32 {
  return lu_sqrt(a * a + b * b);
}

export function setup(): void {
  gen_sin();
  gen_cos();
  gen_sqrt();
}

export function bench_metaballs_hypot_f32(count: i32): f64 {
  for (let i = 0; i < count; i++) {
    const s: f32 = <f32>count / 60;

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

export function bench_metaballs_sqrt_f32(count: i32): f64 {
  for (let i = 0; i < count; i++) {
    const s: f32 = <f32>count / 60;

    const xs0: f32 = (Mathf.sin(s * 1.1) + 1) * 7.5;
    const ys0: f32 = (Mathf.cos(s * 1.3) + 1) * 7.5;
    const xs1: f32 = (Mathf.sin(s * 1.5) + 1) * 7.5;
    const ys1: f32 = (Mathf.cos(s * 1.7) + 1) * 7.5;

    for (let y: i32 = 0; y < ROWS; y++) {
      for (let x: i32 = 0; x < COLS; x++) {
        let d: f32 = 0;

        d += 3 / Mathf.sqrt(
          (xs0 - <f32>x) ** 2
          + ((ys0 - <f32>y) / ASPECT_RATIO) ** 2
        );
        d += 3 / Mathf.sqrt(
          (xs1 - <f32>x) ** 2
          + ((ys1 - <f32>y) / ASPECT_RATIO) ** 2
        );

        setXY(x, y, <u8>Mathf.round(smoothstep_f32(0.75, 1.0, d) * 3));
      }
    }
  }

  return 0;
}

export function bench_metaballs_lu_f32(count: i32): f64 {
  for (let i = 0; i < count; i++) {
    const s: f32 = <f32>count / 60;

    const xs0: f32 = (lu_sin(s * 1.1) + 1) * 7.5;
    const ys0: f32 = (lu_cos(s * 1.3) + 1) * 7.5;
    const xs1: f32 = (lu_sin(s * 1.5) + 1) * 7.5;
    const ys1: f32 = (lu_cos(s * 1.7) + 1) * 7.5;

    for (let y: i32 = 0; y < ROWS; y++) {
      for (let x: i32 = 0; x < COLS; x++) {
        let d: f32 = 0;

        d += 3 / lu_sqrt(
          (xs0 - <f32>x) ** 2
          + ((ys0 - <f32>y) / ASPECT_RATIO) ** 2
        );
        d += 3 / lu_sqrt(
          (xs1 - <f32>x) ** 2
          + ((ys1 - <f32>y) / ASPECT_RATIO) ** 2
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

export function bench_hypot_f32(count: i32): f64 {
  let sum: f32 = 0;

  for (let i = 0; i < count; i++) {
    const a: f32 = <f32>i;
    const b: f32 = <f32>(count - i);

    sum += Mathf.hypot(a, b);
  }

  return sum;
}

export function bench_hypot_via_sqrt_f32(count: i32): f64 {
  let sum: f32 = 0;

  for (let i = 0; i < count; i++) {
    const a: f32 = <f32>i;
    const b: f32 = <f32>(count - i);

    sum += Mathf.sqrt(a ** 2 + b ** 2);
  }

  return sum;
}

export function bench_lu_hypot(count: i32): f64 {
  let sum: f32 = 0;

  for (let i = 0; i < count; i++) {
    sum += hypot_32(<f32>i, 1.0);
  }

  return sum;
}

export function bench_sin_f32(count: i32): f64 {
  let sum: f32 = 0;

  for (let i = 0; i < count; i++) {
    sum += Mathf.sin(<f32>i);
  }

  return sum;
}

export function bench_lu_sin(count: i32): f64 {
  let sum: f32 = 0;

  for (let i = 0; i < count; i++) {
    sum += lu_sin(<f32>i);
  }

  return sum;
}

export function bench_sin_f64(count: i32): f64 {
  let sum: f64 = 0;

  for (let i = 0; i < count; i++) {
    sum += Math.sin(<f64>i);
  }

  return sum;
}

export function bench_sqrt_f32(count: i32): f64 {
  let sum: f32 = 0;

  for (let i = 0; i < count; i++) {
    sum += Mathf.sqrt(<f32>i);
  }

  return sum;
}

export function bench_lu_sqrt(count: i32): f64 {
  let sum: f32 = 0;

  for (let i = 0; i < count; i++) {
    sum += lu_sqrt(<f32>i);
  }

  return sum;
}

export function bench_sqrt_f64(count: i32): f64 {
  let sum: f64 = 0;

  for (let i = 0; i < count; i++) {
    sum += Math.sqrt(<f64>i);
  }

  return sum;
}

export function bench_sqrt_native(count: i32): f64 {
  let sum: f64 = 0;

  for (let i = 0; i < count; i++) {
    sum += sqrt(<f64>i);
  }

  return sum;
}
