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

      <!-- Step 1: Permissions / Mode Selection -->
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
          
          <button mat-button class="simulation-btn btn-interactive" style="margin-top: 12px; color: var(--accent-primary);" (click)="startSimulationMode()">
            <mat-icon>terminal</mat-icon>
            Start Simulator Mode (Testing Fallback)
          </button>
        </div>
      </div>

      <!-- Step 2: Camera Capture Viewfinder -->
      <div class="viewfinder-container" *ngIf="step() === 'capturing'" (click)="onViewfinderClick($event)">
        <!-- Live Video Element -->
        <video #videoElement *ngIf="!isSimulated()" autoplay playsinline muted></video>

        <!-- Simulated Visual Backdrop for testing / HTTP insecure contexts -->
        <div class="simulated-backdrop" *ngIf="isSimulated()">
          <div class="sky-zone" [style.transform]="getSimulatedSkyTransform()"></div>
          <div class="ground-zone" [style.transform]="getSimulatedGroundTransform()"></div>
          <div class="horizon-line"></div>
          <div class="simulation-badge">
            <mat-icon>terminal</mat-icon>
            <span>SIMULATOR ACTIVE - Use keyboard ARROWS, tap screen, or HUD buttons to rotate & click</span>
          </div>
        </div>

        <!-- Horizontal Compass Radar Strip -->
        <div class="compass-radar-strip">
          <div class="radar-track" [style.transform]="getRadarTrackTransform()">
            <!-- compass card directions -->
            <span class="radar-card" style="left: 0px;">N</span>
            <span class="radar-card" style="left: 90px;">E</span>
            <span class="radar-card" style="left: 180px;">S</span>
            <span class="radar-card" style="left: 270px;">W</span>
            <span class="radar-card" style="left: 360px;">N</span>
            
            <!-- target positions -->
            <div class="radar-target" 
                 *ngFor="let target of targets()" 
                 [ngClass]="{
                   'completed': target.completed,
                   'active': target.id === activeTarget()?.id
                 }"
                 [style.left.px]="target.yaw">
              {{ target.id }}
            </div>
          </div>
          <div class="radar-cursor"></div>
        </div>

        <!-- Dynamic Screen Flash -->
        <div class="screen-flash" [class.flash-active]="triggerFlash()"></div>

        <!-- 3D Target Dots Projected on Screen -->
        <div class="target-dots-container">
          <div class="target-dot"
               *ngFor="let target of targets()"
               [ngClass]="{
                 'completed': target.completed,
                 'active': target.id === activeTarget()?.id,
                 'clamped': isTargetClamped(target)
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
          <!-- Arrow guidance pointing to active target direction -->
          <div class="hud-arrow-guidance" *ngIf="activeTarget() && !isAligned()">
            <mat-icon *ngIf="guidanceDirection() === 'right'">arrow_forward</mat-icon>
            <mat-icon *ngIf="guidanceDirection() === 'left'">arrow_back</mat-icon>
            <mat-icon *ngIf="guidanceDirection() === 'up'">arrow_upward</mat-icon>
            <mat-icon *ngIf="guidanceDirection() === 'down'">arrow_downward</mat-icon>
          </div>
        </div>

        <!-- Float Info Overlay -->
        <div class="hud-panel glass-panel">
          <div class="progress-indicator">
            <svg class="progress-ring" width="60" height="60">
              <circle class="progress-ring-bg" stroke="rgba(0,0,0,0.06)" stroke-width="4" fill="transparent" r="24" cx="30" cy="30" />
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

        <!-- Simulator Rotation HUD buttons for mobile/touch users -->
        <div class="simulator-hud-controls" *ngIf="isSimulated()">
          <button type="button" mat-mini-fab class="sim-hud-btn btn-interactive" (click)="rotateSimulated(0, 3)" title="Tilt Up">
            <mat-icon>arrow_upward</mat-icon>
          </button>
          <div class="middle-row">
            <button type="button" mat-mini-fab class="sim-hud-btn btn-interactive" (click)="rotateSimulated(-10, 0)" title="Rotate Left">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <button type="button" mat-mini-fab class="sim-hud-btn btn-interactive" (click)="rotateSimulated(10, 0)" title="Rotate Right">
              <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
          <button type="button" mat-mini-fab class="sim-hud-btn btn-interactive" (click)="rotateSimulated(0, -3)" title="Tilt Down">
            <mat-icon>arrow_downward</mat-icon>
          </button>
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
              <circle class="progress-ring-bg" stroke="rgba(0,0,0,0.06)" stroke-width="6" fill="transparent" r="50" cx="60" cy="60" />
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
  styles: []
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
  readonly isSimulated = signal<boolean>(false);
  
  // Viewfinder live data
  readonly targets = this.panoramaService.targets;
  readonly activeTarget = this.panoramaService.getActiveTarget;
  readonly currentYaw = signal<number>(0);
  readonly currentPitch = signal<number>(0);
  readonly isAligned = signal<boolean>(false);
  readonly triggerFlash = signal<boolean>(false);
  readonly guidanceDirection = signal<string>('none');

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
  private startingYaw: number | null = null;

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
    this.panoramaService.initializeTargets();
  }

  ngOnDestroy(): void {
    this.cleanupCapture();
  }

  async grantPermissions(): Promise<void> {
    try {
      const stream = await this.cameraService.startCamera();
      this.cameraPermStatus.set(true);

      const sensorOk = await this.orientationService.requestPermission();
      this.sensorPermStatus.set(sensorOk);

      if (stream && sensorOk) {
        this.isSimulated.set(false);
        this.step.set('capturing');
        setTimeout(() => this.bindVideoAndSensors(), 200);
      } else {
        this.snackBar.open('Camera or orientation sensor blocked. Launching Simulator.', 'Dismiss', { duration: 3000 });
        this.startSimulationMode();
      }
    } catch (err: any) {
      this.snackBar.open('Insecure context or blocked permissions. Launching Simulator.', 'Dismiss', { duration: 4000 });
      this.startSimulationMode();
    }
  }

  startSimulationMode(): void {
    this.isSimulated.set(true);
    this.cameraPermStatus.set(true);
    this.sensorPermStatus.set(true);
    this.step.set('capturing');
    setTimeout(() => {
      window.addEventListener('keydown', this.onKeyDownSimulation);
    }, 200);
  }

  private bindVideoAndSensors(): void {
    const video = this.videoElement()?.nativeElement;
    if (video) {
      video.srcObject = this.cameraService.stream();
    }
    window.addEventListener('deviceorientation', this.onOrientationUpdate);
  }

  private onOrientationUpdate = (event: DeviceOrientationEvent) => {
    if (this.step() !== 'capturing' || this.isSimulated()) return;

    const rawYaw = Math.round(event.alpha || 0);
    const pitch = Math.round(event.beta || 0);

    if (this.startingYaw === null) {
      this.startingYaw = rawYaw;
    }

    const yaw = (rawYaw - this.startingYaw + 360) % 360;

    this.currentYaw.set(yaw);
    this.currentPitch.set(pitch);

    const active = this.activeTarget();
    if (!active) {
      this.isAligned.set(false);
      this.guidanceDirection.set('none');
      this.guidanceText.set('Stitching virtual tour...');
      return;
    }

    const guide = this.panoramaService.getInstructions(yaw, pitch);
    this.guidanceText.set(guide.text);
    this.isAligned.set(guide.aligned);
    this.guidanceDirection.set(guide.direction);

    if (guide.aligned) {
      if (!this.alignLocked) {
        this.alignLocked = true;
        this.autoCaptureTimeout = setTimeout(() => {
          this.executeFrameCapture();
        }, 400);
      }
    } else {
      this.alignLocked = false;
      if (this.autoCaptureTimeout) {
        clearTimeout(this.autoCaptureTimeout);
        this.autoCaptureTimeout = null;
      }
    }
  };

  private onKeyDownSimulation = (event: KeyboardEvent) => {
    if (this.step() !== 'capturing' || !this.isSimulated()) return;

    if (event.key === 'ArrowLeft') {
      this.rotateSimulated(-10, 0);
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      this.rotateSimulated(10, 0);
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      this.rotateSimulated(0, 3);
      event.preventDefault();
    } else if (event.key === 'ArrowDown') {
      this.rotateSimulated(0, -3);
      event.preventDefault();
    }
  };

  rotateSimulated(dYaw: number, dPitch: number): void {
    let yaw = (this.currentYaw() + dYaw + 360) % 360;
    let pitch = Math.max(-90, Math.min(90, this.currentPitch() + dPitch));

    this.currentYaw.set(yaw);
    this.currentPitch.set(pitch);

    const active = this.activeTarget();
    if (!active) return;

    const guide = this.panoramaService.getInstructions(yaw, pitch);
    this.guidanceText.set(guide.text);
    this.isAligned.set(guide.aligned);
    this.guidanceDirection.set(guide.direction);

    if (guide.aligned) {
      if (!this.alignLocked) {
        this.alignLocked = true;
        this.autoCaptureTimeout = setTimeout(() => {
          this.executeFrameCapture();
        }, 400);
      }
    } else {
      this.alignLocked = false;
      if (this.autoCaptureTimeout) {
        clearTimeout(this.autoCaptureTimeout);
        this.autoCaptureTimeout = null;
      }
    }
  }

  private executeFrameCapture(): void {
    try {
      this.triggerFlash.set(true);
      setTimeout(() => this.triggerFlash.set(false), 120);

      if (navigator.vibrate) {
        navigator.vibrate(80);
      }

      let frameData = '';
      if (this.isSimulated()) {
        frameData = this.generateSimulatedFrame(this.currentYaw(), this.currentPitch(), this.completedCount() + 1);
      } else {
        const video = this.videoElement()?.nativeElement;
        if (video) {
          frameData = this.cameraService.captureFrame(video);
        }
      }

      this.panoramaService.completeActiveTarget(frameData);

      const completed = this.targets().filter(t => t.completed).length;
      this.completedCount.set(completed);

      if (completed === this.targets().length) {
        this.startStitching();
      } else {
        this.alignLocked = false;
        
        // Immediately sync alignment for the next active target
        const active = this.activeTarget();
        if (active) {
          const guide = this.panoramaService.getInstructions(this.currentYaw(), this.currentPitch());
          this.guidanceText.set(guide.text);
          this.isAligned.set(guide.aligned);
          this.guidanceDirection.set(guide.direction);
        } else {
          this.guidanceDirection.set('none');
        }
      }
    } catch (err) {
      console.error('Frame capture failed:', err);
      this.alignLocked = false;
    }
  }

  private generateSimulatedFrame(yaw: number, pitch: number, index: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 480);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(0.5, '#bae6fd');
      grad.addColorStop(0.51, '#cbd5e1');
      grad.addColorStop(1, '#64748b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`LandLens Virtual Tour Simulation`, 320, 200);

      ctx.fillStyle = '#0f172a';
      ctx.font = '20px sans-serif';
      ctx.fillText(`Frame #${index} | Yaw: ${yaw}° | Pitch: ${pitch}°`, 320, 260);

      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 600, 440);

      return canvas.toDataURL('image/jpeg', 0.85);
    }
    return '';
  }

  manualCapture(): void {
    this.executeFrameCapture();
  }

  onViewfinderClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (
      target.closest('.viewfinder-actions') || 
      target.closest('.hud-panel') || 
      target.closest('.simulator-hud-controls') || 
      target.closest('.compass-radar-strip')
    ) {
      return;
    }
    this.manualCapture();
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
    this.startingYaw = null;
    this.guidanceDirection.set('none');
    setTimeout(() => {
      if (this.isSimulated()) {
        this.startSimulationMode();
      } else {
        this.bindVideoAndSensors();
      }
    }, 200);
  }

  exitCapture(): void {
    this.cleanupCapture();
    this.onCancel.emit();
  }

  getDotStyle(target: CaptureTarget) {
    const yaw = this.currentYaw();
    const pitch = this.currentPitch();
    const active = this.activeTarget();
    const isActive = active?.id === target.id;

    let dYaw = target.yaw - yaw;
    if (dYaw > 180) dYaw -= 360;
    if (dYaw < -180) dYaw += 360;

    const dPitch = target.pitch - pitch;

    const fovX = 60;
    const fovY = 40;

    let x = 50 + (dYaw / (fovX / 2)) * 50;
    let y = 50 - (dPitch / (fovY / 2)) * 50;

    let isVisible = x >= 0 && x <= 100 && y >= 0 && y <= 100;

    if (isActive && !isVisible) {
      x = Math.max(5, Math.min(95, x));
      y = Math.max(5, Math.min(95, y));
      isVisible = true;
    }

    return {
      left: `${x}%`,
      top: `${y}%`,
      display: isVisible ? 'block' : 'none'
    };
  }

  isTargetClamped(target: CaptureTarget): boolean {
    const active = this.activeTarget();
    if (active?.id !== target.id) return false;

    const yaw = this.currentYaw();
    const pitch = this.currentPitch();

    let dYaw = target.yaw - yaw;
    if (dYaw > 180) dYaw -= 360;
    if (dYaw < -180) dYaw += 360;

    const dPitch = target.pitch - pitch;

    const fovX = 60;
    const fovY = 40;

    const x = 50 + (dYaw / (fovX / 2)) * 50;
    const y = 50 - (dPitch / (fovY / 2)) * 50;

    return x < 0 || x > 100 || y < 0 || y > 100;
  }

  getRadarTrackTransform(): string {
    const yaw = this.currentYaw();
    const trackWidth = 360;
    const offset = 180 - yaw;
    return `translateX(${offset}px)`;
  }

  getSimulatedSkyTransform(): string {
    const yaw = this.currentYaw();
    const pitch = this.currentPitch();
    const xOffset = yaw * -4;
    const yOffset = pitch * 3;
    return `translate(${xOffset}px, ${yOffset}px)`;
  }

  getSimulatedGroundTransform(): string {
    const yaw = this.currentYaw();
    const pitch = this.currentPitch();
    const xOffset = yaw * -4;
    const yOffset = pitch * 3;
    return `translate(${xOffset}px, ${yOffset}px)`;
  }

  private cleanupSensorsAndVideo(): void {
    window.removeEventListener('deviceorientation', this.onOrientationUpdate);
    window.removeEventListener('keydown', this.onKeyDownSimulation);
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
