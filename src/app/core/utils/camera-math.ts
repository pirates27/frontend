export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export type Matrix3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

/**
 * Converts spherical coordinates (yaw = heading, pitch = tilt) to a normalized 3D unit vector in Cartesian space.
 * Follows right-handed system convention where:
 * - Forward (yaw = 0, pitch = 0) points along the negative Z-axis.
 * - Right points along the positive X-axis.
 * - Up points along the positive Y-axis.
 */
export function sphericalToVector3(yawDeg: number, pitchDeg: number): Vector3 {
  const yawRad = yawDeg * Math.PI / 180;
  const pitchRad = pitchDeg * Math.PI / 180;

  return {
    x: Math.cos(pitchRad) * Math.sin(yawRad),
    y: Math.sin(pitchRad),
    z: -Math.cos(pitchRad) * Math.cos(yawRad),
  };
}

/**
 * Converts Browser DeviceOrientation Euler angles (alpha, beta, gamma)
 * into a Unit Quaternion using the intrinsic Z-X'-Y'' sequence spec.
 */
export function eulerToQuaternion(alphaDeg: number, betaDeg: number, gammaDeg: number): Quaternion {
  const alpha = (alphaDeg * Math.PI / 180) / 2;
  const beta = (betaDeg * Math.PI / 180) / 2;
  const gamma = (gammaDeg * Math.PI / 180) / 2;

  const cA = Math.cos(alpha), sA = Math.sin(alpha);
  const cB = Math.cos(beta), sB = Math.sin(beta);
  const cG = Math.cos(gamma), sG = Math.sin(gamma);

  return {
    x: sA * cB * cG - cA * sB * sG,
    y: cA * sB * cG + sA * cB * sG,
    z: cA * cB * sG - sA * sB * cG,
    w: cA * cB * cG + sA * sB * sG
  };
}

/**
 * Spherical Linear Interpolation (SLERP) to interpolate smoothly between two quaternions.
 */
export function slerpQuaternions(q1: Quaternion, q2: Quaternion, t: number): Quaternion {
  let dot = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;

  const q2Copy = { ...q2 };
  if (dot < 0) {
    dot = -dot;
    q2Copy.x = -q2Copy.x;
    q2Copy.y = -q2Copy.y;
    q2Copy.z = -q2Copy.z;
    q2Copy.w = -q2Copy.w;
  }

  if (dot > 0.9995) {
    // Linear interpolation if angles are extremely close
    const x = q1.x + t * (q2Copy.x - q1.x);
    const y = q1.y + t * (q2Copy.y - q1.y);
    const z = q1.z + t * (q2Copy.z - q1.z);
    const w = q1.w + t * (q2Copy.w - q1.w);
    
    const len = Math.sqrt(x*x + y*y + z*z + w*w);
    return { x: x/len, y: y/len, z: z/len, w: w/len };
  }

  const theta0 = Math.acos(dot);
  const theta = theta0 * t;
  const sinTheta = Math.sin(theta);
  const sinTheta0 = Math.sin(theta0);

  const s1 = Math.cos(theta) - dot * sinTheta / sinTheta0;
  const s2 = sinTheta / sinTheta0;

  return {
    x: s1 * q1.x + s2 * q2Copy.x,
    y: s1 * q1.y + s2 * q2Copy.y,
    z: s1 * q1.z + s2 * q2Copy.z,
    w: s1 * q1.w + s2 * q2Copy.w
  };
}

/**
 * Converts a Unit Quaternion into a 3x3 orthonormal Rotation Matrix.
 */
export function quaternionToRotationMatrix(q: Quaternion): Matrix3 {
  const xx = q.x * q.x;
  const xy = q.x * q.y;
  const xz = q.x * q.z;
  const xw = q.x * q.w;

  const yy = q.y * q.y;
  const yz = q.y * q.z;
  const yw = q.y * q.w;

  const zz = q.z * q.z;
  const zw = q.z * q.w;

  return [
    [1 - 2 * (yy + zz), 2 * (xy - zw),     2 * (xz + yw)],
    [2 * (xy + zw),     1 - 2 * (xx + zz), 2 * (yz - xw)],
    [2 * (xz - yw),     2 * (yz + xw),     1 - 2 * (xx + yy)]
  ];
}

/**
 * Adjusts the camera rotation matrix to compensate for device display rotation angle (e.g. landscape vs portrait).
 * Rotates the camera axes on the Z-axis by negative screen orientation angle.
 */
export function compensateScreenOrientation(matrix: Matrix3, angleDeg: number): Matrix3 {
  if (angleDeg === 0) return matrix;

  const angleRad = -angleDeg * Math.PI / 180;
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);

  const m = matrix;
  return [
    [m[0][0] * c + m[0][1] * s, -m[0][0] * s + m[0][1] * c, m[0][2]],
    [m[1][0] * c + m[1][1] * s, -m[1][0] * s + m[1][1] * c, m[1][2]],
    [m[2][0] * c + m[2][1] * s, -m[2][0] * s + m[2][1] * c, m[2][2]]
  ];
}

/**
 * Transforms a 3D vector from world space to camera/device space.
 * Since the rotation matrix R transforms from world to device, we multiply by R^T (transpose of R),
 * which is mathematically equivalent to the matrix inverse.
 */
export function transformVector3(matrix: Matrix3, vec: Vector3): Vector3 {
  const m = matrix;
  return {
    x: m[0][0] * vec.x + m[1][0] * vec.y + m[2][0] * vec.z,
    y: m[0][1] * vec.x + m[1][1] * vec.y + m[2][1] * vec.z,
    z: m[0][2] * vec.x + m[1][2] * vec.y + m[2][2] * vec.z
  };
}
