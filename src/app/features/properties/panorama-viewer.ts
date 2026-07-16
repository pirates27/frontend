import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, viewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Viewer } from '@photo-sphere-viewer/core';

@Component({
  selector: 'app-panorama-viewer',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="pano-viewer-container">
      <div *ngIf="!panoramaUrl" class="empty-state">
        <span class="material-symbols-outlined">panorama</span>
        <p>No panorama image loaded.</p>
      </div>
      <div [hidden]="!panoramaUrl" #panoContainer class="pano-container"></div>
      
      <!-- Gyroscope toggle overlay button -->
      <button *ngIf="panoramaUrl" mat-icon-button class="gyro-toggle-btn" 
              [class.active]="gyroEnabled()" (click)="toggleGyro()" title="Toggle Gyroscope Mode">
        <mat-icon>{{ gyroEnabled() ? 'screen_rotation' : 'screen_lock_rotation' }}</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .pano-viewer-container {
      width: 100%;
      height: 100%;
      position: relative;
      background: #0f172a;
      border-radius: 12px;
      overflow: hidden;
    }
    .pano-container {
      width: 100%;
      height: 100%;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      color: #64748b;
      gap: 12px;
      span { font-size: 3rem; }
      p { margin: 0; font-size: 0.9rem; }
    }
    .gyro-toggle-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 100;
      background: rgba(15, 23, 42, 0.75);
      color: #f8fafc !important;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &.active {
        background: var(--accent-primary) !important;
        border-color: var(--accent-primary) !important;
        color: #fff !important;
        box-shadow: 0 0 10px var(--accent-primary);
      }
    }
  `]
})
export class PanoramaViewerComponent implements OnInit, OnDestroy, OnChanges {
  @Input() panoramaUrl: string | null = null;

  private readonly panoContainer = viewChild<ElementRef>('panoContainer');
  private viewer: Viewer | null = null;
  readonly gyroEnabled = signal<boolean>(false);

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['panoramaUrl'] && this.panoramaUrl) {
      setTimeout(() => this.initViewer(), 100);
    }
  }

  ngOnDestroy(): void {
    this.destroyViewer();
    this.disableGyro();
  }

  private destroyViewer(): void {
    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }
  }

  private initViewer(): void {
    this.destroyViewer();

    const container = this.panoContainer()?.nativeElement;
    if (!container || !this.panoramaUrl) return;

    try {
      this.viewer = new Viewer({
        container: container,
        panorama: this.panoramaUrl,
        navbar: [
          'zoomOut',
          'zoomIn',
          'moveLeft',
          'moveRight',
          'moveUp',
          'moveDown',
          'fullscreen',
        ],
      });
    } catch (err) {
      console.error('Failed to initialize Photo Sphere Viewer:', err);
    }
  }

  toggleGyro(): void {
    if (this.gyroEnabled()) {
      this.disableGyro();
    } else {
      this.enableGyro();
    }
  }

  private enableGyro(): void {
    this.gyroEnabled.set(true);
    window.addEventListener('deviceorientation', this.onGyroUpdate);
  }

  private disableGyro(): void {
    this.gyroEnabled.set(false);
    window.removeEventListener('deviceorientation', this.onGyroUpdate);
  }

  private onGyroUpdate = (event: DeviceOrientationEvent) => {
    if (!this.viewer || !this.gyroEnabled()) return;
    const alpha = event.alpha || 0;
    const beta = event.beta || 0;
    
    // Map absolute device orientation coordinates to spherical yaw/pitch (in radians)
    const yawVal = -alpha * (Math.PI / 180);
    const pitchVal = (beta - 90) * (Math.PI / 180);
    
    this.viewer.rotate({ yaw: yawVal, pitch: pitchVal });
  };
}
