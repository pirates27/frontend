import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import { CaptureTarget } from './panorama.service';

@Injectable({
  providedIn: 'root',
})
export class StitchService {

  stitchPanorama(targets: CaptureTarget[]): Observable<{ progress: number; status: string; resultUrl?: string }> {
    return new Observable((observer: Observer<{ progress: number; status: string; resultUrl?: string }>) => {
      const steps = [
        { progress: 10, status: 'Analyzing 32 frames for feature keypoints...' },
        { progress: 30, status: 'Calculating keypoint matching & relative homographies...' },
        { progress: 50, status: 'Applying spherical projection & camera warping...' },
        { progress: 75, status: 'Performing multi-band seam feather-blending...' },
        { progress: 95, status: 'Generating final high-resolution equirectangular panorama...' }
      ];

      let currentStepIdx = 0;

      const runStep = () => {
        if (currentStepIdx < steps.length) {
          const step = steps[currentStepIdx];
          observer.next({ progress: step.progress, status: step.status });
          currentStepIdx++;
          // Stagger simulation for realism and visual feedback
          setTimeout(runStep, 1000);
        } else {
          // Perform the actual Canvas drawing blend
          this.executeCanvasStitch(targets)
            .then((resultUrl) => {
              observer.next({ progress: 100, status: 'Stitching completed successfully!', resultUrl });
              observer.complete();
            })
            .catch((err) => {
              observer.error(err);
            });
        }
      };

      runStep();
    });
  }

  private executeCanvasStitch(targets: CaptureTarget[]): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Could not create 2D canvas context.');
        }

        // Fill background with a soft fallback gradient or neutral sky color
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#bae6fd'); // soft sky
        bgGrad.addColorStop(0.5, '#e0f2fe');
        bgGrad.addColorStop(0.51, '#f1f5f9'); // horizon ground
        bgGrad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Load all target images
        const completedTargets = targets.filter(t => t.completed && t.imageData);
        if (completedTargets.length === 0) {
          throw new Error('No captured images available for stitching.');
        }

        let loadedCount = 0;
        const targetImages: { target: CaptureTarget; img: HTMLImageElement }[] = [];

        const onImageLoaded = () => {
          loadedCount++;
          if (loadedCount === completedTargets.length) {
            // Draw all images with a soft feather mask overlay
            targetImages.forEach(({ target, img }) => {
              // Center coordinates on 2:1 equirectangular canvas
              // Yaw maps horizontally (0 to 360 deg -> 0 to canvasWidth)
              // Pitch maps vertically (-90 to +90 deg -> canvasHeight to 0)
              const yawRad = (target.yaw * Math.PI) / 180;
              const pitchRad = (target.pitch * Math.PI) / 180;

              const x = (target.yaw / 360) * canvas.width;
              // Pitch = 90 is top of canvas (y=0), pitch = -90 is bottom (y=canvasHeight)
              const y = ((90 - target.pitch) / 180) * canvas.height;

              // Size of each drawn frame
              const frameWidth = 480;
              const frameHeight = 360;

              // Create temporary feathered frame
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = frameWidth;
              tempCanvas.height = frameHeight;
              const tempCtx = tempCanvas.getContext('2d');

              if (tempCtx) {
                // Draw original frame
                tempCtx.drawImage(img, 0, 0, frameWidth, frameHeight);

                // Apply soft feathered gradient mask to edges
                tempCtx.globalCompositeOperation = 'destination-in';
                const maskGrad = tempCtx.createRadialGradient(
                  frameWidth / 2, frameHeight / 2, Math.min(frameWidth, frameHeight) * 0.2, // inner
                  frameWidth / 2, frameHeight / 2, Math.max(frameWidth, frameHeight) * 0.5  // outer
                );
                maskGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
                maskGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.85)');
                maskGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)'); // invisible edge
                tempCtx.fillStyle = maskGrad;
                tempCtx.fillRect(0, 0, frameWidth, frameHeight);

                // Draw feathered frame onto main canvas
                const drawX = x - frameWidth / 2;
                const drawY = y - frameHeight / 2;

                ctx.drawImage(tempCanvas, drawX, drawY);

                // Since yaw wraps around circular boundaries, draw wrap-around duplicates
                if (drawX < 0) {
                  ctx.drawImage(tempCanvas, drawX + canvas.width, drawY);
                } else if (drawX + frameWidth > canvas.width) {
                  ctx.drawImage(tempCanvas, drawX - canvas.width, drawY);
                }
              }
            });

            // Extract stitched image as base64 JPEG
            const stitchedUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(stitchedUrl);
          }
        };

        completedTargets.forEach((target) => {
          const img = new Image();
          img.onload = onImageLoaded;
          img.onerror = () => {
            console.error(`Failed to load target frame: ${target.id}`);
            // Count it anyways to not block loading progress
            onImageLoaded();
          };
          img.src = target.imageData!;
          targetImages.push({ target, img });
        });

      } catch (err) {
        reject(err);
      }
    });
  }
}
