import { Injectable } from '@angular/core';
import { Matrix3, Vector3, sphericalToVector3, transformVector3 } from '../utils/camera-math';

export interface ProjectedPoint {
  x: number;      // screen width percentage (0-100)
  y: number;      // screen height percentage (0-100)
  isVisible: boolean;
  isClamped: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectionService {
  // Configurable fields of view in degrees (default horizontal = 60)
  private fovX = 60; 
  private fovY = 40; 

  /**
   * Computes the vertical field of view dynamically based on the aspect ratio of the active camera track settings.
   */
  updateFovFromAspect(width: number, height: number): void {
    const defaultFovX = 60; // standard horizontal FOV in degrees
    const aspect = height / width;
    const halfFovXRad = (defaultFovX * Math.PI / 180) / 2;
    const halfFovYRad = Math.atan(aspect * Math.tan(halfFovXRad));
    
    this.fovX = defaultFovX;
    this.fovY = halfFovYRad * 2 * 180 / Math.PI;
    
    console.log(`Dynamic FOV Calibrated: Horizontal=${this.fovX.toFixed(1)}°, Vertical=${this.fovY.toFixed(1)}° (Aspect=${aspect.toFixed(2)})`);
  }

  /**
   * Projects a world-space target (yaw, pitch) into 2D viewport screen coordinates.
   * If the target is behind the camera (camVec.z >= 0) or outside screen bounds,
   * we hide it. If the target is the active guide target, we clamp it to screen borders.
   */
  projectTarget(
    targetYaw: number,
    targetPitch: number,
    matrix: Matrix3,
    isActive: boolean = false
  ): ProjectedPoint {
    const targetVec = sphericalToVector3(targetYaw, targetPitch);
    const camVec = transformVector3(matrix, targetVec);

    // Compute tangent limits based on dynamic FOV settings
    const hTanLimit = Math.tan((this.fovX * Math.PI / 180) / 2);
    const vTanLimit = Math.tan((this.fovY * Math.PI / 180) / 2);

    let x = 50;
    let y = 50;
    let isVisible = false;
    let isClamped = false;

    // The back camera points along the negative Z-axis in device coordinates (camVec.z < 0).
    if (camVec.z < 0) {
      const zScale = Math.abs(camVec.z);
      x = 50 + (camVec.x / zScale / hTanLimit) * 50;
      y = 50 - (camVec.y / zScale / vTanLimit) * 50;

      isVisible = x >= 0 && x <= 100 && y >= 0 && y <= 100;
    }

    if (isActive && !isVisible) {
      // If active target is off-screen (or behind the user), clamp to borders to point directions
      if (camVec.z >= 0) {
        // Behind phone: point horizontally to the side of rotation
        x = camVec.x >= 0 ? 95 : 5;
        y = 50;
      } else {
        x = Math.max(5, Math.min(95, x));
        y = Math.max(5, Math.min(95, y));
      }
      isVisible = true;
      isClamped = true;
    }

    return { x, y, isVisible, isClamped };
  }

  /**
   * Calculates the exact angular difference in degrees between the target world vector
   * and the camera's current forward viewing vector in world coordinates.
   */
  getAngularError(targetYaw: number, targetPitch: number, matrix: Matrix3): number {
    const targetVec = sphericalToVector3(targetYaw, targetPitch);

    // Camera forward vector in world space is the negative third column of the orientation matrix R
    const forwardVec: Vector3 = {
      x: -matrix[0][2],
      y: -matrix[1][2],
      z: -matrix[2][2],
    };

    // Calculate dot product of unit vectors
    const dot = targetVec.x * forwardVec.x + targetVec.y * forwardVec.y + targetVec.z * forwardVec.z;
    const errorRad = Math.acos(Math.max(-1, Math.min(1, dot)));
    return errorRad * 180 / Math.PI;
  }
}
