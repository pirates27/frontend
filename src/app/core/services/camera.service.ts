import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CameraService {
  readonly stream = signal<MediaStream | null>(null);
  readonly errorMessage = signal<string | null>(null);

  async startCamera(): Promise<MediaStream> {
    this.stopCamera();
    this.errorMessage.set(null);

    const constraints = {
      video: {
        facingMode: 'environment', // Prefer back camera
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream.set(mediaStream);
      return mediaStream;
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      let msg = 'Could not access device camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please enable camera access in settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device.';
      }
      this.errorMessage.set(msg);
      throw new Error(msg);
    }
  }

  stopCamera(): void {
    const currentStream = this.stream();
    if (currentStream) {
      currentStream.getTracks().forEach((track) => track.stop());
      this.stream.set(null);
    }
  }

  captureFrame(videoElement: HTMLVideoElement): string {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw mirror or non-mirror frame depending on camera mode
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.8);
    }
    return '';
  }
}
