import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Viewer } from '@photo-sphere-viewer/core';

@Component({
  selector: 'app-panorama-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pano-viewer-container">
      <div *ngIf="!panoramaUrl" class="empty-state">
        <span class="material-symbols-outlined">panorama</span>
        <p>No panorama image loaded.</p>
      </div>
      <div [hidden]="!panoramaUrl" #panoContainer class="pano-container"></div>
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
  `]
})
export class PanoramaViewerComponent implements OnInit, OnDestroy, OnChanges {
  @Input() panoramaUrl: string | null = null;

  private readonly panoContainer = viewChild<ElementRef>('panoContainer');
  private viewer: Viewer | null = null;

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['panoramaUrl'] && this.panoramaUrl) {
      setTimeout(() => this.initViewer(), 100);
    }
  }

  ngOnDestroy(): void {
    this.destroyViewer();
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
}
