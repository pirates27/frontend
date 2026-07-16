export interface Vector3 {
  x: number;
  y: number;
  z: number;
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
 * Builds a 3x3 rotation matrix from DeviceOrientation Spec Euler angles (alpha, beta, gamma).
 * The orientation matrix transforms a vector from world coordinate system (N, E, S, W, Up)
 * to device-fixed coordinate system.
 */
export function getRotationMatrix(alphaDeg: number, betaDeg: number, gammaDeg: number): Matrix3 {
  const alpha = alphaDeg * Math.PI / 180;
  const beta = betaDeg * Math.PI / 180;
  const gamma = gammaDeg * Math.PI / 180;

  const cA = Math.cos(alpha), sA = Math.sin(alpha);
  const cB = Math.cos(beta), sB = Math.sin(beta);
  const cG = Math.cos(gamma), sG = Math.sin(gamma);

  // Rotation sequence: R = Rz(alpha) * Rx(beta) * Ry(gamma)
  // This matches standard browser deviceorientation specifications.
  return [
    [cA * cG - sA * sB * sG, -sA * cB, cA * sG + sA * sB * cG],
    [sA * cG + cA * sB * sG,  cA * cB, sA * sG - cA * sB * cG],
    [-cB * sG,               sB,       cB * cG]
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
