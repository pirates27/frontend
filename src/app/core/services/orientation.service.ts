import { Injectable, signal, OnDestroy } from '@angular/core';

export interface OrientationData {
  yaw: number;   // Alpha (0 to 360)
  pitch: number; // Beta (-180 to 180)
  roll: number;  // Gamma (-90 to 90)
}

@Injectable({
  providedIn: 'root',
})
export class OrientationService implements OnDestroy {
  readonly currentOrientation = signal<OrientationData>({ yaw: 0, pitch: 0, roll: 0 });
  readonly permissionGranted = signal<boolean | null>(null);

  private listenerRef: ((ev: DeviceOrientationEvent) => any) | null = null;

  async requestPermission(): Promise<boolean> {
    const docEvent = DeviceOrientationEvent as any;
    if (typeof docEvent.requestPermission === 'function') {
      try {
        const response = await docEvent.requestPermission();
        if (response === 'granted') {
          this.permissionGranted.set(true);
          this.startTracking();
          return true;
        } else {
          this.permissionGranted.set(false);
          return false;
        }
      } catch (err) {
        console.error('Orientation permission error:', err);
        this.permissionGranted.set(false);
        return false;
      }
    } else {
      // Standard browser, permission is implied
      this.permissionGranted.set(true);
      this.startTracking();
      return true;
    }
  }

  startTracking(): void {
    this.stopTracking();

    this.listenerRef = (event: DeviceOrientationEvent) => {
      let alpha = event.alpha || 0; // Yaw (0 to 360)
      let beta = event.beta || 0;   // Pitch (-180 to 180)
      let gamma = event.gamma || 0; // Roll (-90 to 90)

      this.currentOrientation.set({
        yaw: Math.round(alpha),
        pitch: Math.round(beta),
        roll: Math.round(gamma),
      });
    };

    window.addEventListener('deviceorientation', this.listenerRef, true);
  }

  stopTracking(): void {
    if (this.listenerRef) {
      window.removeEventListener('deviceorientation', this.listenerRef, true);
      this.listenerRef = null;
    }
  }

  ngOnDestroy(): void {
    this.stopTracking();
  }
}
