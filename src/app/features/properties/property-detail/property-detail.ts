import { Component, OnInit, OnDestroy, inject, signal, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PropertyService, Property, PropertyImage, PropertyVideo, PropertyDocument } from '../../../core/services/property.service';
import { VerificationService, AIVerificationReport, TimelineEntry } from '../../../core/services/verification.service';
import { FraudService } from '../../../core/services/fraud.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { Viewer } from '@photo-sphere-viewer/core';
import { HttpClient } from '@angular/common/http';
import mapboxgl from 'mapbox-gl';

@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="property-detail" *ngIf="property() as item">
      <!-- Top Detail Header -->
      <div class="detail-header-panel glass-panel">
        <div class="header-info">
          <button mat-icon-button routerLink="/dashboard" class="back-btn"><mat-icon>arrow_back</mat-icon></button>
          <div>
            <h1 class="glow-text-green">{{ item.title }}</h1>
            <p class="address"><span class="material-symbols-outlined">location_on</span> {{ item.address }}</p>
          </div>
        </div>
        <div class="header-actions">
          <span class="badge" [ngClass]="{
            'badge-approved': item.status === 'APPROVED',
            'badge-pending-ai': item.status === 'PENDING_AI',
            'badge-pending-govt': item.status === 'PENDING_GOVT',
            'badge-rejected': item.status === 'REJECTED'
          }">{{ item.status }}</span>

          <!-- Buyer Bookmark toggle -->
          <button mat-raised-button 
                  *ngIf="userRole() === 'BUYER'" 
                  [color]="isBookmarked() ? 'warn' : 'primary'"
                  (click)="toggleBookmark()">
            <mat-icon>{{ isBookmarked() ? 'bookmark' : 'bookmark_border' }}</mat-icon>
            {{ isBookmarked() ? 'Bookmarked' : 'Bookmark' }}
          </button>
        </div>
      </div>

      <div class="detail-grid">
        <!-- Left Column: Gallery, 360°, Map -->
        <div class="left-column">
          <!-- Gallery -->
          <div class="gallery-wrapper glass-panel">
            <div class="active-image" [style.background-image]="'url(' + activeMediaUrl() + ')'">
              <span class="media-badge" *ngIf="isViewingVideo()">Video Walkthrough</span>
            </div>
            <div class="thumbnails-row">
              <div class="thumb" 
                   *ngFor="let img of images()" 
                   [style.background-image]="'url(' + img.imageUrl + ')'"
                   [class.active]="activeMediaUrl() === img.imageUrl"
                   (click)="setActiveMedia(img.imageUrl, false)">
              </div>
              <div class="thumb video-thumb" 
                   *ngFor="let v of videos()" 
                   [style.background-image]="'url(' + (v.thumbnailUrl || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=200') + ')'"
                   [class.active]="activeMediaUrl() === v.videoUrl"
                   (click)="setActiveMedia(v.videoUrl, true)">
                <span class="material-symbols-outlined play-icon">play_circle</span>
              </div>
            </div>
          </div>

          <!-- 360 Panorama Viewer -->
          <div class="pano-wrapper glass-panel">
            <div class="pano-header-row">
              <h3>360° Interactive Boundary Panorama</h3>
              <!-- Provider Actions -->
              <div class="pano-actions" *ngIf="userRole() === 'PROVIDER'">
                <input type="file" #detailPanoInput (change)="upload360Image($event)" accept="image/*" style="display: none" />
                <button mat-raised-button color="accent" class="btn-interactive" [disabled]="uploading360()" (click)="detailPanoInput.click()">
                  <mat-icon>camera_360</mat-icon>
                  {{ uploading360() ? 'Uploading...' : (item.threeSixtyImageUrl ? 'Replace 360° Tour' : 'Add 360° Tour') }}
                </button>
                <button mat-icon-button color="warn" class="btn-interactive" *ngIf="item.threeSixtyImageUrl" (click)="remove360Image()">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
            
            <div *ngIf="item.threeSixtyImageUrl" #panoContainer class="pano-container animate-fade-in"></div>
            
            <div *ngIf="!item.threeSixtyImageUrl" class="empty-state pano-empty">
              <span class="material-symbols-outlined">camera_360</span>
              <p>No 360° virtual tour uploaded for this land listing yet.</p>
              <p class="guide-text" *ngIf="userRole() === 'PROVIDER'">
                💡 <strong>Seller's Guide:</strong> Upload an equirectangular panorama (2:1 aspect ratio) to let buyers explore the property boundaries. 
                <a href="https://photo-sphere-viewer.js.org/" target="_blank" class="learn-link">Learn how to capture a 360° image</a>.
              </p>
            </div>
          </div>

          <!-- Static Coordinates Map -->
          <div class="map-wrapper glass-panel">
            <h3>Registry Coordinates Location</h3>
            <p class="coords">Latitude: {{ item.latitude }} | Longitude: {{ item.longitude }}</p>
            <div #mapContainer class="map-container"></div>
          </div>
        </div>

        <!-- Right Column: Verification, OCR, Buyer Actions, Timeline -->
        <div class="right-column">
          <!-- AI Trust Scores -->
          <div class="ai-report-panel glass-panel" *ngIf="aiReport() as ai">
            <div class="ai-header">
              <h3>LandLens AI Trust Audit</h3>
              <div class="gauge-value" [ngClass]="{
                'success-text': ai.aiTrustScore >= 80,
                'gold-text': ai.aiTrustScore < 80 && ai.aiTrustScore >= 50,
                'error-text': ai.aiTrustScore < 50
              }">{{ ai.aiTrustScore }}%</div>
            </div>
            <p class="summary">"{{ ai.summary }}"</p>
            <div class="scores-list">
              <div class="score-row">
                <span>Deed Alteration Risk:</span>
                <span class="score-val" [class.danger]="ai.forgeryScore > 10">{{ ai.forgeryScore }}%</span>
              </div>
              <div class="score-row">
                <span>Overlapping Claims Rate:</span>
                <span class="score-val" [class.danger]="ai.duplicateScore > 10">{{ ai.duplicateScore }}%</span>
              </div>
              <div class="score-row">
                <span>Overall Trust Confidence:</span>
                <span class="score-val">{{ ai.confidence }}%</span>
              </div>
              <div class="score-row">
                <span>Land Deed Match:</span>
                <span class="score-val" [class.success]="ai.ownershipMatch">{{ ai.ownershipMatch ? 'VERIFIED' : 'CONFLICT' }}</span>
              </div>
            </div>
          </div>

          <!-- Government Inspector Audit actions (Officers Only) -->
          <div class="govt-action-panel glass-panel" *ngIf="userRole() === 'GOVERNMENT_OFFICER' && item.status === 'PENDING_GOVT'">
            <h3>Submit Government Verification</h3>
            <p>Review OCR text and verify registry files before marking approved.</p>
            <mat-form-field appearance="fill">
              <mat-label>Verification Remarks</mat-label>
              <textarea matInput [(ngModel)]="govtRemarks" rows="3" placeholder="Verified bounds. Meets village survey passbook boundaries..."></textarea>
            </mat-form-field>
            <div class="btn-row">
              <button mat-raised-button color="accent" class="glow-border-green" [disabled]="!govtRemarks" (click)="verifyGovt('APPROVED')">
                Approve Listing
              </button>
              <button mat-raised-button color="warn" class="glow-border-danger" [disabled]="!govtRemarks" (click)="verifyGovt('REJECTED')">
                Reject Listing
              </button>
            </div>
          </div>

          <!-- Attached Legal Deeds & OCR -->
          <div class="docs-panel glass-panel">
            <h3>Registry Deed Passbooks</h3>
            <div class="docs-list" *ngIf="documents().length > 0; else noDocs">
              <div class="doc-card glass-panel" *ngFor="let doc of documents()">
                <div class="doc-header">
                  <div class="doc-title-row">
                    <span class="material-symbols-outlined icon">description</span>
                    <h5>{{ doc.documentType }}</h5>
                  </div>
                  <a [href]="doc.fileUrl" target="_blank" class="download-link">View File</a>
                </div>
                <div class="doc-ocr">
                  <div class="ocr-status-row">
                    <span>OCR Scan: </span>
                    <span class="badge" [ngClass]="{
                      'badge-approved': doc.ocrStatus === 'COMPLETED',
                      'badge-pending': doc.ocrStatus === 'PENDING',
                      'badge-rejected': doc.ocrStatus === 'FAILED'
                    }">{{ doc.ocrStatus }}</span>
                  </div>
                  <div class="ocr-status-row">
                    <span>Deed Ownership Check: </span>
                    <span class="badge" [ngClass]="{
                      'badge-approved': doc.verificationStatus === 'VERIFIED',
                      'badge-pending': doc.verificationStatus === 'UNVERIFIED',
                      'badge-rejected': doc.verificationStatus === 'REJECTED'
                    }">{{ doc.verificationStatus }}</span>
                  </div>
                  <div class="ocr-text" *ngIf="doc.rawText">
                    <h6>Extracted Passbook Content:</h6>
                    <pre>{{ doc.rawText }}</pre>
                  </div>
                </div>
              </div>
            </div>
            <ng-template #noDocs>
              <div class="empty-state mini">
                <p>No registry files attached.</p>
              </div>
            </ng-template>
          </div>

          <!-- Buyer Site tours & Fraud complaint forms -->
          <div class="buyer-actions-panel glass-panel" *ngIf="userRole() === 'BUYER' && item.status === 'APPROVED'">
            <!-- Schedule tour visit -->
            <div class="action-sub-panel">
              <h4>Book guided Site Visit</h4>
              <p>Schedule site tours. Select date and time.</p>
              <div class="visit-form">
                <mat-form-field appearance="fill">
                  <mat-label>Visit Date</mat-label>
                  <input matInput type="date" [(ngModel)]="visitDate" />
                </mat-form-field>
                <mat-form-field appearance="fill">
                  <mat-label>Visit Time</mat-label>
                  <input matInput type="time" [(ngModel)]="visitTime" />
                </mat-form-field>
                <button mat-raised-button color="accent" [disabled]="!visitDate || !visitTime" (click)="scheduleVisit()">
                  Book Visit
                </button>
              </div>
            </div>

            <hr class="panel-divider" />

            <!-- Report Dispute -->
            <div class="action-sub-panel">
              <h4 class="danger-header">File Fraud / Overlapping Dispute</h4>
              <p>Submit overlapping bounds claim to registry officers.</p>
              <div class="fraud-form">
                <mat-form-field appearance="fill">
                  <mat-label>Dispute Reason</mat-label>
                  <input matInput [(ngModel)]="fraudReason" placeholder="e.g. Overlapping boundaries, altered deed" />
                </mat-form-field>
                <mat-form-field appearance="fill">
                  <mat-label>Details Description</mat-label>
                  <textarea matInput [(ngModel)]="fraudDesc" rows="2" placeholder="Describe the boundary clashes..."></textarea>
                </mat-form-field>
                <button mat-raised-button color="warn" [disabled]="!fraudReason || !fraudDesc" (click)="reportFraud()">
                  Submit Dispute Report
                </button>
              </div>
            </div>
          </div>

          <!-- Verification Timeline Logs -->
          <div class="timeline-panel glass-panel">
            <h3>Deed Registration Audit Logs</h3>
            <div class="timeline" *ngIf="timeline().length > 0; else noTimeline">
              <div class="timeline-item" *ngFor="let log of timeline()">
                <span class="dot"></span>
                <div class="timeline-content">
                  <div class="log-time">{{ log.timestamp | date:'short' }}</div>
                  <div class="log-action">{{ log.action }}</div>
                  <p class="log-remarks" *ngIf="log.remarks">"{{ log.remarks }}"</p>
                </div>
              </div>
            </div>
            <ng-template #noTimeline>
              <div class="empty-state mini">
                <p>No timeline entries logged.</p>
              </div>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .property-detail {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      min-height: calc(100vh - 70px);
      box-sizing: border-box;
      @media(max-width: 768px) {
        padding: 12px;
      }
    }
    .detail-header-panel {
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      .header-info {
        display: flex;
        align-items: center;
        gap: 16px;
        h1 { margin: 0 0 4px 0; font-size: 1.8rem; font-family: var(--font-display); }
        .address { margin: 0; font-size: 0.9rem; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; span { font-size: 1.1rem; color: var(--accent-info); } }
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .back-btn { color: var(--text-secondary); }
      @media(max-width: 768px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
        .header-actions { width: 100%; justify-content: space-between; }
      }
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 420px;
      gap: 24px;
      align-items: start;
      @media(max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }
    .left-column, .right-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .gallery-wrapper {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .active-image {
      height: 380px;
      width: 100%;
      background-size: cover;
      background-position: center;
      border-radius: 12px;
      display: flex;
      align-items: flex-start;
      padding: 16px;
      position: relative;
    }
    .media-badge {
      background-color: rgba(2, 132, 199, 0.85);
      backdrop-filter: var(--glass-blur);
      color: var(--text-primary);
      padding: 6px 12px;
      font-size: 0.75rem;
      border-radius: 6px;
      font-weight: 600;
    }
    .thumbnails-row {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 8px;
      .thumb {
        width: 70px;
        height: 70px;
        border-radius: 8px;
        background-size: cover;
        background-position: center;
        border: 2px solid transparent;
        cursor: pointer;
        transition: var(--transition-fast);
        &.active { border-color: var(--accent-primary); }
        &.video-thumb {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          &::before { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,0.3); border-radius: 6px; }
          .play-icon { font-size: 1.5rem; color: #fff; z-index: 10; }
        }
      }
    }
    .pano-wrapper, .map-wrapper {
      padding: 20px;
      h3 { font-family: var(--font-display); margin-bottom: 12px; }
      .coords { font-size: 0.8rem; color: var(--text-muted); margin: 0 0 12px 0; }
    }
    .pano-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      h3 { margin: 0; }
    }
    .pano-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .pano-container {
      height: 320px;
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
    }
    .pano-empty {
      padding: 30px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 12px;
      border: 1px dashed var(--border-color);
      border-radius: 12px;
      background: var(--bg-secondary);
      span { font-size: 3rem; color: var(--text-muted); }
      p { margin: 0; }
      .guide-text {
        font-size: 0.8rem;
        color: var(--text-secondary);
        max-width: 500px;
        margin-top: 10px;
        line-height: 1.4;
      }
      .learn-link {
        color: var(--accent-info);
        text-decoration: underline;
        font-weight: 600;
      }
    }
    .map-container {
      height: 280px;
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
    }
    .ai-report-panel {
      padding: 20px;
      h3 { font-family: var(--font-display); margin: 0; }
    }
    .ai-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      .gauge-value {
        font-size: 2.2rem;
        font-weight: 800;
        font-family: var(--font-display);
        &.success-text { color: var(--accent-primary); text-shadow: 0 0 10px var(--glow-green); }
        &.gold-text { color: var(--accent-secondary); text-shadow: 0 0 10px var(--glow-gold); }
        &.error-text { color: var(--accent-danger); text-shadow: 0 0 10px var(--glow-danger); }
      }
    }
    .summary { font-size: 0.85rem; line-height: 1.4; color: var(--text-secondary); font-style: italic; background: rgba(0,0,0,0.15); padding: 12px; border-radius: 8px; margin: 0 0 16px 0; }
    .scores-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 0.85rem;
    }
    .score-row {
      display: flex;
      justify-content: space-between;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 6px;
      .score-val { font-weight: 600; color: var(--text-primary); }
      .score-val.danger { color: var(--accent-danger); }
      .score-val.success { color: var(--accent-primary); }
    }
    .govt-action-panel {
      padding: 20px;
      h3 { font-family: var(--font-display); margin-bottom: 12px; }
      p { font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 16px 0; }
      .btn-row { display: flex; gap: 12px; margin-top: 12px; button { flex: 1; } }
    }
    .docs-panel {
      padding: 20px;
      h3 { font-family: var(--font-display); margin-bottom: 16px; }
    }
    .docs-list { display: flex; flex-direction: column; gap: 12px; }
    .doc-card {
      padding: 12px;
      border: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .doc-title-row { display: flex; align-items: center; gap: 6px; h5 { margin: 0; font-size: 0.9rem; } .icon { color: var(--accent-info); } }
      .download-link { font-size: 0.8rem; color: var(--accent-info); }
    }
    .doc-ocr {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--text-secondary);
      .ocr-status-row { display: flex; align-items: center; justify-content: space-between; }
      .ocr-text {
        margin-top: 8px;
        h6 { margin: 0 0 4px 0; font-size: 0.75rem; }
        pre { background: #000; padding: 8px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; margin: 0; font-size: 0.7rem; max-height: 100px; overflow-y: auto; color: var(--text-primary); }
      }
    }
    .buyer-actions-panel {
      padding: 20px;
    }
    .action-sub-panel {
      h4 { margin-top: 0; font-family: var(--font-display); }
      .danger-header { color: var(--accent-danger); }
      p { font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 12px 0; }
      .visit-form, .fraud-form { display: flex; flex-direction: column; gap: 12px; button { align-self: flex-end; } }
    }
    .panel-divider { border: none; border-top: 1px solid var(--border-color); margin: 20px 0; }
    .timeline-panel {
      padding: 20px;
      h3 { font-family: var(--font-display); margin-bottom: 16px; }
    }
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
      padding-left: 16px;
      &::before { content: ''; position: absolute; left: 4px; top: 8px; bottom: 8px; width: 2px; background: var(--border-color); }
    }
    .timeline-item {
      position: relative;
      .dot { position: absolute; left: -16px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background-color: var(--accent-info); border: 2px solid var(--bg-primary); }
      .timeline-content {
        .log-time { font-size: 0.7rem; color: var(--text-muted); }
        .log-action { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
        .log-remarks { margin: 4px 0 0 0; font-size: 0.75rem; color: var(--text-secondary); font-style: italic; }
      }
      &:first-child .dot { background-color: var(--accent-primary); }
    }
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: var(--text-muted);
      font-size: 0.8rem;
      &.mini { padding: 12px 0; }
    }
  `,
})
export class PropertyDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly propertyService = inject(PropertyService);
  private readonly verificationService = inject(VerificationService);
  private readonly fraudService = inject(FraudService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly http = inject(HttpClient);

  readonly uploading360 = signal<boolean>(false);

  private readonly mapContainer = viewChild<ElementRef>('mapContainer');
  private readonly panoContainer = viewChild<ElementRef>('panoContainer');

  readonly property = signal<Property | null>(null);
  readonly images = signal<PropertyImage[]>([]);
  readonly videos = signal<PropertyVideo[]>([]);
  readonly documents = signal<PropertyDocument[]>([]);
  readonly aiReport = signal<AIVerificationReport | null>(null);
  readonly timeline = signal<TimelineEntry[]>([]);
  
  readonly userRole = signal<string | null>(null);
  readonly isBookmarked = signal<boolean>(false);
  readonly activeMediaUrl = signal<string>('');
  readonly isViewingVideo = signal<boolean>(false);

  // Government action
  govtRemarks = '';

  // Buyer actions
  visitDate = '';
  visitTime = '';
  fraudReason = '';
  fraudDesc = '';

  private map: mapboxgl.Map | null = null;
  private marker: mapboxgl.Marker | null = null;
  private panoViewer: Viewer | null = null;

  ngOnInit(): void {
    this.userRole.set(this.authService.getUserRole());
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadPropertyDetails(id);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
    if (this.panoViewer) this.panoViewer.destroy();
  }

  loadPropertyDetails(id: string): void {
    this.propertyService.getPropertyById(id).subscribe({
      next: (res) => {
        this.property.set(res);
        this.loadMedia(id);
        this.loadAIVerification(id);
        this.loadTimeline(id);
        
        // Setup Mapbox static coordinate view
        setTimeout(() => {
          this.initMap(res.longitude, res.latitude);
          this.initPanorama(res.threeSixtyImageUrl);
        }, 100);
      },
    });

    if (this.userRole() === 'BUYER') {
      this.propertyService.getSavedProperties().subscribe({
        next: (saved) => {
          const matched = (saved || []).some((p) => p.id === id);
          this.isBookmarked.set(matched);
        },
      });
    }
  }

  loadMedia(propertyId: string): void {
    this.propertyService.getImages(propertyId).subscribe({
      next: (res) => {
        this.images.set(res || []);
        if (res && res.length > 0) {
          this.activeMediaUrl.set(res[0].imageUrl);
        }
      },
    });

    this.propertyService.getVideos(propertyId).subscribe({
      next: (res) => {
        this.videos.set(res || []);
      },
    });

    this.propertyService.getDocuments(propertyId).subscribe({
      next: (res) => {
        this.documents.set(res || []);
      },
    });
  }

  loadAIVerification(propertyId: string): void {
    this.verificationService.getAIVerification(propertyId).subscribe({
      next: (res) => {
        this.aiReport.set(res);
      },
      error: () => {
        this.aiReport.set(null);
      },
    });
  }

  loadTimeline(propertyId: string): void {
    this.verificationService.getTimeline(propertyId).subscribe({
      next: (res) => {
        this.timeline.set(res || []);
      },
    });
  }

  setActiveMedia(url: string, isVideo: boolean): void {
    this.activeMediaUrl.set(url);
    this.isViewingVideo.set(isVideo);
  }

  toggleBookmark(): void {
    const prop = this.property();
    if (!prop) return;

    if (this.isBookmarked()) {
      this.propertyService.unsaveProperty(prop.id).subscribe({
        next: () => {
          this.isBookmarked.set(false);
          this.snackBar.open('Removed from watchlist bookmarks', 'Dismiss', { duration: 3000 });
        },
      });
    } else {
      this.propertyService.saveProperty(prop.id).subscribe({
        next: () => {
          this.isBookmarked.set(true);
          this.snackBar.open('Saved to watchlist bookmarks', 'Dismiss', { duration: 3000 });
        },
      });
    }
  }

  verifyGovt(status: 'APPROVED' | 'REJECTED'): void {
    const prop = this.property();
    if (!prop || !this.govtRemarks) return;

    this.verificationService.submitGovernmentVerify(prop.id, {
      status: status,
      remarks: this.govtRemarks,
    }).subscribe({
      next: () => {
        this.snackBar.open(`Property status set to: ${status}`, 'Dismiss', { duration: 3000 });
        this.govtRemarks = '';
        this.loadPropertyDetails(prop.id);
      },
    });
  }

  scheduleVisit(): void {
    const prop = this.property();
    if (!prop || !this.visitDate || !this.visitTime) return;

    // Convert time format HH:MM to HH:MM:00
    const timeFull = this.visitTime.length === 5 ? `${this.visitTime}:00` : this.visitTime;

    this.propertyService.scheduleVisit(prop.id, {
      visitDate: this.visitDate,
      visitTime: timeFull,
    }).subscribe({
      next: () => {
        this.snackBar.open('Site visit tour request sent to seller!', 'Dismiss', { duration: 3000 });
        this.visitDate = '';
        this.visitTime = '';
      },
      error: () => {
        this.snackBar.open('Error scheduling guided visit tour.', 'Dismiss', { duration: 3000 });
      },
    });
  }

  reportFraud(): void {
    const prop = this.property();
    if (!prop || !this.fraudReason || !this.fraudDesc) return;

    this.fraudService.reportFraud(prop.id, {
      reason: this.fraudReason,
      description: this.fraudDesc,
    }).subscribe({
      next: () => {
        this.snackBar.open('Dispute report filed successfully. Officer review assigned.', 'Dismiss', { duration: 4000 });
        this.fraudReason = '';
        this.fraudDesc = '';
        this.loadPropertyDetails(prop.id);
      },
    });
  }

  private initMap(lng: number, lat: number): void {
    const container = this.mapContainer()?.nativeElement;
    if (!container || this.map) return;

    (mapboxgl as any).accessToken = environment.mapboxToken;
    this.map = new mapboxgl.Map({
      container: container,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [lng, lat],
      zoom: 13,
    });

    this.map.addControl(new mapboxgl.NavigationControl());

    this.marker = new mapboxgl.Marker()
      .setLngLat([lng, lat])
      .addTo(this.map);
  }

  private initPanorama(url?: string): void {
    const container = this.panoContainer()?.nativeElement;
    if (!container || !url || this.panoViewer) return;

    try {
      this.panoViewer = new Viewer({
        container: container,
        panorama: url,
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
    } catch (e) {
      console.warn('Error loading photo-sphere panorama viewer', e);
    }
  }

  upload360Image(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    const prop = this.property();
    if (!file || !prop) return;

    this.uploading360.set(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', environment.cloudinaryUploadPreset);

    this.http.post<any>(`https://api.cloudinary.com/v1_1/${environment.cloudinaryCloudName}/upload`, formData)
      .subscribe({
        next: (res) => {
          const secureUrl = res.secure_url;
          this.updatePropertyPanorama(prop.id, secureUrl);
        },
        error: () => {
          const nameClean = file.name.replace(/\s+/g, '_');
          const fallbackUrl = `http://storage.landlens.com/panoramas/${nameClean}`;
          this.snackBar.open('Direct Cloudinary endpoint failed. Mocking upload url.', 'Dismiss', { duration: 3000 });
          this.updatePropertyPanorama(prop.id, fallbackUrl);
        }
      });
  }

  remove360Image(): void {
    const prop = this.property();
    if (!prop) return;
    this.uploading360.set(true);
    this.updatePropertyPanorama(prop.id, null);
  }

  private updatePropertyPanorama(id: string, url: string | null): void {
    this.propertyService.updateProperty(id, { threeSixtyImageUrl: url || '' }).subscribe({
      next: (updated) => {
        this.uploading360.set(false);
        this.snackBar.open(url ? '360° Panorama uploaded successfully!' : '360° Panorama removed successfully.', 'Dismiss', { duration: 3000 });
        this.property.set(updated);
        
        // Re-initialize viewer
        if (this.panoViewer) {
          this.panoViewer.destroy();
          this.panoViewer = null;
        }
        if (updated.threeSixtyImageUrl) {
          setTimeout(() => {
            this.initPanorama(updated.threeSixtyImageUrl);
          }, 100);
        }
      },
      error: () => {
        this.uploading360.set(false);
        this.snackBar.open('Failed to update 360° image on property registry.', 'Dismiss', { duration: 3000 });
      }
    });
  }
}
