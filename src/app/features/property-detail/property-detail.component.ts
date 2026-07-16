import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PropertyService } from '../../core/services/property.service';
import { AuthService } from '../../core/services/auth.service';
import { MapComponent } from '../../shared/components/map/map.component';
import { VerificationBadgeComponent } from '../../shared/components/verification-badge/verification-badge.component';
import { PanoramaViewerComponent } from '../../shared/components/panorama-viewer/panorama-viewer.component';
import * as Models from '../../core/models/property.models';

@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MapComponent, VerificationBadgeComponent, PanoramaViewerComponent, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col pb-12" *ngIf="property">
      
      <!-- Sub-Navbar Header -->
      <nav class="bg-slate-900 text-white shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <button (click)="goBack()" class="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-medium">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Dashboard
          </button>
          
          <div class="flex items-center gap-3">
            <app-verification-badge [status]="property.status" [aiScore]="aiReport?.aiTrustScore"></app-verification-badge>
            <span class="text-xs text-slate-400 font-mono">Code: {{ property.propertyCode }}</span>
          </div>
        </div>
      </nav>

      <!-- Main Layout Grid -->
      <div class="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        <!-- Left details panel (8 cols) -->
        <div class="lg:col-span-8 space-y-6">
          
          <!-- Image Carousel & Gallery -->
          <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
            <div class="relative h-96 bg-slate-900 flex items-center justify-center">
              
              <!-- Selected Media Display -->
              <ng-container *ngIf="activeMedia === 'image' && images.length > 0">
                <img [src]="images[activeImageIndex].imageUrl" class="w-full h-full object-cover" />
              </ng-container>

              <ng-container *ngIf="activeMedia === 'video' && videos.length > 0">
                <video [src]="videos[0].videoUrl" controls class="w-full h-full object-contain"></video>
              </ng-container>

              <div *ngIf="images.length === 0 && videos.length === 0" class="text-slate-500 text-xs text-center">
                No photos or walkthrough videos uploaded for this land.
              </div>

              <!-- Media Toggles -->
              <div class="absolute bottom-4 right-4 flex gap-1.5 bg-slate-900/80 px-2 py-1.5 rounded-lg border border-slate-700/50 backdrop-blur-xs z-10">
                <button 
                  *ngIf="images.length > 0"
                  (click)="activeMedia = 'image'"
                  [class.text-emerald-400]="activeMedia === 'image'"
                  class="text-xs font-semibold text-slate-300 hover:text-white px-2">
                  Photos
                </button>
                <button 
                  *ngIf="videos.length > 0"
                  (click)="activeMedia = 'video'"
                  [class.text-emerald-400]="activeMedia === 'video'"
                  class="text-xs font-semibold text-slate-300 hover:text-white px-2 border-l border-slate-700">
                  Walkthrough
                </button>
              </div>
            </div>

            <!-- Thumbnail strips -->
            <div class="p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5 overflow-x-auto" *ngIf="activeMedia === 'image' && images.length > 1">
              <div 
                *ngFor="let img of images; let idx = index" 
                (click)="activeImageIndex = idx"
                [class.ring-2]="activeImageIndex === idx"
                [class.ring-emerald-500]="activeImageIndex === idx"
                class="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shrink-0">
                <img [src]="img.thumbnailUrl" class="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          <!-- Main tabs (Details, 360 Tour, Document OCR, Map) -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
            <div class="flex border-b border-slate-100 overflow-x-auto">
              <button 
                (click)="activeTab = 'spec'"
                [class.border-emerald-500]="activeTab === 'spec'"
                [class.text-emerald-600]="activeTab === 'spec'"
                class="px-4 py-3 border-b-2 border-transparent font-semibold text-xs text-slate-500 hover:text-slate-800 transition-all shrink-0">
                Specifications
              </button>
              <button 
                (click)="activeTab = '360'"
                [class.border-emerald-500]="activeTab === '360'"
                [class.text-emerald-600]="activeTab === '360'"
                class="px-4 py-3 border-b-2 border-transparent font-semibold text-xs text-slate-500 hover:text-slate-800 transition-all shrink-0">
                360° Virtual Tour
              </button>
              <button 
                (click)="activeTab = 'report'"
                [class.border-emerald-500]="activeTab === 'report'"
                [class.text-emerald-600]="activeTab === 'report'"
                class="px-4 py-3 border-b-2 border-transparent font-semibold text-xs text-slate-500 hover:text-slate-800 transition-all shrink-0">
                AI Trust Score
              </button>
              <button 
                (click)="activeTab = 'map'"
                [class.border-emerald-500]="activeTab === 'map'"
                [class.text-emerald-600]="activeTab === 'map'"
                class="px-4 py-3 border-b-2 border-transparent font-semibold text-xs text-slate-500 hover:text-slate-800 transition-all shrink-0">
                Location Map
              </button>
              <button 
                (click)="activeTab = 'timeline'"
                [class.border-emerald-500]="activeTab === 'timeline'"
                [class.text-emerald-600]="activeTab === 'timeline'"
                class="px-4 py-3 border-b-2 border-transparent font-semibold text-xs text-slate-500 hover:text-slate-800 transition-all shrink-0">
                Timeline History
              </button>
            </div>

            <!-- TABS CONTENT -->
            <!-- 1. Specifications -->
            <div *ngIf="activeTab === 'spec'" class="space-y-5">
              <div>
                <h3 class="text-xl font-bold text-slate-800">{{ property.title }}</h3>
                <p class="text-xs text-slate-500 mt-1">Listed under category: {{ property.category }} • {{ property.area }} acres area size.</p>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span class="text-[10px] uppercase font-bold text-slate-400">Total Price</span>
                  <p class="text-lg font-bold text-emerald-600">₹{{ property.price.toLocaleString('en-IN') }}</p>
                </div>
                <div>
                  <span class="text-[10px] uppercase font-bold text-slate-400">Survey Code</span>
                  <p class="text-sm font-bold text-slate-800">{{ property.surveyNumber }}</p>
                </div>
                <div>
                  <span class="text-[10px] uppercase font-bold text-slate-400">Village</span>
                  <p class="text-sm font-bold text-slate-800">{{ property.village }}</p>
                </div>
                <div>
                  <span class="text-[10px] uppercase font-bold text-slate-400">Pincode</span>
                  <p class="text-sm font-bold text-slate-800">{{ property.pincode }}</p>
                </div>
              </div>

              <div class="space-y-2">
                <h4 class="text-xs font-bold text-slate-700">Land Description:</h4>
                <p class="text-xs text-slate-600 leading-relaxed">{{ property.description || 'No custom description provided.' }}</p>
              </div>

              <div class="space-y-2 pt-2">
                <h4 class="text-xs font-bold text-slate-700">Deed Documents (OCR Parsed):</h4>
                <div class="space-y-2" *ngIf="documents.length > 0">
                  <div *ngFor="let doc of documents" class="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
                    <span class="text-xs font-semibold text-slate-700">{{ doc.documentType }} PASSBOOK</span>
                    <span class="px-2.5 py-0.5 text-[9px] font-extrabold bg-emerald-100 text-emerald-800 rounded-full uppercase">{{ doc.verificationStatus }}</span>
                  </div>
                </div>
                <p *ngIf="documents.length === 0" class="text-xs text-slate-400 italic">No passbook documents cataloged.</p>
              </div>
            </div>

            <!-- 2. 360 Virtual Tour -->
            <div *ngIf="activeTab === '360'" class="h-[450px]">
              <app-panorama-viewer [url]="property.threeSixtyImageUrl || ''"></app-panorama-viewer>
            </div>

            <!-- 3. AI Trust Score -->
            <div *ngIf="activeTab === 'report'" class="space-y-5">
              <div class="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between" *ngIf="aiReport">
                <div class="space-y-1">
                  <h4 class="font-bold text-slate-800 text-sm">LandLens AI Trust Rating</h4>
                  <p class="text-xs text-slate-500">Verification complete. Boundaries matched local survey passbooks.</p>
                </div>
                <span class="text-3xl font-extrabold text-emerald-600">{{ aiReport.aiTrustScore }}%</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4" *ngIf="aiReport">
                <div class="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
                  <p class="text-[10px] uppercase font-bold text-slate-400">Forgery Risk</p>
                  <p class="text-lg font-extrabold text-rose-500 mt-1">{{ aiReport.forgeryScore }}%</p>
                </div>
                <div class="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
                  <p class="text-[10px] uppercase font-bold text-slate-400">Overlapping claim</p>
                  <p class="text-lg font-extrabold mt-1 text-slate-700">{{ aiReport.duplicateScore }}%</p>
                </div>
                <div class="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
                  <p class="text-[10px] uppercase font-bold text-slate-400">Confidence Match</p>
                  <p class="text-lg font-extrabold text-emerald-600 mt-1">{{ aiReport.confidence }}%</p>
                </div>
              </div>

              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100" *ngIf="aiReport">
                <p class="text-xs font-bold text-slate-700 mb-1">AI Analyst Remarks:</p>
                <p class="text-xs text-slate-600 leading-relaxed">{{ aiReport.summary }}</p>
              </div>

              <p *ngIf="!aiReport" class="text-xs text-slate-500 italic py-6 text-center">AI Trust checks pending execution on listing files.</p>
            </div>

            <!-- 4. Location Map -->
            <div *ngIf="activeTab === 'map'" class="h-[400px]">
              <app-map mode="detail" [properties]="[property]"></app-map>
            </div>

            <!-- 5. Timeline -->
            <div *ngIf="activeTab === 'timeline'" class="relative pl-6 border-l-2 border-slate-200 space-y-6">
              <div *ngFor="let t of timeline" class="relative">
                <span class="absolute -left-[31px] top-1 bg-emerald-500 border-4 border-white w-4.5 h-4.5 rounded-full shadow-xs"></span>
                <p class="text-xs font-bold text-slate-700">{{ t.action }}</p>
                <p class="text-[10px] text-slate-400 mt-0.5">{{ t.timestamp | date:'medium' }}</p>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100/50" *ngIf="t.remarks">{{ t.remarks }}</p>
              </div>
            </div>

          </div>

        </div>

        <!-- Right Side sidebar booking / fraud (4 cols) -->
        <div class="lg:col-span-4 space-y-6">
          
          <!-- Schedule Guided Tour Visit Card -->
          <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <h3 class="font-bold text-slate-800 text-sm">Schedule guided on-site tour</h3>
              <p class="text-xs text-slate-500 mt-0.5">Select date/time to visit. Owner contacts will show after approval.</p>
            </div>

            <form [formGroup]="visitForm" (ngSubmit)="onScheduleVisit()" class="space-y-4">
              <div>
                <label class="block text-slate-600 text-xs font-semibold mb-1">Visit Date</label>
                <input type="date" formControlName="visitDate" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs" />
              </div>
              
              <div>
                <label class="block text-slate-600 text-xs font-semibold mb-1">Preferred Time</label>
                <input type="time" formControlName="visitTime" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs" />
              </div>

              <div *ngIf="visitSuccess" class="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] rounded-lg">
                Tour visit scheduled successfully! Waiting for owner confirmation.
              </div>

              <button 
                type="submit" 
                [disabled]="visitForm.invalid || visitLoading"
                class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all disabled:opacity-50">
                Book Inspection Slot
              </button>
            </form>
          </div>

          <!-- Report Fraud / Overlap disputes Card -->
          <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <h3 class="font-bold text-rose-500 text-sm">Dispute / Report fraud</h3>
              <p class="text-xs text-slate-500 mt-0.5">Flag double listing, boundaries mismatch, or forgery details.</p>
            </div>

            <form [formGroup]="fraudForm" (ngSubmit)="onSubmitFraud()" class="space-y-4">
              <div>
                <label class="block text-slate-600 text-xs font-semibold mb-1">Reason</label>
                <select formControlName="reason" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs">
                  <option value="Double Listing">Double Listing / Overlapped boundary</option>
                  <option value="Forgery Name">Ownership Name mismatch</option>
                  <option value="False specifications">False details / area size</option>
                </select>
              </div>

              <div>
                <label class="block text-slate-600 text-xs font-semibold mb-1">Evidence / Remarks</label>
                <textarea formControlName="description" rows="3" placeholder="Provide details to investigate..." class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs"></textarea>
              </div>

              <div *ngIf="fraudSuccess" class="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[10px] rounded-lg">
                Fraud report submitted. regional officer will resolve this.
              </div>

              <button 
                type="submit" 
                [disabled]="fraudForm.invalid || fraudLoading"
                class="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50">
                File Dispute Report
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  `
})
export class PropertyDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private propertyService = inject(PropertyService);
  authService = inject(AuthService);

  property!: Models.Property;
  images: Models.PropertyImage[] = [];
  videos: Models.PropertyVideo[] = [];
  documents: Models.PropertyDocument[] = [];
  timeline: Models.VerificationTimeline[] = [];
  aiReport: Models.AiVerification | null = null;

  // Tabs states
  activeTab: 'spec' | '360' | 'report' | 'map' | 'timeline' = 'spec';
  activeMedia: 'image' | 'video' = 'image';
  activeImageIndex = 0;

  // Forms
  visitForm!: FormGroup;
  visitLoading = false;
  visitSuccess = false;

  fraudForm!: FormGroup;
  fraudLoading = false;
  fraudSuccess = false;

  constructor() {
    this.initForms();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProperty(id);
    }
  }

  private initForms(): void {
    this.visitForm = this.fb.group({
      visitDate: ['', [Validators.required]],
      visitTime: ['10:30:00', [Validators.required]]
    });

    this.fraudForm = this.fb.group({
      reason: ['Double Listing', [Validators.required]],
      description: ['', [Validators.required]]
    });
  }

  private loadProperty(id: string): void {
    this.propertyService.getPropertyById(id).subscribe({
      next: (p) => {
        this.property = p;
        
        // Load details
        this.propertyService.getImages(p.id).subscribe(res => this.images = res);
        this.propertyService.getVideos(p.id).subscribe(res => this.videos = res);
        this.propertyService.getDocuments(p.id).subscribe(res => this.documents = res);
        this.propertyService.getTimeline(p.id).subscribe(res => this.timeline = res);
        this.propertyService.getAiVerification(p.id).subscribe({
          next: (res) => this.aiReport = res,
          error: () => this.aiReport = null
        });
      },
      error: () => {
        this.router.navigate(['/']);
      }
    });
  }

  onScheduleVisit(): void {
    if (this.visitForm.invalid) return;

    this.visitLoading = true;
    this.propertyService.scheduleVisit(this.property.id, this.visitForm.value).subscribe({
      next: () => {
        this.visitLoading = false;
        this.visitSuccess = true;
        this.visitForm.reset({ visitDate: '', visitTime: '10:30:00' });
      },
      error: () => this.visitLoading = false
    });
  }

  onSubmitFraud(): void {
    if (this.fraudForm.invalid) return;

    this.fraudLoading = true;
    this.propertyService.reportFraud(this.property.id, this.fraudForm.value).subscribe({
      next: () => {
        this.fraudLoading = false;
        this.successAndResetFraud();
      },
      error: () => this.fraudLoading = false
    });
  }

  private successAndResetFraud(): void {
    this.fraudSuccess = true;
    this.fraudForm.reset({
      reason: 'Double Listing',
      description: ''
    });
  }

  goBack(): void {
    const role = this.authService.userRole();
    if (role) {
      this.authService.redirectBasedOnRole(role);
    } else {
      this.router.navigate(['/']);
    }
  }
}
