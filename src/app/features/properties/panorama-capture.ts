import { Component, OnInit, OnDestroy, inject, signal, viewChild, ElementRef, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CameraService } from '../../core/services/camera.service';
import { OrientationService } from '../../core/services/orientation.service';
import { PanoramaService, CaptureTarget } from '../../core/services/panorama.service';
import { ProjectionService } from '../../core/services/projection.service';
import { StitchService } from '../../core/services/stitch.service';
import { PanoramaViewerComponent } from './panorama-viewer';
import { eulerToQuaternion, slerpQuaternions, quaternionToRotationMatrix, compensateScreenOrientation, Quaternion, Matrix3 } from '../../core/utils/camera-math';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-panorama-capture',
  standalone: true,
  imports: [
    CommonModule,
    PanoramaViewerComponent,
    MatButtonModule
  ],
  template: `
    <div class="pano-capture-overlay animate-fade-in">
      <!-- Header Bar -->
      <div class="capture-header">
        <span class="title-row">
          <span class="material-symbols-outlined logo-icon">camera_indoor</span>
          <span>360° Guided Land Capture</span>
        </span>
        <button mat-icon-button class="close-btn" (click)="exitCapture()" style="border: none; background: transparent; cursor: pointer;">
          <span class="material-symbols-outlined" style="color: #94a3b8; font-size: 24px;">close</span>
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
              <span class="material-symbols-outlined" [style.color]="cameraPermStatus() ? '#10b981' : '#f43f5e'">
                {{ cameraPermStatus() ? 'check_circle' : 'pending' }}
              </span>
              <span>Back Camera Access</span>
            </div>
            <div class="check-item">
              <span class="material-symbols-outlined" [style.color]="sensorPermStatus() ? '#10b981' : '#f43f5e'">
                {{ sensorPermStatus() ? 'check_circle' : 'pending' }}
              </span>
              <span>Device Orientation Gyro Sensors</span>
            </div>
          </div>

          <button mat-raised-button color="accent" class="grant-btn btn-interactive glow-border-green" (click)="grantPermissions()">
            Enable Sensors & Camera
          </button>
          
          <button mat-button class="simulation-btn btn-interactive" style="margin-top: 12px; color: var(--accent-primary); border: none; background: transparent; cursor: pointer;" (click)="startSimulationMode()">
            <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 4px;">terminal</span>
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
            <span class="material-symbols-outlined" style="font-size: 16px; margin-right: 4px;">terminal</span>
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
              <span *ngIf="target.completed" class="material-symbols-outlined radar-check">check</span>
              <span *ngIf="!target.completed">{{ target.id }}</span>
            </div>
          </div>
          <div class="radar-cursor"></div>
        </div>

        <!-- Dynamic Screen Flash -->
        <div class="screen-flash" [class.flash-active]="triggerFlash()"></div>

        <!-- Phone Moving Too Fast Flashing Warning Banner -->
        <div class="speed-warning-banner" *ngIf="isPhoneMovingTooFast()">
          <span class="material-symbols-outlined" style="color: #fff; font-size: 20px;">error</span>
          <span>Moving Too Fast! Hold Phone Still</span>
        </div>

        <!-- Large Floating Green Checkmark Success Overlay on capturing -->
        <div class="check-success-overlay" *ngIf="triggerCheckSuccess()">
          <span class="material-symbols-outlined scale-up-check">check_circle</span>
        </div>

        <!-- 3D Target Dots Projected on Screen - Render ONLY the single active target dot -->
        <div class="target-dots-container">
          <div class="target-dot active"
               *ngIf="activeTarget() as target"
               [ngClass]="{
                 'aligned': isAligned(),
                 'clamped': isTargetClamped(target)
               }"
               [ngStyle]="getDotStyle(target)">
            <span class="dot-inner"></span>
            <span class="dot-label">
              <span *ngIf="isAligned()" class="material-symbols-outlined green-check">check</span>
              <ng-container *ngIf="!isAligned()">
                <span *ngIf="guidanceDirection() === 'right'" class="material-symbols-outlined">arrow_forward</span>
                <span *ngIf="guidanceDirection() === 'left'" class="material-symbols-outlined">arrow_back</span>
                <span *ngIf="guidanceDirection() === 'up'" class="material-symbols-outlined">arrow_upward</span>
                <span *ngIf="guidanceDirection() === 'down'" class="material-symbols-outlined">arrow_downward</span>
              </ng-container>
            </span>
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
            <svg class="progress-ring" width="55" height="55">
              <circle class="progress-ring-bg" stroke="rgba(0,0,0,0.06)" stroke-width="4" fill="transparent" r="22" cx="27.5" cy="27.5" />
              <circle class="progress-ring-bar" 
                      stroke="var(--accent-primary)" 
                      stroke-width="4" 
                      fill="transparent" 
                      r="22" 
                      cx="27.5" 
                      cy="27.5" 
                      [attr.stroke-dasharray]="ringCircumference"
                      [attr.stroke-dashoffset]="ringDashoffset()" />
            </svg>
            <div class="progress-text">{{ completedCount() }}/{{ targets().length }}</div>
          </div>

          <div class="guidance-directions">
            <div class="hud-stat-row">
              <span class="hud-label-dim">Target:</span>
              <span class="hud-value-highlight">{{ getActiveTargetName() }}</span>
            </div>
            <div class="hud-stat-row font-small">
              <span>Captured: <strong>{{ completedCount() }}</strong></span>
              <span class="divider">|</span>
              <span>Remaining: <strong>{{ targets().length - completedCount() }}</strong></span>
              <span class="divider">|</span>
              <span>Est. Time: <strong>{{ getEstimatedTimeRemaining() }}</strong></span>
              <span class="divider">|</span>
              <span class="percent-highlight">{{ completedPercent() }}%</span>
            </div>
            <div class="hud-instruction-alert" [class.ready]="isAligned()">
              {{ isAligned() ? 'Perfect! Capture now' : (isPhoneMovingTooFast() ? 'Hold Phone Still!' : guidanceText()) }}
            </div>
          </div>
        </div>

        <!-- Simulator Rotation HUD buttons for mobile/touch users -->
        <div class="simulator-hud-controls" *ngIf="isSimulated()">
          <button type="button" class="sim-hud-btn btn-interactive" (click)="rotateSimulated(0, 3)" title="Tilt Up" style="border: none; border-radius: 50%; cursor: pointer;">
            <span class="material-symbols-outlined">arrow_upward</span>
          </button>
          <div class="middle-row" style="display: flex; gap: 4px;">
            <button type="button" class="sim-hud-btn btn-interactive" (click)="rotateSimulated(-10, 0)" title="Rotate Left" style="border: none; border-radius: 50%; cursor: pointer;">
              <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <button type="button" class="sim-hud-btn btn-interactive" (click)="rotateSimulated(10, 0)" title="Rotate Right" style="border: none; border-radius: 50%; cursor: pointer;">
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
          <button type="button" class="sim-hud-btn btn-interactive" (click)="rotateSimulated(0, -3)" title="Tilt Down" style="border: none; border-radius: 50%; cursor: pointer;">
            <span class="material-symbols-outlined">arrow_downward</span>
          </button>
        </div>

        <!-- Viewfinder Actions Footer -->
        <div class="viewfinder-actions">
          <button mat-flat-button color="warn" class="btn-interactive" (click)="retakeLast()" [disabled]="completedCount() === 0">
            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px; vertical-align: middle;">undo</span> Retake Last
          </button>
          
          <button class="manual-capture-btn btn-interactive" (click)="manualCapture()" title="Manual Capture" style="border: none; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <span class="material-symbols-outlined" style="font-size: 28px; color: #0f172a;">photo_camera</span>
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
          <h3>Generating 360° Panorama...</h3>
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
              <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px; vertical-align: middle;">{{ saving() ? 'sync' : 'cloud_upload' }}</span>
              {{ saving() ? 'Saving virtual tour...' : 'Save & Attach Tour' }}
            </button>
            <button mat-raised-button color="primary" class="btn-interactive" (click)="restartCapture()">
              <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px; vertical-align: middle;">restart_alt</span> Retake Tour
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
  private readonly projectionService = inject(ProjectionService);
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
  readonly targets = () => this.panoramaService.targets();
  readonly activeTarget = () => this.panoramaService.getActiveTarget();
  
  // Computed signal to track completed count automatically
  readonly completedCount = computed(() => this.targets().filter(t => t.completed).length);
  
  readonly currentYaw = signal<number>(0);
  readonly currentPitch = signal<number>(0);
  readonly isAligned = signal<boolean>(false);
  readonly triggerFlash = signal<boolean>(false);
  readonly triggerCheckSuccess = signal<boolean>(false);
  readonly guidanceDirection = signal<string>('none');
  readonly isPhoneMovingTooFast = signal<boolean>(false);

  // Guidance texts
  readonly guidanceText = signal<string>('Rotate to active target dot');

  // Stitching progress signals
  readonly stitchProgress = signal<number>(0);
  readonly stitchStatus = signal<string>('Preparing frame alignment...');
  readonly stitchedImageUrl = signal<string | null>(null);

  readonly saving = signal<boolean>(false);
  private alignLocked = false;
  private autoCaptureTimeout: any = null;
  private startingYaw: number | null = null;

  // Raw orientation values from events
  private rawAlpha = 0;
  private rawBeta = 0;
  private rawGamma = 0;

  // Smoothed quaternion representation
  private currentQuaternion: Quaternion = { x: 0, y: 0, z: 0, w: 1 };

  private prevYaw = 0;
  private prevPitch = 0;

  private currentRotationMatrix: Matrix3 = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];

  private animationFrameId: number | null = null;

  // Circular progress calculations
  readonly ringCircumference = 2 * Math.PI * 22; // 138.23
  readonly largeRingCircumference = 2 * Math.PI * 50; // 314.15

  ringDashoffset() {
    const total = this.targets().length || 38;
    const completed = this.completedCount();
    const ratio = completed / total;
    return this.ringCircumference * (1 - ratio);
  }

  largeRingDashoffset() {
    const ratio = this.stitchProgress() / 100;
    return this.largeRingCircumference * (1 - ratio);
  }

  completedPercent(): number {
    const total = this.targets().length || 38;
    const completed = this.completedCount();
    return Math.round((completed / total) * 100);
  }

  getEstimatedTimeRemaining(): string {
    const remaining = this.targets().length - this.completedCount();
    const secPerImage = 3; 
    const totalSec = remaining * secPerImage;
    if (totalSec <= 0) return '0s';
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  getTargetName(target: CaptureTarget): string {
    if (target.pitch === 90) return 'Top';
    if (target.pitch === -90) return 'Bottom';
    
    const yaw = (target.yaw + 360) % 360;
    
    if (yaw >= 337.5 || yaw < 22.5) return 'Front';
    if (yaw >= 22.5 && yaw < 67.5) return 'Front Right';
    if (yaw >= 67.5 && yaw < 112.5) return 'Right';
    if (yaw >= 112.5 && yaw < 157.5) return 'Back Right';
    if (yaw >= 157.5 && yaw < 202.5) return 'Back';
    if (yaw >= 202.5 && yaw < 247.5) return 'Back Left';
    if (yaw >= 247.5 && yaw < 292.5) return 'Left';
    if (yaw >= 292.5 && yaw < 337.5) return 'Front Left';
    
    return 'Front';
  }

  getActiveTargetName(): string {
    const active = this.activeTarget();
    if (!active) return 'Completed';
    return this.getTargetName(active);
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
        setTimeout(() => {
          this.bindVideoAndSensors();
          this.startRenderLoop();
        }, 200);
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
      this.startRenderLoop();
    }, 200);
  }

  private bindVideoAndSensors(): void {
    const video = this.videoElement()?.nativeElement;
    if (video) {
      video.srcObject = this.cameraService.stream();

      const stream = this.cameraService.stream();
      if (stream) {
        const track = stream.getVideoTracks()[0];
        if (track) {
          const settings = track.getSettings();
          const w = settings.width || 640;
          const h = settings.height || 480;
          this.projectionService.updateFovFromAspect(w, h);
        }
      }
    }
    window.addEventListener('deviceorientation', this.onOrientationUpdate);
  }

  private onOrientationUpdate = (event: DeviceOrientationEvent) => {
    if (this.step() !== 'capturing' || this.isSimulated()) return;

    const rawAlpha = Math.round(event.alpha || 0);
    const rawBeta = Math.round(event.beta || 0);
    const rawGamma = Math.round(event.gamma || 0);

    if (this.startingYaw === null) {
      this.startingYaw = rawAlpha;
      this.currentQuaternion = eulerToQuaternion(0, rawBeta, rawGamma);
    }

    this.rawAlpha = (rawAlpha - this.startingYaw + 360) % 360;
    this.rawBeta = rawBeta;
    this.rawGamma = rawGamma;
  };

  private startRenderLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  }

  private renderLoop = () => {
    if (this.step() !== 'capturing') return;

    // 1. Convert Euler degrees to target orientation Quaternion
    const targetQuat = eulerToQuaternion(this.rawAlpha, this.rawBeta, this.rawGamma);

    // 2. Smooth orientation via Quaternion SLERP (Slerp factor = 0.15)
    this.currentQuaternion = slerpQuaternions(this.currentQuaternion, targetQuat, 0.15);

    // 3. Derive camera rotation matrix from the smoothed Quaternion
    let matrix = quaternionToRotationMatrix(this.currentQuaternion);

    // 4. Compensate for Device Screen Orientation Angle (handling landscape views)
    const screenAngle = window.screen?.orientation?.angle || (window as any).orientation || 0;
    matrix = compensateScreenOrientation(matrix, screenAngle);
    this.currentRotationMatrix = matrix;

    // 5. Extract camera yaw & pitch from 3D camera forward vector
    const fx = -matrix[0][2];
    const fy = -matrix[1][2];
    const fz = -matrix[2][2];
    
    let yaw = Math.atan2(fx, -fz) * 180 / Math.PI;
    if (yaw < 0) yaw += 360;
    const pitch = Math.asin(fy) * 180 / Math.PI;

    this.currentYaw.set(Math.round(yaw));
    this.currentPitch.set(Math.round(pitch));

    // 6. Validate movement speed by rotation delta
    let diffYaw = yaw - this.prevYaw;
    if (diffYaw > 180) diffYaw -= 360;
    if (diffYaw < -180) diffYaw += 360;
    const diffPitch = pitch - this.prevPitch;

    const angularVelocity = Math.abs(diffYaw) + Math.abs(diffPitch);
    const tooFast = angularVelocity > 3.5;
    this.isPhoneMovingTooFast.set(tooFast);

    this.prevYaw = yaw;
    this.prevPitch = pitch;

    // 7. Process active alignment target instructions
    const active = this.activeTarget();
    if (active) {
      const guide = this.panoramaService.getInstructions(yaw, pitch);
      const angularError = this.projectionService.getAngularError(active.yaw, active.pitch, matrix);
      const isAligned = angularError <= 3.0;

      this.guidanceText.set(tooFast ? 'Hold Phone Still!' : guide.text);
      this.isAligned.set(!tooFast && isAligned);
      this.guidanceDirection.set(tooFast ? 'steady' : guide.direction);

      if (!tooFast && isAligned) {
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
    } else {
      this.isAligned.set(false);
      this.guidanceDirection.set('none');
    }

    this.animationFrameId = requestAnimationFrame(this.renderLoop);
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
    this.rawAlpha = (this.rawAlpha + dYaw + 360) % 360;
    this.rawBeta = Math.max(-90, Math.min(90, this.rawBeta + dPitch));
  }

  private executeFrameCapture(): void {
    if (this.isPhoneMovingTooFast() || (!this.isAligned() && this.alignLocked)) {
      this.alignLocked = false;
      return;
    }

    try {
      this.triggerFlash.set(true);
      setTimeout(() => this.triggerFlash.set(false), 120);

      this.triggerCheckSuccess.set(true);
      setTimeout(() => this.triggerCheckSuccess.set(false), 500);

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

      if (this.completedCount() === this.targets().length) {
        this.startStitching();
      } else {
        this.alignLocked = false;
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
    this.stitchProgress.set(0);
    this.stitchedImageUrl.set(null);
    this.step.set('capturing');
    this.alignLocked = false;
    this.startingYaw = null;
    this.guidanceDirection.set('none');
    this.rawAlpha = 0;
    this.rawBeta = 0;
    this.rawGamma = 0;
    this.currentQuaternion = { x: 0, y: 0, z: 0, w: 1 };
    setTimeout(() => {
      if (this.isSimulated()) {
        this.startSimulationMode();
      } else {
        this.bindVideoAndSensors();
        this.startRenderLoop();
      }
    }, 200);
  }

  exitCapture(): void {
    this.cleanupCapture();
    this.onCancel.emit();
  }

  getDotStyle(target: CaptureTarget) {
    const active = this.activeTarget();
    const isActive = active?.id === target.id;
    
    // Delegate projection to the dedicated math-based ProjectionService
    const pt = this.projectionService.projectTarget(
      target.yaw,
      target.pitch,
      this.currentRotationMatrix,
      isActive
    );

    // Apply the user's opacity/visibility changes to keep the active target always visible (even offscreen clamped)
    return {
      left: `${pt.x}%`,
      top: `${pt.y}%`,
      opacity: pt.isVisible ? '1' : '0.5',
      visibility: 'visible'
    };
  }

  isTargetClamped(target: CaptureTarget): boolean {
    const active = this.activeTarget();
    if (active?.id !== target.id) return false;

    const pt = this.projectionService.projectTarget(
      target.yaw,
      target.pitch,
      this.currentRotationMatrix,
      true
    );

    return pt.isClamped;
  }

  getRadarTrackTransform(): string {
    const yaw = this.currentYaw();
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
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
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
