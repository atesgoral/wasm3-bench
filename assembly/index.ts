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