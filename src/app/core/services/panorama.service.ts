import { Injectable, signal } from '@angular/core';

export interface CaptureTarget {
  id: number;
  yaw: number;
  pitch: number;
  completed: boolean;
  imageData?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PanoramaService {
  readonly targets = signal<CaptureTarget[]>([]);
  readonly activeIndex = signal<number>(0);
  readonly captureInProgress = signal<boolean>(false);

  initializeTargets(): void {
    const list: CaptureTarget[] = [];
    let id = 1;

    // 1. Horizontal ring (Pitch = 0), 12 images at 30 deg steps
    for (let i = 0; i < 12; i++) {
      list.push({ id: id++, yaw: i * 30, pitch: 0, completed: false });
    }

    // 2. Upper ring at Pitch = 30, 8 images at 45 deg steps
    for (let i = 0; i < 8; i++) {
      list.push({ id: id++, yaw: i * 45, pitch: 30, completed: false });
    }

    // 3. Upper ring at Pitch = 60, 4 images at 90 deg steps
    for (let i = 0; i < 4; i++) {
      list.push({ id: id++, yaw: i * 90, pitch: 60, completed: false });
    }

    // 4. Lower ring at Pitch = -30, 8 images at 45 deg steps
    for (let i = 0; i < 8; i++) {
      list.push({ id: id++, yaw: i * 45, pitch: -30, completed: false });
    }

    // 5. Lower ring at Pitch = -60, 4 images at 90 deg steps
    for (let i = 0; i < 4; i++) {
      list.push({ id: id++, yaw: i * 90, pitch: -60, completed: false });
    }

    // 6. Top zenith (Pitch = 90)
    list.push({ id: id++, yaw: 0, pitch: 90, completed: false });

    // 7. Bottom nadir (Pitch = -90)
    list.push({ id: id++, yaw: 0, pitch: -90, completed: false });

    this.targets.set(list);
    this.activeIndex.set(0);
    this.captureInProgress.set(true);
  }

  getActiveTarget(): CaptureTarget | null {
    const list = this.targets();
    const idx = this.activeIndex();
    if (idx >= 0 && idx < list.length) {
      return list[idx];
    }
    return null;
  }

  completeActiveTarget(imageData: string): void {
    const list = [...this.targets()];
    const idx = this.activeIndex();
    if (idx >= 0 && idx < list.length) {
      list[idx] = { ...list[idx], completed: true, imageData };
      this.targets.set(list);

      // Find next uncompleted target index
      const nextIdx = list.findIndex((t) => !t.completed);
      this.activeIndex.set(nextIdx);
    }
  }

  retakeCurrentTarget(): void {
    const list = [...this.targets()];
    const idx = this.activeIndex();
    const targetIdx = idx !== -1 ? idx : list.length - 1;
    if (targetIdx >= 0 && targetIdx < list.length) {
      list[targetIdx] = { ...list[targetIdx], completed: false, imageData: undefined };
      this.targets.set(list);
      this.activeIndex.set(targetIdx);
    }
  }

  reset(): void {
    this.targets.set([]);
    this.activeIndex.set(0);
    this.captureInProgress.set(false);
  }

  getInstructions(currentYaw: number, currentPitch: number): { text: string; direction: string; aligned: boolean } {
    const active = this.getActiveTarget();
    if (!active) {
      return { text: 'All targets captured! Stitching...', direction: 'none', aligned: false };
    }

    // Calculate circular yaw difference
    let dYaw = active.yaw - currentYaw;
    if (dYaw > 180) dYaw -= 360;
    if (dYaw < -180) dYaw += 360;

    const dPitch = active.pitch - currentPitch;

    const tolerance = 3; // 3 degrees tolerance
    const yawAligned = Math.abs(dYaw) <= tolerance;
    const pitchAligned = Math.abs(dPitch) <= tolerance;

    if (yawAligned && pitchAligned) {
      return { text: 'Perfect! Capture now', direction: 'steady', aligned: true };
    }

    // Pitch guidance takes priority to stabilize vertical horizon first
    if (!pitchAligned) {
      if (dPitch > 0) {
        return { text: 'Tilt the phone upward', direction: 'up', aligned: false };
      } else {
        return { text: 'Tilt the phone downward', direction: 'down', aligned: false };
      }
    }

    // Yaw guidance
    if (!yawAligned) {
      if (dYaw > 0) {
        return { text: 'Move slightly right', direction: 'right', aligned: false };
      } else {
        return { text: 'Rotate left', direction: 'left', aligned: false };
      }
    }

    return { text: 'Align with target dot', direction: 'none', aligned: false };
  }
}
