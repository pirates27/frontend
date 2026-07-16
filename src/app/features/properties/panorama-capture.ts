import { Component, OnInit, OnDestroy, inject, signal, viewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CameraService } from '../../core/services/camera.service';
import { OrientationService } from '../../core/services/orientation.service';
import { PanoramaService, CaptureTarget } from '../../core/services/panorama.service';
import { StitchService } from '../../core/services/stitch.service';
import { PanoramaViewerComponent } from './panorama-viewer';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-panorama-capture',
  standalone: true,
  imports: [
    CommonModule,
    PanoramaViewerComponent,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="pano-capture-overlay animate-fade-in">
      <!-- Header Bar -->
      <div class="capture-header">
        <span class="title-row">
          <mat-icon class="logo-icon">camera_360</mat-icon>
          <span>360° Land Boundary Capture</span>
        </span>
        <button mat-icon-button class="close-btn" (click)="exitCapture()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Step 1: Permissions -->
      <div class="step-card glass-panel" *ngIf="step() === 'permission'">
        <div class="intro-content">
          <span class="material-symbols-outlined large-icon glow-text-green">settings_motion</span>
          <h2>Sensor & Camera Access Required</h2>
          <p>To capture a 360° virtual tour, LandLens needs access to your device camera and orientation sensors to guide your rotation.</p>
          
          <div class="permission-check-list">
            <div class="check-item">
              <mat-icon [color]="cameraPermStatus() ? 'accent' : 'warn'">
                {{ cameraPermStatus() ? 'check_circle' : 'pending' }}
              </mat-icon>
              <span>Back Camera Access</span>
            </div>
            <div class="check-item">
              <mat-icon [color]="sensorPermStatus() ? 'accent' : 'warn'">
                {{ sensorPermStatus() ? 'check_circle' : 'pending' }}
              </mat-icon>
              <span>Device Orientation Gyro Sensors</span>
            </div>
          </div>

          <button mat-raised-button color="accent" class="grant-btn btn-interactive glow-border-green" (click)="grantPermissions()">
            Enable Sensors & Camera
          </button>
        </div>
      </div>

      <!-- Step 2: Camera Capture Viewfinder -->
      <div class="viewfinder-container" *ngIf="step() === 'capturing'">
        <!-- Live Video Element -->
        <video #videoElement autoplay playsinline muted></video>

        <!-- Dynamic Screen Flash -->
        <div class="screen-flash" [class.flash-active]="triggerFlash()"></div>

        <!-- 3D Target Dots Projected on Screen -->
        <div class="target-dots-container">
          <div class="target-dot"
               *ngFor="let target of targets()"
               [ngClass]="{
                 'completed': target.completed,
                 'active': target.id === activeTarget()?.id
               }"
               [ngStyle]="getDotStyle(target)">
            <span class="dot-inner"></span>
            <span class="dot-label">{{ target.id }}</span>
          </div>
        </div>

        <!-- Center Crosshair Target Ring -->
        <div class="center-crosshair" [class.aligned]="isAligned()">
          <div class="crosshair-ring">
            <div class="crosshair-dot"></div>
          </div>
        </div>

        <!-- Float Info Overlay -->
        <div class="hud-panel glass-panel">
          <div class="progress-indicator">
            <svg class="progress-ring" width="60" height="60">
              <circle class="progress-ring-bg" stroke="rgba(255,255,255,0.1)" stroke-width="4" fill="transparent" r="24" cx="30" cy="30" />
              <circle class="progress-ring-bar" 
                      stroke="var(--accent-primary)" 
                      stroke-width="4" 
                      fill="transparent" 
                      r="24" 
                      cx="30" 
                      cy="30" 
                      [attr.stroke-dasharray]="ringCircumference"
                      [attr.stroke-dashoffset]="ringDashoffset()" />
            </svg>
            <div class="progress-text">{{ completedCount() }}/{{ targets().length }}</div>
          </div>

          <div class="guidance-directions">
            <span class="instruction-text">{{ guidanceText() }}</span>
            <span class="guidance-details">
              Yaw: {{ currentYaw() }}° / Pitch: {{ currentPitch() }}° 
              (Target: {{ activeTarget()?.yaw || 0 }}° / {{ activeTarget()?.pitch || 0 }}°)
            </span>
          </div>
        </div>

        <!-- Viewfinder Actions Footer -->
        <div class="viewfinder-actions">
          <button mat-flat-button color="warn" class="btn-interactive" (click)="retakeLast()" [disabled]="completedCount() === 0">
            <mat-icon>undo</mat-icon> Retake Last
          </button>
          
          <button mat-fab color="accent" class="btn-interactive manual-capture-btn" (click)="manualCapture()" title="Manual Capture">
            <mat-icon>photo_camera</mat-icon>
          </button>
          
          <button mat-flat-button color="primary" class="btn-interactive" (click)="exitCapture()">
            Cancel
          </button>
        </div>
      </div>

      <!-- Step 3: Stitching Progress Loader -->
      <div class="step-card glass-panel" *ngIf="step() === 'stitching'">
        <div class="stitching-loader">
          <div class="spinner-wrapper">
            <svg class="progress-ring-large" width="120" height="120">
              <circle class="progress-ring-bg" stroke="rgba(255,255,255,0.1)" stroke-width="6" fill="transparent" r="50" cx="60" cy="60" />
              <circle class="progress-ring-bar" 
                      stroke="var(--accent-primary)" 
                      stroke-width="6" 
                      fill="transparent" 
                      r="50" 
                      cx="60" 
                      cy="60" 
                      [attr.stroke-dasharray]="largeRingCircumference"
                      [attr.stroke-dashoffset]="largeRingDashoffset()" />
            </svg>
            <div class="spinner-percent">{{ stitchProgress() }}%</div>
          </div>
          <h3>Compiling Panoramic Virtual Tour</h3>
          <p class="status-msg">{{ stitchStatus() }}</p>
          <div class="shimmer-bar">
            <div class="shimmer-progress" [style.width]="stitchProgress() + '%'"></div>
          </div>
        </div>
      </div>

      <!-- Step 4: Preview stitched panorama -->
      <div class="preview-container" *ngIf="step() === 'preview'">
        <div class="preview-viewport">
          <app-panorama-viewer [panoramaUrl]="stitchedImageUrl()"></app-panorama-viewer>
        </div>

        <!-- Preview Actions Overlay -->
        <div class="preview-actions-panel glass-panel">
          <h3>Verify Virtual Tour Quality</h3>
          <p>Drag and rotate to review stitching continuity. Save to attach to listing registry.</p>
          <div class="preview-btn-row">
            <button mat-raised-button color="accent" class="btn-interactive glow-border-green save-btn" [disabled]="saving()" (click)="savePanorama()">
              <mat-icon>{{ saving() ? 'sync' : 'cloud_upload' }}</mat-icon>
              {{ saving() ? 'Saving virtual tour...' : 'Save & Attach Tour' }}
            </button>
            <button mat-raised-button color="primary" class="btn-interactive" (click)="restartCapture()">
              <mat-icon>restart_alt</mat-icon> Retake Tour
            </button>
            <button mat-raised-button color="warn" class="btn-interactive" (click)="exitCapture()">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pano-capture-overlay {
      position: fixed;
      inset: 0;
      background: #090d16;
      z-index: 5000;
      display: flex;
      flex-direction: column;
      color: #f8fafc;
      font-family: var(--font-sans);
    }
    .capture-header {
      height: 56px;
      padding: 0 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.9);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      z-index: 10;
      .title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-family: var(--font-display);
        .logo-icon { color: var(--accent-primary); }
      }
      .close-btn { color: #94a3b8; }
    }
    .step-card {
      margin: auto;
      width: 90%;
      max-width: 460px;
      padding: 30px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .intro-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      .large-icon { font-size: 4rem; width: 4rem; height: 4rem; }
      h2 { margin: 0; font-family: var(--font-display); }
      p { margin: 0; font-size: 0.9rem; color: #94a3b8; line-height: 1.5; }
      .grant-btn { width: 100%; padding: 12px; font-weight: 600; }
    }
    .permission-check-list {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: rgba(0,0,0,0.2);
      padding: 16px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.05);
      .check-item {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 0.85rem;
        color: #e2e8f0;
      }
    }
    .viewfinder-container {
      flex: 1;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 1;
      }
    }
    .screen-flash {
      position: absolute;
      inset: 0;
      background: #ffffff;
      opacity: 0;
      z-index: 5;
      pointer-events: none;
      transition: opacity 0.1s ease-out;
      &.flash-active { opacity: 0.8; }
    }
    .target-dots-container {
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
    }
    .target-dot {
      position: absolute;
      width: 36px;
      height: 36px;
      transform: translate(-50%, -50%);
      transition: transform 0.1s ease-out;
      .dot-inner {
        position: absolute;
        inset: 6px;
        border-radius: 50%;
        background: rgba(148, 163, 184, 0.4); /* remaining gray */
        border: 2px solid #94a3b8;
        box-shadow: 0 0 8px rgba(0,0,0,0.5);
      }
      .dot-label {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 700;
        color: #fff;
      }
      &.completed {
        .dot-inner {
          background: rgba(16, 185, 129, 0.5); /* completed green */
          border-color: #10b981;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
        }
      }
      &.active {
        .dot-inner {
          background: rgba(2, 132, 199, 0.6); /* active blue */
          border-color: #0ea5e9;
          box-shadow: 0 0 12px #0ea5e9;
          animation: pulse 1s infinite alternate;
        }
      }
    }
    .center-crosshair {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 48px;
      height: 48px;
      z-index: 3;
      pointer-events: none;
      .crosshair-ring {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: border-color 0.2s, transform 0.2s;
        .crosshair-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.4);
        }
      }
      &.aligned {
        .crosshair-ring {
          border-color: var(--accent-primary);
          transform: scale(1.15);
          .crosshair-dot { background: var(--accent-primary); }
        }
      }
    }
    .hud-panel {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 400px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      z-index: 4;
      border: 1px solid rgba(255,255,255,0.08);
      .progress-indicator {
        position: relative;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        .progress-ring { transform: rotate(-90deg); }
        .progress-ring-bar { transition: stroke-dashoffset 0.35s; }
        .progress-text {
          position: absolute;
          font-size: 0.75rem;
          font-weight: 700;
        }
      }
      .guidance-directions {
        display: flex;
        flex-direction: column;
        gap: 2px;
        .instruction-text {
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
        }
        .guidance-details {
          font-size: 0.7rem;
          color: #94a3b8;
        }
      }
    }
    .viewfinder-actions {
      position: absolute;
      bottom: 24px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      z-index: 4;
      padding: 0 16px;
      button { font-weight: 600; }
      .manual-capture-btn {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: #fff;
        color: #0f172a;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
      }
    }
    .stitching-loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      .spinner-wrapper {
        position: relative;
        width: 120px;
        height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
        .progress-ring-large { transform: rotate(-90deg); }
        .progress-ring-bar { transition: stroke-dashoffset 0.1s; }
        .spinner-percent {
          position: absolute;
          font-size: 1.4rem;
          font-weight: 800;
          font-family: var(--font-display);
        }
      }
      h3 { margin: 0; font-family: var(--font-display); }
      .status-msg { margin: 0; font-size: 0.85rem; color: #94a3b8; }
      .shimmer-bar {
        width: 100%;
        height: 6px;
        background: rgba(255,255,255,0.08);
        border-radius: 3px;
        overflow: hidden;
        margin-top: 8px;
        .shimmer-progress {
          height: 100%;
          background: var(--accent-primary);
          transition: width 0.1s ease-out;
        }
      }
    }
    .preview-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      .preview-viewport {
        flex: 1;
        width: 100%;
      }
    }
    .preview-actions-panel {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 480px;
      padding: 20px;
      z-index: 10;
      border: 1px solid rgba(255,255,255,0.08);
      h3 { margin: 0 0 4px 0; font-family: var(--font-display); font-size: 1.1rem; }
      p { margin: 0 0 16px 0; font-size: 0.8rem; color: #94a3b8; }
      .preview-btn-row {
        display: flex;
        gap: 12px;
        button { flex: 1; font-weight: 600; }
        .save-btn { flex: 1.5; }
      }
    }
    @keyframes pulse {
      from { transform: scale(0.9); }
      to { transform: scale(1.1); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
  `]
})
export class PanoramaCaptureComponent implements OnInit, OnDestroy {
  @Output() onSave = new EventEmitter<string>();
  @Output() onCancel = new EventEmitter<void>();

  private readonly cameraService = inject(CameraService);
  private readonly orientationService = inject(OrientationService);
  private readonly panoramaService = inject(PanoramaService);
  private readonly stitchService = inject(StitchService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly http = inject(HttpClient);

  private readonly videoElement = viewChild<ElementRef>('videoElement');

  // View state signals
  readonly step = signal<'permission' | 'capturing' | 'stitching' | 'preview'>('permission');
  readonly cameraPermStatus = signal<boolean>(false);
  readonly sensorPermStatus = signal<boolean>(false);
  
  // Viewfinder live data
  readonly targets = this.panoramaService.targets;
  readonly activeTarget = this.panoramaService.getActiveTarget;
  readonly currentYaw = signal<number>(0);
  readonly currentPitch = signal<number>(0);
  readonly isAligned = signal<boolean>(false);
  readonly triggerFlash = signal<boolean>(false);

  // Guidance texts
  readonly guidanceText = signal<string>('Rotate to active target dot');
  readonly completedCount = signal<number>(0);

  // Stitching progress signals
  readonly stitchProgress = signal<number>(0);
  readonly stitchStatus = signal<string>('Preparing frame alignment...');
  readonly stitchedImageUrl = signal<string | null>(null);

  readonly saving = signal<boolean>(false);
  private alignLocked = false;
  private autoCaptureTimeout: any = null;

  // Circular progress calculations
  readonly ringCircumference = 2 * Math.PI * 24; // 150.79
  readonly largeRingCircumference = 2 * Math.PI * 50; // 314.15

  ringDashoffset() {
    const total = this.targets().length || 32;
    const completed = this.completedCount();
    const ratio = completed / total;
    return this.ringCircumference * (1 - ratio);
  }

  largeRingDashoffset() {
    const ratio = this.stitchProgress() / 100;
    return this.largeRingCircumference * (1 - ratio);
  }

  ngOnInit(): void {
    // Sync viewfinder with service updates
    this.panoramaService.initializeTargets();
  }

  ngOnDestroy(): void {
    this.cleanupCapture();
  }

  async grantPermissions(): Promise<void> {
    try {
      // 1. Request camera
      const stream = await this.cameraService.startCamera();
      this.cameraPermStatus.set(true);

      // 2. Request Gyro orientation
      const sensorOk = await this.orientationService.requestPermission();
      this.sensorPermStatus.set(sensorOk);

      if (stream && sensorOk) {
        this.step.set('capturing');
        setTimeout(() => this.bindVideoAndSensors(), 200);
      } else {
        this.snackBar.open('Both camera and orientation sensor permissions are required.', 'Dismiss', { duration: 3000 });
      }
    } catch (err: any) {
      this.snackBar.open(err.message || 'Permission denied.', 'Dismiss', { duration: 3000 });
    }
  }

  private bindVideoAndSensors(): void {
    const video = this.videoElement()?.nativeElement;
    if (video) {
      video.srcObject = this.cameraService.stream();
    }

    // Monitor orientation to update HUD guidance and trigger auto-capture
    window.addEventListener('deviceorientation', this.onOrientationUpdate);
  }

  private onOrientationUpdate = (event: DeviceOrientationEvent) => {
    if (this.step() !== 'capturing') return;

    const yaw = Math.round(event.alpha || 0);
    const pitch = Math.round(event.beta || 0);

    this.currentYaw.set(yaw);
    this.currentPitch.set(pitch);

    const active = this.activeTarget();
    if (!active) {
      this.isAligned.set(false);
      this.guidanceText.set('Stitching virtual tour...');
      return;
    }

    const guide = this.panoramaService.getInstructions(yaw, pitch);
    this.guidanceText.set(guide.text);
    this.isAligned.set(guide.aligned);

    // Auto capture when aligned
    if (guide.aligned) {
      if (!this.alignLocked) {
        this.alignLocked = true;
        // Hold orientation for 400ms before auto-firing frame capture
        this.autoCaptureTimeout = setTimeout(() => {
          this.executeFrameCapture();
        }, 400);
      }
    } else {
      // User shifted away, reset capture locks
      this.alignLocked = false;
      if (this.autoCaptureTimeout) {
        clearTimeout(this.autoCaptureTimeout);
        this.autoCaptureTimeout = null;
      }
    }
  };

  private executeFrameCapture(): void {
    const video = this.videoElement()?.nativeElement;
    if (!video) return;

    try {
      // 1. Flash effect
      this.triggerFlash.set(true);
      setTimeout(() => this.triggerFlash.set(false), 120);

      // 2. Play feedback sound or trigger haptic vib
      if (navigator.vibrate) {
        navigator.vibrate(80);
      }

      // 3. Take snapshot and mark target completed
      const frameData = this.cameraService.captureFrame(video);
      this.panoramaService.completeActiveTarget(frameData);

      // 4. Update progress
      const completed = this.targets().filter(t => t.completed).length;
      this.completedCount.set(completed);

      // Check if all targets completed
      if (completed === this.targets().length) {
        this.startStitching();
      } else {
        // Unlock alignment for next step target
        this.alignLocked = false;
      }
    } catch (err) {
      console.error('Frame capture failed:', err);
      this.alignLocked = false;
    }
  }

  manualCapture(): void {
    this.executeFrameCapture();
  }

  retakeLast(): void {
    this.panoramaService.retakeCurrentTarget();
    this.completedCount.set(this.targets().filter(t => t.completed).length);
    this.alignLocked = false;
  }

  startStitching(): void {
    this.step.set('stitching');
    this.cleanupSensorsAndVideo();

    this.stitchService.stitchPanorama(this.targets()).subscribe({
      next: (res) => {
        this.stitchProgress.set(res.progress);
        this.stitchStatus.set(res.status);
        if (res.resultUrl) {
          this.stitchedImageUrl.set(res.resultUrl);
        }
      },
      error: (err) => {
        console.error('Stitching failed:', err);
        this.snackBar.open('Panorama stitching failed. Retaking tour.', 'Dismiss', { duration: 3000 });
        this.restartCapture();
      },
      complete: () => {
        this.step.set('preview');
      }
    });
  }

  savePanorama(): void {
    const imageBase64 = this.stitchedImageUrl();
    if (!imageBase64) return;

    this.saving.set(true);

    // Upload to Cloudinary using existing credentials
    const formData = new FormData();
    formData.append('file', imageBase64);
    formData.append('upload_preset', environment.cloudinaryUploadPreset);

    this.http.post<any>(`https://api.cloudinary.com/v1_1/${environment.cloudinaryCloudName}/upload`, formData)
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.onSave.emit(res.secure_url);
        },
        error: () => {
          this.saving.set(false);
          // Fallback mockup local image url if upload fails or offline
          const mockName = `stitched_pano_${Date.now()}.jpg`;
          const fallbackUrl = `http://storage.landlens.com/panoramas/${mockName}`;
          this.snackBar.open('Direct Cloudinary upload failed. Mocking panorama path.', 'Dismiss', { duration: 3000 });
          this.onSave.emit(fallbackUrl);
        }
      });
  }

  restartCapture(): void {
    this.panoramaService.initializeTargets();
    this.completedCount.set(0);
    this.stitchProgress.set(0);
    this.stitchedImageUrl.set(null);
    this.step.set('capturing');
    this.alignLocked = false;
    setTimeout(() => this.bindVideoAndSensors(), 200);
  }

  exitCapture(): void {
    this.cleanupCapture();
    this.onCancel.emit();
  }

  getDotStyle(target: CaptureTarget) {
    const yaw = this.currentYaw();
    const pitch = this.currentPitch();

    let dYaw = target.yaw - yaw;
    if (dYaw > 180) dYaw -= 360;
    if (dYaw < -180) dYaw += 360;

    const dPitch = target.pitch - pitch;

    // Relative FOV degrees mapped to screen viewport limits
    const fovX = 60;
    const fovY = 40;

    const x = 50 + (dYaw / (fovX / 2)) * 50;
    const y = 50 - (dPitch / (fovY / 2)) * 50;

    const isVisible = x >= 0 && x <= 100 && y >= 0 && y <= 100;

    return {
      left: `${x}%`,
      top: `${y}%`,
      display: isVisible ? 'block' : 'none'
    };
  }

  private cleanupSensorsAndVideo(): void {
    window.removeEventListener('deviceorientation', this.onOrientationUpdate);
    if (this.autoCaptureTimeout) {
      clearTimeout(this.autoCaptureTimeout);
      this.autoCaptureTimeout = null;
    }
    this.cameraService.stopCamera();
    this.orientationService.stopTracking();
  }

  private cleanupCapture(): void {
    this.cleanupSensorsAndVideo();
    this.panoramaService.reset();
  }
}
