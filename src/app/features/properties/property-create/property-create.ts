import { Component, OnInit, OnDestroy, inject, signal, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { PropertyService, Property } from '../../../core/services/property.service';
import { environment } from '../../../../environments/environment';
import { PanoramaCaptureComponent } from '../panorama-capture';
import { PanoramaViewerComponent } from '../panorama-viewer';
import mapboxgl from 'mapbox-gl';

@Component({
  selector: 'app-property-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    PanoramaCaptureComponent,
    PanoramaViewerComponent,
  ],
  template: `
    <div class="property-create-container">
      <div class="glass-panel create-card">
        <div class="header-row">
          <button mat-icon-button routerLink="/dashboard" class="back-btn"><mat-icon>arrow_back</mat-icon></button>
          <h2>Register New Land Property</h2>
        </div>

        <mat-stepper linear #stepper (selectionChange)="onStepSelectionChange($event)" class="steps-stepper">
          <!-- Step 1: Basic Details -->
          <mat-step [stepControl]="detailsForm" label="Basic Details">
            <form [formGroup]="detailsForm" class="step-form">
              <mat-form-field appearance="fill">
                <mat-label>Property Title</mat-label>
                <input matInput formControlName="title" placeholder="e.g. Premium Agriculture Plot" required />
              </mat-form-field>

              <div class="grid-2">
                <mat-form-field appearance="fill">
                  <mat-label>Category</mat-label>
                  <mat-select formControlName="category" required>
                    <mat-option value="AGRICULTURAL">Agricultural</mat-option>
                    <mat-option value="RESIDENTIAL">Residential</mat-option>
                    <mat-option value="COMMERCIAL">Commercial</mat-option>
                    <mat-option value="INDUSTRIAL">Industrial</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="fill">
                  <mat-label>Area (in Acres)</mat-label>
                  <input matInput type="number" step="0.01" formControlName="area" placeholder="e.g. 2.5" required />
                </mat-form-field>
              </div>

              <div class="grid-2">
                <mat-form-field appearance="fill">
                  <mat-label>Price (₹)</mat-label>
                  <input matInput type="number" formControlName="price" placeholder="e.g. 4500000" required />
                </mat-form-field>

                <mat-form-field appearance="fill">
                  <mat-label>Survey Number</mat-label>
                  <input matInput formControlName="surveyNumber" placeholder="e.g. 45-A/12" required />
                </mat-form-field>
              </div>

              <mat-form-field appearance="fill">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="4" placeholder="Fertile land, clean title bounds..." required></textarea>
              </mat-form-field>

              <div class="actions">
                <span></span>
                <button mat-raised-button color="primary" class="btn-interactive" [disabled]="detailsForm.invalid" matStepperNext>
                  Next: Address & Map
                </button>
              </div>
            </form>
          </mat-step>

          <!-- Step 2: Location Map -->
          <mat-step [stepControl]="locationForm" label="Address & Location">
            <form [formGroup]="locationForm" class="step-form">
              <mat-form-field appearance="fill">
                <mat-label>Full Address</mat-label>
                <input matInput formControlName="address" placeholder="Bypass Road, Tenali Rural" required />
              </mat-form-field>

              <div class="grid-3">
                <mat-form-field appearance="fill">
                  <mat-label>Village</mat-label>
                  <input matInput formControlName="village" placeholder="Tenali Rural" required />
                </mat-form-field>

                <mat-form-field appearance="fill">
                  <mat-label>District</mat-label>
                  <input matInput formControlName="district" placeholder="Guntur" required />
                </mat-form-field>

                <mat-form-field appearance="fill">
                  <mat-label>State</mat-label>
                  <input matInput formControlName="state" placeholder="Andhra Pradesh" required />
                </mat-form-field>
              </div>

              <div class="grid-3">
                <mat-form-field appearance="fill">
                  <mat-label>Pincode</mat-label>
                  <input matInput formControlName="pincode" placeholder="522201" required />
                </mat-form-field>

                <mat-form-field appearance="fill">
                  <mat-label>Latitude</mat-label>
                  <input matInput type="number" formControlName="latitude" readonly required />
                </mat-form-field>

                <mat-form-field appearance="fill">
                  <mat-label>Longitude</mat-label>
                  <input matInput type="number" formControlName="longitude" readonly required />
                </mat-form-field>
              </div>

              <div class="map-label">Drag the red pin to set the exact coordinates of your land boundary:</div>
              <div class="map-wrapper glass-panel">
                <div #mapContainer class="map-container"></div>
              </div>

              <div class="actions">
                <button mat-button class="btn-interactive" matStepperPrevious>Back</button>
                <button mat-raised-button color="primary" class="btn-interactive" [disabled]="locationForm.invalid" matStepperNext>
                  Next: Upload Media
                </button>
              </div>
            </form>
          </mat-step>

          <!-- Step 3: Media Upload -->
          <mat-step label="Media Files">
            <div class="step-form">
              <div class="upload-section glass-panel">
                <h4>Regular Gallery Image</h4>
                <p>Upload property images. You can select multiple.</p>
                <input type="file" #imageInput (change)="uploadMedia($event, 'image')" accept="image/*" style="display: none" />
                <button mat-raised-button color="accent" class="btn-interactive" (click)="imageInput.click()" [disabled]="uploadingType() === 'image'">
                  <mat-icon>image</mat-icon>
                  {{ uploadingType() === 'image' ? 'Uploading Image...' : 'Select & Upload Image' }}
                </button>

                <div class="uploaded-previews" *ngIf="uploadedImages().length > 0">
                  <div class="preview-item" *ngFor="let url of uploadedImages()">
                    <img [src]="url" alt="Property thumbnail" />
                  </div>
                </div>
              </div>

              <div class="upload-section glass-panel">
                <h4>360° Panorama Virtual Tour</h4>
                <p>Capture a stitched 360° equirectangular panorama of the land boundary directly inside your browser.</p>
                
                <button type="button" mat-raised-button color="accent" class="btn-interactive glow-border-green" (click)="showCaptureTool.set(true)">
                  <mat-icon>camera_360</mat-icon>
                  Launch 360° Capture Tool
                </button>

                <div class="uploaded-previews panorama-preview-container" *ngIf="uploadedPanorama()" style="width: 100%; margin-top: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 0.85rem; font-weight: 600; color: var(--accent-primary);">✓ Stitched Boundary Virtual Tour Attached</span>
                    <button type="button" mat-icon-button color="warn" class="btn-interactive" (click)="uploadedPanorama.set('')" title="Remove Virtual Tour">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                  <div class="preview-viewer-wrapper" style="height: 240px; width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color);">
                    <app-panorama-viewer [panoramaUrl]="uploadedPanorama()"></app-panorama-viewer>
                  </div>
                </div>
              </div>

              <div class="upload-section glass-panel">
                <h4>Walkthrough Video</h4>
                <p>Upload property walkthrough MP4 video.</p>
                <input type="file" #videoInput (change)="uploadMedia($event, 'video')" accept="video/*" style="display: none" />
                <button mat-raised-button color="accent" class="btn-interactive" (click)="videoInput.click()" [disabled]="uploadingType() === 'video'">
                  <mat-icon>videocam</mat-icon>
                  {{ uploadingType() === 'video' ? 'Uploading Video...' : 'Upload Walkthrough Video' }}
                </button>

                <div class="uploaded-previews" *ngIf="uploadedVideo()">
                  <div class="preview-item video">
                    <span class="material-symbols-outlined icon">videocam</span>
                    <span>Video Walkthrough Uploaded</span>
                  </div>
                </div>
              </div>

              <div class="actions">
                <button mat-button class="btn-interactive" matStepperPrevious>Back</button>
                <button mat-raised-button color="primary" class="btn-interactive" matStepperNext>
                  Next: Legal Deeds
                </button>
              </div>
            </div>
          </mat-step>

          <!-- Step 4: Deeds & Submit -->
          <mat-step label="Legal Deeds & Submit">
            <div class="step-form">
              <div class="upload-section glass-panel">
                <h4>Deeds & Survey Documents</h4>
                <p>Attach legal document passbooks (Patta, Sale Deed, etc.). PDF preferred.</p>
                
                <mat-form-field appearance="fill">
                  <mat-label>Document Type</mat-label>
                  <mat-select [(ngModel)]="documentType">
                    <mat-option value="PATTA">Patta Passbook</mat-option>
                    <mat-option value="SALE_DEED">Sale Deed</mat-option>
                    <mat-option value="TAX_RECEIPT">Tax Receipt</mat-option>
                    <mat-option value="ENCUMBRANCE_CERTIFICATE">Encumbrance Certificate</mat-option>
                  </mat-select>
                </mat-form-field>

                <input type="file" #docInput (change)="uploadMedia($event, 'document')" accept=".pdf,image/*" style="display: none" />
                <button mat-raised-button color="accent" class="btn-interactive" (click)="docInput.click()" [disabled]="uploadingType() === 'document'">
                  <mat-icon>upload_file</mat-icon>
                  {{ uploadingType() === 'document' ? 'Uploading...' : 'Upload Selected Document' }}
                </button>

                <div class="uploaded-previews docs" *ngIf="uploadedDocument()">
                  <div class="preview-item doc">
                    <span class="material-symbols-outlined icon">description</span>
                    <span>{{ documentType }} Document Uploaded</span>
                  </div>
                </div>
              </div>

              <div class="actions">
                <button mat-button class="btn-interactive" matStepperPrevious>Back</button>
                <button mat-raised-button color="accent" 
                        [disabled]="submitting()" 
                        (click)="submitProperty()"
                        class="submit-btn glow-border-green btn-interactive">
                  <span *ngIf="!submitting()">Submit & Launch AI Check</span>
                  <span *ngIf="submitting()">Registering Property...</span>
                </button>
              </div>
            </div>
          </mat-step>
        </mat-stepper>
      </div>

      <app-panorama-capture
        *ngIf="showCaptureTool()"
        (onSave)="onPanoramaCaptured($event)"
        (onCancel)="showCaptureTool.set(false)">
      </app-panorama-capture>
    </div>
  `,
  styles: `
    .property-create-container {
      padding: 40px 24px;
      display: flex;
      justify-content: center;
      min-height: calc(100vh - 70px);
      box-sizing: border-box;
      background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
      @media(max-width: 768px) {
        padding: 16px;
      }
    }
    .create-card {
      width: 100%;
      max-width: 700px;
      padding: 30px;
    }
    .header-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      h2 { margin: 0; font-family: var(--font-display); }
      .back-btn { color: var(--text-secondary); }
    }
    .step-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 24px 0;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      @media(max-width: 480px) {
        grid-template-columns: 1fr;
      }
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      @media(max-width: 600px) {
        grid-template-columns: 1fr;
      }
    }
    .map-label {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: 8px;
    }
    .map-wrapper {
      height: 300px;
      width: 100%;
      overflow: hidden;
    }
    .map-container {
      height: 100%;
      width: 100%;
      border-radius: 8px;
    }
    .upload-section {
      padding: 20px;
      border: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
      h4 { margin: 0; font-family: var(--font-display); }
      p { margin: 0; font-size: 0.8rem; color: var(--text-secondary); }
    }
    .uploaded-previews {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 12px;
      .preview-item {
        width: 80px;
        height: 80px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--border-color);
        img { width: 100%; height: 100%; object-fit: cover; }
        &.panorama { width: 150px; height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 0.7rem; color: var(--accent-primary); }
        &.video, &.doc { width: 100%; height: auto; padding: 12px; display: flex; align-items: center; gap: 8px; font-size: 0.8rem; border-color: var(--accent-info); }
        .icon { color: var(--accent-info); }
      }
    }
    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
    }
    .submit-btn {
      padding: 12px 24px;
      font-weight: 600;
    }
  `,
})
export class PropertyCreateComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly propertyService = inject(PropertyService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  private readonly mapContainer = viewChild<ElementRef>('mapContainer');

  readonly uploadingType = signal<string | null>(null);
  readonly submitting = signal<boolean>(false);
  readonly showCaptureTool = signal<boolean>(false);

  // Form groups
  readonly detailsForm: FormGroup = this.fb.group({
    title: ['', [Validators.required]],
    category: ['AGRICULTURAL', [Validators.required]],
    area: ['', [Validators.required, Validators.min(0.01)]],
    price: ['', [Validators.required, Validators.min(1)]],
    description: ['', [Validators.required]],
    surveyNumber: ['', [Validators.required]],
  });

  readonly locationForm: FormGroup = this.fb.group({
    address: ['', [Validators.required]],
    village: ['', [Validators.required]],
    district: ['', [Validators.required]],
    state: ['', [Validators.required]],
    pincode: ['', [Validators.required]],
    latitude: [16.2432, [Validators.required]],
    longitude: [80.6405, [Validators.required]],
  });

  // Media state
  readonly uploadedImages = signal<string[]>([]);
  readonly uploadedPanorama = signal<string>('');
  readonly uploadedVideo = signal<string>('');
  
  // Doc state
  documentType = 'PATTA';
  readonly uploadedDocument = signal<string>('');

  private map: mapboxgl.Map | null = null;
  private marker: mapboxgl.Marker | null = null;

  ngOnInit(): void {}

  onPanoramaCaptured(url: string): void {
    this.uploadedPanorama.set(url);
    this.showCaptureTool.set(false);
    this.snackBar.open('360° Virtual Tour captured and attached successfully!', 'Dismiss', { duration: 3000 });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  onStepSelectionChange(event: any): void {
    if (event.selectedIndex === 1) {
      setTimeout(() => this.initMap(), 100);
    }
  }

  uploadMedia(event: Event, type: 'image' | 'panorama' | 'video' | 'document'): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.uploadingType.set(type);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', environment.cloudinaryUploadPreset);

    // Mock direct upload if credentials are placeholder, or trigger direct HTTPS fetch
    this.http.post<any>(`https://api.cloudinary.com/v1_1/${environment.cloudinaryCloudName}/upload`, formData)
      .subscribe({
        next: (res) => {
          this.uploadingType.set(null);
          const secureUrl = res.secure_url;
          this.snackBar.open('File uploaded successfully!', 'Dismiss', { duration: 2500 });
          
          if (type === 'image') {
            this.uploadedImages.update((arr) => [...arr, secureUrl]);
          } else if (type === 'panorama') {
            this.uploadedPanorama.set(secureUrl);
          } else if (type === 'video') {
            this.uploadedVideo.set(secureUrl);
          } else if (type === 'document') {
            this.uploadedDocument.set(secureUrl);
          }
        },
        error: () => {
          // Cloudinary fail? Fallback to standard mock url since Mapbox/Cloudinary are sandboxed
          this.uploadingType.set(null);
          const nameClean = file.name.replace(/\s+/g, '_');
          const fallbackUrl = `http://storage.landlens.com/${type}s/${nameClean}`;
          this.snackBar.open('Direct Cloudinary endpoint failed. Mocking upload url.', 'Dismiss', { duration: 3000 });
          
          if (type === 'image') {
            this.uploadedImages.update((arr) => [...arr, fallbackUrl]);
          } else if (type === 'panorama') {
            this.uploadedPanorama.set(fallbackUrl);
          } else if (type === 'video') {
            this.uploadedVideo.set(fallbackUrl);
          } else if (type === 'document') {
            this.uploadedDocument.set(fallbackUrl);
          }
        },
      });
  }

  submitProperty(): void {
    this.submitting.set(true);
    const body: Partial<Property> = {
      ...this.detailsForm.value,
      ...this.locationForm.value,
      threeSixtyImageUrl: this.uploadedPanorama() || undefined,
    };

    this.propertyService.createProperty(body).subscribe({
      next: (prop) => {
        const propId = prop.id;
        
        // Upload images list
        this.uploadedImages().forEach((imgUrl, idx) => {
          this.propertyService.uploadImage(propId, {
            imageUrl: imgUrl,
            thumbnailUrl: imgUrl,
            displayOrder: idx + 1,
          }).subscribe();
        });

        // Upload video walkthrough
        if (this.uploadedVideo()) {
          this.propertyService.uploadVideo(propId, {
            videoUrl: this.uploadedVideo(),
            duration: 120,
            thumbnailUrl: this.uploadedVideo().replace('.mp4', '.jpg'),
          }).subscribe();
        }

        // Upload deeds document and trigger OCR
        if (this.uploadedDocument()) {
          this.propertyService.uploadDocument(propId, {
            documentType: this.documentType,
            fileUrl: this.uploadedDocument(),
          }).subscribe({
            next: (doc) => {
              this.propertyService.triggerOCR(doc.id).subscribe();
            },
          });
        }

        this.submitting.set(false);
        this.snackBar.open('Property listing created successfully!', 'Dismiss', { duration: 4000 });
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.submitting.set(false);
        this.snackBar.open('Registration failed. Verify fields.', 'Dismiss', { duration: 3000 });
      },
    });
  }

  private initMap(): void {
    const container = this.mapContainer()?.nativeElement;
    if (!container || this.map) return;

    (mapboxgl as any).accessToken = environment.mapboxToken;
    this.map = new mapboxgl.Map({
      container: container,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [80.6405, 16.2432], // Default Guntur/Tenali region center
      zoom: 12,
    });

    this.map.addControl(new mapboxgl.NavigationControl());

    this.marker = new mapboxgl.Marker({ draggable: true })
      .setLngLat([80.6405, 16.2432])
      .addTo(this.map);

    this.marker.on('dragend', () => {
      const lngLat = this.marker?.getLngLat();
      if (lngLat) {
        this.locationForm.patchValue({
          latitude: Number(lngLat.lat.toFixed(6)),
          longitude: Number(lngLat.lng.toFixed(6)),
        });
      }
    });
  }
}
