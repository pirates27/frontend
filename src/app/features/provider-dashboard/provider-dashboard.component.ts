import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PropertyService } from '../../core/services/property.service';
import { CloudinaryService } from '../../core/services/cloudinary.service';
import { AuthService } from '../../core/services/auth.service';
import { MapComponent } from '../../shared/components/map/map.component';
import { VerificationBadgeComponent } from '../../shared/components/verification-badge/verification-badge.component';
import { PanoramaViewerComponent } from '../../shared/components/panorama-viewer/panorama-viewer.component';
import * as Models from '../../core/models/property.models';
import canvasConfetti from 'canvas-confetti';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MapComponent, VerificationBadgeComponent, PanoramaViewerComponent],
  template: `
    <div class="h-screen flex flex-col overflow-hidden bg-slate-50">
      <!-- Navbar -->
      <nav class="bg-slate-900 text-white shadow-lg shrink-0 z-30">
        <div class="px-4 sm:px-6 flex justify-between items-center h-16">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white shadow-md">LL</div>
            <span class="text-xl font-bold tracking-tight text-white">Land<span class="text-emerald-400">Lens</span></span>
            <span class="bg-emerald-800/40 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ml-2">Provider Portal</span>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right hidden sm:block">
              <p class="text-sm font-semibold text-white">{{ authService.currentUser()?.firstName }} {{ authService.currentUser()?.lastName }}</p>
              <p class="text-xs text-slate-400">{{ authService.currentUser()?.email }}</p>
            </div>
            <button (click)="logout()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-lg transition border border-slate-700/50">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <!-- Body: Sidebar + Content -->
      <div class="flex flex-1 overflow-hidden">

        <!-- Fixed Left Sidebar -->
        <aside class="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200 shadow-sm overflow-y-auto">
          <!-- Sidebar Header -->
          <div class="px-5 py-5 border-b border-slate-100">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Navigation</p>
            <p class="text-xs text-slate-600 font-medium">Provider Portal</p>
          </div>
          <!-- Nav Items -->
          <nav class="flex flex-col gap-1 p-3 flex-1">
            <button 
              (click)="activeTab = 'listings'"
              [class.bg-emerald-600]="activeTab === 'listings'"
              [class.text-white]="activeTab === 'listings'"
              [class.shadow-md]="activeTab === 'listings'"
              [class.text-slate-600]="activeTab !== 'listings'"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-left">
              <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              My Listings
            </button>

            <button 
              (click)="openAddPropertyForm()"
              [class.bg-emerald-600]="activeTab === 'add'"
              [class.text-white]="activeTab === 'add'"
              [class.shadow-md]="activeTab === 'add'"
              [class.text-slate-600]="activeTab !== 'add'"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-left">
              <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add New Property
            </button>

            <button 
              (click)="activeTab = 'visits'"
              [class.bg-emerald-600]="activeTab === 'visits'"
              [class.text-white]="activeTab === 'visits'"
              [class.shadow-md]="activeTab === 'visits'"
              [class.text-slate-600]="activeTab !== 'visits'"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-left relative">
              <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Visits &amp; Tours
              <span *ngIf="pendingVisitsCount() > 0" class="ml-auto px-2 py-0.5 bg-rose-500 text-white font-bold rounded-full text-[10px]">
                {{ pendingVisitsCount() }}
              </span>
            </button>
            <button 
              (click)="activeTab = 'notifications'"
              [class.bg-emerald-600]="activeTab === 'notifications'"
              [class.text-white]="activeTab === 'notifications'"
              [class.shadow-md]="activeTab === 'notifications'"
              [class.text-slate-600]="activeTab !== 'notifications'"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-left">
              <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              Notifications
              <span *ngIf="unreadNotificationsCount() > 0" class="ml-auto px-2 py-0.5 bg-amber-500 text-white font-bold rounded-full text-[10px]">
                {{ unreadNotificationsCount() }}
              </span>
            </button>
          </nav>

          <!-- Sidebar Footer -->
          <div class="px-4 py-4 border-t border-slate-100">
            <button (click)="logout()" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all font-semibold text-sm">
              <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </aside>

        <!-- Scrollable Main Content -->
        <main class="flex-1 overflow-y-auto">
          <div class="px-6 py-8 space-y-6">
          
          <!-- TAB 1: LISTINGS -->
          <div *ngIf="activeTab === 'listings'" class="space-y-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
              <div>
                <h2 class="text-xl font-bold text-slate-800">Your Property Catalog</h2>
                <p class="text-xs text-slate-500 mt-1">Manage listings, view trust reports, or upload verification documents.</p>
              </div>
              <button (click)="openAddPropertyForm()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                List Another Property
              </button>
            </div>

            <!-- Property Catalog Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" *ngIf="myProperties.length > 0">
              <div *ngFor="let p of myProperties" 
                   (click)="selectProperty(p)"
                   [class.ring-2]="selectedProperty()?.id === p.id"
                   [class.ring-emerald-500]="selectedProperty()?.id === p.id"
                   class="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col group">

                <!-- ── Preview Zone: Street View OR Image Slider ── -->
                <div class="relative h-44 bg-slate-900 overflow-hidden shrink-0">

                  <!-- Street View Iframe (auto-visible, no controls) -->
                  <ng-container *ngIf="p.threeSixtyImageUrl">
                    <iframe 
                      [src]="sanitize(p.threeSixtyImageUrl)"
                      class="absolute inset-0 w-full h-full border-0 pointer-events-none scale-[1.08]"
                      allowfullscreen
                      loading="lazy">
                    </iframe>
                    <!-- Dark gradient overlay for legibility -->
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent"></div>
                    <!-- 360 badge -->
                    <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-slate-900/80 text-white text-[9px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                      <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                      360° LIVE
                    </div>
                    <!-- Open button -->
                    <a [href]="p.threeSixtyImageUrl" target="_blank" (click)="$event.stopPropagation()"
                       class="absolute bottom-2.5 right-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow backdrop-blur-sm transition-all">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      Open Street View
                    </a>
                  </ng-container>

                  <!-- Image Slider fallback -->
                  <ng-container *ngIf="!p.threeSixtyImageUrl">
                    <div class="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                      <div class="text-center text-slate-500">
                        <svg class="w-10 h-10 mx-auto mb-1.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p class="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">No Street View</p>
                        <p class="text-[8px] text-slate-600 mt-0.5">Add 360° panorama via Edit</p>
                      </div>
                    </div>
                  </ng-container>

                  <!-- Category pill -->
                  <div class="absolute top-2.5 right-2.5" *ngIf="!p.threeSixtyImageUrl">
                    <span class="text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          [ngClass]="{
                            'bg-emerald-100 text-emerald-700': p.category === 'AGRICULTURAL',
                            'bg-blue-100 text-blue-700': p.category === 'RESIDENTIAL',
                            'bg-amber-100 text-amber-700': p.category === 'COMMERCIAL',
                            'bg-slate-200 text-slate-700': p.category === 'INDUSTRIAL'
                          }">
                      {{ p.category }}
                    </span>
                  </div>
                </div>

                <!-- ── Card Body ── -->
                <div class="p-4 flex-1 flex flex-col gap-3">
                  <div class="flex justify-between items-start gap-2">
                    <div class="min-w-0">
                      <h3 class="font-bold text-slate-800 truncate text-sm">{{ p.title }}</h3>
                      <p class="text-[10px] text-slate-500 truncate mt-0.5">📍 {{ p.village }}, {{ p.district }}</p>
                    </div>
                    <app-verification-badge [status]="p.status"></app-verification-badge>
                  </div>

                  <div class="grid grid-cols-3 gap-2 text-[10px]">
                    <div class="bg-slate-50 rounded-lg p-2 text-center">
                      <p class="text-slate-400 font-medium">Area</p>
                      <p class="font-bold text-slate-700">{{ p.area }} ac</p>
                    </div>
                    <div class="bg-emerald-50 rounded-lg p-2 text-center">
                      <p class="text-emerald-500 font-medium">Price</p>
                      <p class="font-bold text-emerald-700">₹{{ p.price | number }}</p>
                    </div>
                    <div class="bg-slate-50 rounded-lg p-2 text-center">
                      <p class="text-slate-400 font-medium">Survey</p>
                      <p class="font-bold text-slate-700 truncate">{{ p.surveyNumber }}</p>
                    </div>
                  </div>

                  <!-- Footer row -->
                  <div class="flex justify-between items-center pt-3 border-t border-slate-100 mt-auto">
                    <span class="text-[9px] text-slate-400">{{ p.createdAt | date:'mediumDate' }}</span>
                    <button (click)="$event.stopPropagation(); editProperty(p)" class="text-[10px] px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-md transition-colors border border-emerald-100 shadow-xs flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      Edit Property
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div *ngIf="myProperties.length === 0" class="bg-white rounded-2xl shadow-xs border border-slate-100 p-12 text-center">
              <svg class="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 class="text-lg font-bold text-slate-700">No properties cataloged</h3>
              <p class="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Upload your first agricultural, residential or commercial plot to trigger automated AI Trust score verification.</p>
              <button (click)="openAddPropertyForm()" class="mt-6 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md">
                Add Property
              </button>
            </div>

            <!-- DETAIL MANAGEMENT PANEL -->
            <div *ngIf="selectedProperty() as p" class="bg-white rounded-2xl shadow-md border border-slate-100 p-6 space-y-6">
              <div class="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h3 class="text-lg font-bold text-slate-800">Detail Management: {{ p.title }}</h3>
                  <p class="text-xs text-slate-500">Upload media attachments, legal documents, review timelines, and execute checks.</p>
                </div>
                <div class="flex gap-2">
                  <button (click)="editProperty(p)" class="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1 transition-colors border border-slate-200">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Edit Details
                  </button>
                  <button (click)="selectedProperty.set(null)" class="text-slate-400 hover:text-slate-600">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <!-- Detail Tabs -->
              <div class="flex border-b border-slate-100">
                <button 
                  (click)="detailSubTab = 'verify'"
                  [class.border-emerald-500]="detailSubTab === 'verify'"
                  [class.text-emerald-600]="detailSubTab === 'verify'"
                  class="px-4 py-2 border-b-2 border-transparent font-semibold text-xs text-slate-500 hover:text-slate-800 transition-all">
                  Verification & AI Check
                </button>
                <button 
                  (click)="detailSubTab = 'media'"
                  [class.border-emerald-500]="detailSubTab === 'media'"
                  [class.text-emerald-600]="detailSubTab === 'media'"
                  class="px-4 py-2 border-b-2 border-transparent font-semibold text-xs text-slate-500 hover:text-slate-800 transition-all">
                  Upload Media
                </button>
                <button 
                  (click)="detailSubTab = 'docs'"
                  [class.border-emerald-500]="detailSubTab === 'docs'"
                  [class.text-emerald-600]="detailSubTab === 'docs'"
                  class="px-4 py-2 border-b-2 border-transparent font-semibold text-xs text-slate-500 hover:text-slate-800 transition-all">
                  Documents (OCR passbook)
                </button>
                <button 
                  (click)="detailSubTab = 'timeline'"
                  [class.border-emerald-500]="detailSubTab === 'timeline'"
                  [class.text-emerald-600]="detailSubTab === 'timeline'"
                  class="px-4 py-2 border-b-2 border-transparent font-semibold text-xs text-slate-500 hover:text-slate-800 transition-all">
                  Audit History
                </button>
              </div>

              <!-- SUBTAB: VERIFICATION -->
              <div *ngIf="detailSubTab === 'verify'" class="space-y-6">
                <!-- AI check panel -->
                <div class="p-5 rounded-xl border border-slate-200" [ngClass]="aiReport ? 'bg-slate-50/50' : 'bg-amber-50/20 border-amber-200'">
                  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 class="font-bold text-slate-800 text-sm">Automated AI verification engine</h4>
                      <p class="text-xs text-slate-500 mt-1">Runs forgery verification, duplication checks, and cross-references passbook name with listing.</p>
                    </div>
                    <button 
                      *ngIf="!aiReport"
                      (click)="runAiVerify(p.id)"
                      [disabled]="aiLoading"
                      class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5">
                      <span *ngIf="aiLoading" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Run Trust Audit
                    </button>
                  </div>

                  <!-- AI REPORT DISPLAY -->
                  <div *ngIf="aiReport" class="mt-5 grid grid-cols-2 md:grid-cols-5 gap-4 pt-5 border-t border-slate-200">
                    <div class="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-xs">
                      <p class="text-[10px] uppercase font-bold text-slate-400">AI Trust Score</p>
                      <p class="text-xl font-extrabold text-emerald-600 mt-1">{{ aiReport.aiTrustScore }}%</p>
                    </div>
                    <div class="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-xs">
                      <p class="text-[10px] uppercase font-bold text-slate-400">Forgery Risk</p>
                      <p class="text-xl font-extrabold text-rose-500 mt-1">{{ aiReport.forgeryScore }}%</p>
                    </div>
                    <div class="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-xs">
                      <p class="text-[10px] uppercase font-bold text-slate-400">Overlap Score</p>
                      <p class="text-xl font-extrabold mt-1" [ngClass]="aiReport.duplicateScore > 10 ? 'text-rose-500' : 'text-slate-700'">{{ aiReport.duplicateScore }}%</p>
                    </div>
                    <div class="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-xs">
                      <p class="text-[10px] uppercase font-bold text-slate-400">Owner Match</p>
                      <p class="text-sm font-extrabold mt-2" [ngClass]="aiReport.ownershipMatch ? 'text-emerald-600' : 'text-rose-500'">
                        {{ aiReport.ownershipMatch ? 'MATCHED' : 'MISMATCH' }}
                      </p>
                    </div>
                    <div class="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-xs">
                      <p class="text-[10px] uppercase font-bold text-slate-400">Confidence</p>
                      <p class="text-xl font-extrabold text-slate-700 mt-1">{{ aiReport.confidence }}%</p>
                    </div>
                    <div class="col-span-2 md:col-span-5 bg-white p-4 rounded-xl border border-slate-100 mt-2">
                      <p class="text-xs font-bold text-slate-700 mb-1">AI Trust Summary:</p>
                      <p class="text-xs text-slate-600 leading-relaxed">{{ aiReport.summary }}</p>
                    </div>
                  </div>
                </div>

                <!-- Govt inspection comments -->
                <div class="bg-slate-50/50 p-5 rounded-xl border border-slate-200">
                  <h4 class="font-bold text-slate-800 text-sm mb-3">Government Verification Status</h4>
                  <div *ngIf="govtVerification; else noGovt">
                    <div class="flex items-center gap-3 mb-2">
                      <span class="px-2.5 py-1 text-[10px] font-bold rounded-full uppercase" 
                            [ngClass]="govtVerification.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'">
                        {{ govtVerification.status }}
                      </span>
                      <span class="text-slate-400 text-xs">Inspected on {{ govtVerification.verifiedDate | date:'medium' }}</span>
                    </div>
                    <p class="text-xs text-slate-600 bg-white p-3.5 rounded-lg border border-slate-100">{{ govtVerification.remarks }}</p>
                  </div>
                  <ng-template #noGovt>
                    <p class="text-xs text-slate-500 leading-relaxed">No government review has been submitted for this property yet. Standard workflow requires completing the AI Trust engine check first. The status will update to PENDING_GOVT once AI analysis concludes, alerting the regional inspector.</p>
                  </ng-template>
                </div>
              </div>

              <!-- SUBTAB: MEDIA UPLOAD -->
              <div *ngIf="detailSubTab === 'media'" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <!-- Upload Image Card -->
                  <div class="p-5 bg-slate-50/40 rounded-xl border border-slate-200 space-y-4">
                    <div>
                      <h4 class="font-bold text-slate-800 text-xs">Add photos/images</h4>
                      <p class="text-[10px] text-slate-500 mt-0.5">Supports high-res JPG and PNG formats (max 10MB).</p>
                    </div>

                    <div class="relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-white">
                      <input type="file" (change)="onUploadImage($event, p.id)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
                      <div class="text-slate-500 space-y-2">
                        <svg class="w-8 h-8 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p class="text-xs font-semibold text-slate-700">Click or drag image file</p>
                      </div>
                    </div>

                    <div *ngIf="uploadLoading" class="text-xs text-emerald-600 flex items-center gap-1.5">
                      <span class="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                      Uploading asset to Cloudinary...
                    </div>

                    <!-- Listed images -->
                    <div class="grid grid-cols-4 gap-3 pt-4 border-t border-slate-100" *ngIf="propertyImages.length > 0">
                      <div *ngFor="let img of propertyImages" class="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-xs">
                        <img [src]="img.thumbnailUrl" class="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>

                  <!-- Upload Walkthrough Video -->
                  <div class="p-5 bg-slate-50/40 rounded-xl border border-slate-200 space-y-4">
                    <div>
                      <h4 class="font-bold text-slate-800 text-xs">Add walkthrough video</h4>
                      <p class="text-[10px] text-slate-500 mt-0.5">Attach a high-resolution walkthrough MP4 (max 50MB).</p>
                    </div>

                    <div class="relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-white">
                      <input type="file" (change)="onUploadVideo($event, p.id)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="video/*" />
                      <div class="text-slate-500 space-y-2">
                        <svg class="w-8 h-8 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        <p class="text-xs font-semibold text-slate-700">Click or drag video file</p>
                      </div>
                    </div>

                    <!-- Listed video -->
                    <div class="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs" *ngIf="propertyVideos.length > 0">
                      <span class="text-slate-600 truncate max-w-[200px]">{{ propertyVideos[0].videoUrl }}</span>
                      <span class="text-slate-400 font-medium">Walkthrough upload active</span>
                    </div>
                  </div>

                </div>
              </div>

              <!-- SUBTAB: DOCUMENTS -->
              <div *ngIf="detailSubTab === 'docs'" class="space-y-6">
                <div class="p-5 bg-slate-50/40 rounded-xl border border-slate-200 space-y-5">
                  <div class="flex justify-between items-start">
                    <div>
                      <h4 class="font-bold text-slate-800 text-sm">Land Registry / Patta Passbooks</h4>
                      <p class="text-xs text-slate-500 mt-1">Upload ownership document deeds. PDF or images accepted. OCR handles name/survey check.</p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-slate-700 text-xs font-semibold mb-1.5">Document Type</label>
                      <select [(ngModel)]="selectedDocType" class="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs">
                        <option value="PATTA">Patta Passbook</option>
                        <option value="SALE_DEED">Sale Deed</option>
                        <option value="SURVEY_MAP">Survey Map</option>
                        <option value="TAX_RECEIPT">Tax Receipt</option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-slate-700 text-xs font-semibold mb-1.5">Select Document File</label>
                      <div class="relative">
                        <input type="file" (change)="onUploadDoc($event, p.id)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,image/*" />
                        <div class="w-full bg-white border border-slate-300 rounded-xl py-2 px-4 text-xs font-medium text-slate-600 text-center hover:bg-slate-50 hover:border-emerald-500 transition-colors">
                          Click to Choose PDF / Image
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Uploading Spinner -->
                  <div *ngIf="docLoading" class="text-xs text-emerald-600 flex items-center gap-1.5">
                    <span class="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                    Uploading PDF passbook to Cloudinary secure vault...
                  </div>

                  <!-- Documents list with OCR trigger buttons -->
                  <div class="space-y-3 pt-4 border-t border-slate-100" *ngIf="propertyDocs.length > 0">
                    <h5 class="text-xs font-bold text-slate-700">Uploaded Deeds:</h5>
                    <div *ngFor="let doc of propertyDocs" class="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs">
                      <div class="space-y-1">
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-slate-800 text-xs">{{ doc.documentType }}</span>
                          <a [href]="doc.fileUrl" target="_blank" class="text-[10px] text-emerald-600 hover:underline">View Document File</a>
                        </div>
                        <p class="text-[10px] text-slate-500">OCR: {{ doc.ocrStatus }} | Verification: {{ doc.verificationStatus }}</p>
                      </div>

                      <!-- OCR Trigger Button -->
                      <button 
                        *ngIf="doc.ocrStatus === 'PENDING'"
                        (click)="triggerOcr(doc.id)"
                        class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg transition">
                        Execute OCR Parse
                      </button>

                      <div *ngIf="doc.ocrStatus === 'COMPLETED' && doc.rawText" class="w-full md:w-2/3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px] text-slate-600 font-mono overflow-auto max-h-24">
                        <strong>Extracted Text:</strong> {{ doc.rawText }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- SUBTAB: AUDIT TIMELINE -->
              <div *ngIf="detailSubTab === 'timeline'" class="space-y-6">
                <div class="relative pl-6 border-l-2 border-slate-200 space-y-6">
                  <div *ngFor="let t of timeline" class="relative">
                    <!-- timeline dot -->
                    <span class="absolute -left-[31px] top-1 bg-emerald-500 border-4 border-white w-4.5 h-4.5 rounded-full shadow-xs"></span>
                    <p class="text-xs font-bold text-slate-700">{{ t.action }}</p>
                    <p class="text-[10px] text-slate-400 mt-0.5">{{ t.timestamp | date:'medium' }}</p>
                    <p class="text-xs text-slate-500 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100/50" *ngIf="t.remarks">{{ t.remarks }}</p>
                  </div>

                  <div *ngIf="timeline.length === 0" class="text-slate-400 text-xs py-4 text-center">No timeline transitions logged yet.</div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: ADD PROPERTY FORM -->
          <div *ngIf="activeTab === 'add'" class="bg-white rounded-2xl shadow-md border border-slate-100 p-6 space-y-6">
            <div>
              <h2 class="text-xl font-bold text-slate-800">{{ isEditMode ? 'Edit Property Details' : 'Add New Property Listing' }}</h2>
              <p class="text-xs text-slate-500 mt-1">Please fill in details. Pin exact coordinates on the map. The address geocodes automatically.</p>
            </div>

            <!-- Pre-fill / Clone tool -->
            <div class="bg-emerald-50/50 border border-emerald-100/50 p-4.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  Pre-fill / Clone Details
                </h4>
                <p class="text-[10px] text-slate-500 mt-0.5">Select an existing property from your catalog to auto-populate all fields and coordinates instantly.</p>
              </div>
              <div class="w-full sm:w-64">
                <select 
                  (change)="prefillFromProperty($event)" 
                  class="w-full bg-white border border-emerald-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs shadow-xs text-slate-700">
                  <option value="">-- Pre-fill from existing property --</option>
                  <option *ngFor="let p of myProperties" [value]="p.id">
                    {{ p.title }} (₹{{ p.price | number }} - {{ p.area }} ac)
                  </option>
                </select>
              </div>
            </div>

            <!-- Form -->
            <form [formGroup]="propertyForm" (ngSubmit)="onAddProperty()" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                <!-- Title -->
                <div class="md:col-span-2">
                  <label class="block text-slate-700 text-xs font-semibold mb-1.5">Property Title</label>
                  <input type="text" formControlName="title" placeholder="E.g., 2.5 Acres Wet Land near Bypass Road" class="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 focus:outline-hidden focus:border-brand-500 text-xs" />
                  <span *ngIf="propertyForm.get('title')?.touched && propertyForm.get('title')?.invalid" class="text-[10px] text-rose-500 mt-1 block">Title is required</span>
                </div>

                <!-- Category -->
                <div>
                  <label class="block text-slate-700 text-xs font-semibold mb-1.5">Category</label>
                  <select formControlName="category" class="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 focus:outline-hidden focus:border-brand-500 text-xs appearance-none">
                    <option value="AGRICULTURAL">Agricultural Plot</option>
                    <option value="RESIDENTIAL">Residential Property</option>
                    <option value="COMMERCIAL">Commercial space</option>
                    <option value="INDUSTRIAL">Industrial site</option>
                  </select>
                </div>

                <!-- Area -->
                <div>
                  <label class="block text-slate-700 text-xs font-semibold mb-1.5">Area (in acres)</label>
                  <input type="number" formControlName="area" placeholder="2.5" step="0.01" class="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 focus:outline-hidden focus:border-brand-500 text-xs" />
                  <span *ngIf="propertyForm.get('area')?.touched && propertyForm.get('area')?.invalid" class="text-[10px] text-rose-500 mt-1 block">Area is required</span>
                </div>

                <!-- Price -->
                <div>
                  <label class="block text-slate-700 text-xs font-semibold mb-1.5">Price (INR ₹)</label>
                  <input type="number" formControlName="price" placeholder="4500000" class="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 focus:outline-hidden focus:border-brand-500 text-xs" />
                  <span *ngIf="propertyForm.get('price')?.touched && propertyForm.get('price')?.invalid" class="text-[10px] text-rose-500 mt-1 block">Price is required</span>
                </div>

                <!-- Survey Number -->
                <div>
                  <label class="block text-slate-700 text-xs font-semibold mb-1.5">Survey Number / Patta Passbook</label>
                  <input type="text" formControlName="surveyNumber" placeholder="45-A/12" class="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 focus:outline-hidden focus:border-brand-500 text-xs" />
                  <span *ngIf="propertyForm.get('surveyNumber')?.touched && propertyForm.get('surveyNumber')?.invalid" class="text-[10px] text-rose-500 mt-1 block">Survey Number is required</span>
                </div>

              </div>

              <!-- Description -->
              <div>
                <label class="block text-slate-700 text-xs font-semibold mb-1.5">Detailed Description</label>
                <textarea formControlName="description" rows="3" placeholder="Describe soil fertility, water canal access, road accessibility..." class="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 focus:outline-hidden focus:border-brand-500 text-xs"></textarea>
              </div>

              <!-- Map Picker -->
              <div>
                <label class="block text-slate-700 text-xs font-semibold mb-2">Pin Land Boundary Location (Drag Pin)</label>
                <div class="h-[350px] w-full">
                  <app-map mode="picker" [initialBoundary]="lastDrawnBoundary" (locationSelected)="onLocationSelected($event)"></app-map>
                </div>
              </div>

              <!-- Coordinates Display & Address Auto-fill -->
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span class="text-slate-400 font-medium block">Latitude</span>
                  <span class="font-bold text-slate-700">{{ propertyForm.get('latitude')?.value }}</span>
                </div>
                <div>
                  <span class="text-slate-400 font-medium block">Longitude</span>
                  <span class="font-bold text-slate-700">{{ propertyForm.get('longitude')?.value }}</span>
                </div>
                <div class="col-span-2">
                  <span class="text-slate-400 font-medium block">Geocoded District / State</span>
                  <span class="font-bold text-slate-700">{{ propertyForm.get('district')?.value }}, {{ propertyForm.get('state')?.value }}</span>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <!-- Address -->
                <div class="sm:col-span-2">
                  <label class="block text-slate-700 text-xs font-semibold mb-1.5">Address</label>
                  <input type="text" formControlName="address" class="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 focus:outline-hidden focus:border-brand-500 text-xs" />
                </div>
                <!-- Village -->
                <div>
                  <label class="block text-slate-700 text-xs font-semibold mb-1.5">Village / Locality</label>
                  <input type="text" formControlName="village" class="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 focus:outline-hidden focus:border-brand-500 text-xs" />
                </div>
                <!-- Pincode -->
                <div>
                  <label class="block text-slate-700 text-xs font-semibold mb-1.5">Pincode</label>
                  <input type="text" formControlName="pincode" class="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 focus:outline-hidden focus:border-brand-500 text-xs" />
                </div>
              </div>

              <!-- 360 Panorama URL & Live Preview -->
              <div class="space-y-3">
                <div>
                  <label class="block text-slate-700 text-xs font-semibold mb-1.5">360° Panorama / Virtual Tour URL or Iframe Embed (Required)</label>
                  <textarea 
                    rows="2"
                    (input)="onThreeSixtyInputChange($event)"
                    formControlName="threeSixtyImageUrl" 
                    placeholder='Paste share URL or <iframe src="https://..."></iframe> embed code...' 
                    class="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 focus:outline-hidden focus:border-emerald-500 text-xs"></textarea>
                  <span *ngIf="propertyForm.get('threeSixtyImageUrl')?.touched && propertyForm.get('threeSixtyImageUrl')?.invalid" class="text-[10px] text-rose-500 mt-1 block">A valid virtual tour link (Google Maps, Momento360, Kuula, 360PhotoCam) or iframe embed code is required</span>
                </div>

                <!-- Live Preview Pane -->
                <div *ngIf="propertyForm.get('threeSixtyImageUrl')?.value && propertyForm.get('threeSixtyImageUrl')?.valid" class="space-y-1.5">
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Live 360° Panorama Preview</span>
                  <div class="h-[250px] w-full rounded-2xl overflow-hidden border border-slate-200">
                    <app-panorama-viewer [url]="propertyForm.get('threeSixtyImageUrl')?.value"></app-panorama-viewer>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" (click)="activeTab = 'listings'" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition">Cancel</button>
                <button type="submit" [disabled]="propertyForm.invalid || isSaving" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition shadow-md disabled:opacity-50 flex items-center gap-1.5">
                  <span *ngIf="isSaving" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {{ isEditMode ? 'Update Listing' : 'Save Listing' }}
                </button>
              </div>
            </form>
          </div>

          <!-- TAB 3: VISITS & TOURS -->
          <div *ngIf="activeTab === 'visits'" class="bg-white rounded-2xl shadow-md border border-slate-100 p-6 space-y-6">
            <div>
              <h2 class="text-xl font-bold text-slate-800">Guided Visit Request Registry</h2>
              <p class="text-xs text-slate-500 mt-1">Review scheduled buyer viewings on listed land slots. Confirm to share contacts.</p>
            </div>

            <!-- List -->
            <div class="space-y-4" *ngIf="myVisits.length > 0">
              <div *ngFor="let v of myVisits" class="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
                
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-800 text-sm">Scheduled Date: {{ v.visitDate }} at {{ v.visitTime }}</span>
                    <span class="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full"
                          [ngClass]="{
                            'bg-amber-100 text-amber-800': v.status === 'SCHEDULED',
                            'bg-emerald-100 text-emerald-800': v.status === 'CONFIRMED',
                            'bg-rose-100 text-rose-800': v.status === 'REJECTED'
                          }">
                      {{ v.status }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500">Property Identifier: {{ v.propertyId }}</p>
                </div>

                <!-- Action Button handlers -->
                <div class="flex gap-2" *ngIf="v.status === 'SCHEDULED'">
                  <button (click)="changeVisitStatus(v.id, 'CONFIRMED')" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition">
                    Confirm Visit
                  </button>
                  <button (click)="changeVisitStatus(v.id, 'REJECTED')" class="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition">
                    Reject
                  </button>
                </div>

              </div>
            </div>

            <div *ngIf="myVisits.length === 0" class="text-slate-400 text-xs py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No buyer visit slots scheduled.
            </div>
          </div>

          <!-- TAB 4: NOTIFICATIONS -->
          <div *ngIf="activeTab === 'notifications'" class="space-y-6">
            <div class="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
              <h2 class="text-xl font-bold text-slate-800">System Notifications</h2>
              <p class="text-xs text-slate-500 mt-1">Alerts regarding verification statuses, visits, and account activity.</p>
            </div>

            <div class="space-y-4" *ngIf="notifications.length > 0">
              <div *ngFor="let notification of notifications" 
                   [ngClass]="notification.isRead ? 'bg-white opacity-70' : 'bg-emerald-50 border-emerald-200'"
                   class="p-5 rounded-2xl border border-slate-100 shadow-xs flex justify-between items-start gap-4 transition-all hover:opacity-100">
                <div class="space-y-1 flex-1">
                  <h3 class="font-bold text-sm text-slate-800">{{ notification.title }}</h3>
                  <p class="text-xs text-slate-600 leading-relaxed">{{ notification.message }}</p>
                  <p class="text-[10px] text-slate-400 font-medium">{{ notification.createdTime | date:'medium' }}</p>
                </div>
                
                <button *ngIf="!notification.isRead" (click)="markNotificationRead(notification.id)" class="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] rounded-lg transition">
                  Mark Read
                </button>
                <svg *ngIf="notification.isRead" class="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>

            <div *ngIf="notifications.length === 0" class="text-center p-12 bg-white rounded-2xl border border-slate-150 text-slate-400 text-xs">
              You have no notifications.
            </div>
          </div>

        </div><!-- /px-6 wrapper -->
        </main><!-- /scrollable main -->
      </div><!-- /flex body -->
    </div><!-- /h-screen root -->
  `
})
export class ProviderDashboardComponent implements OnInit {
  authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private propertyService = inject(PropertyService);
  private cloudinaryService = inject(CloudinaryService);
  private domSanitizer = inject(DomSanitizer);

  sanitize(url: string): SafeResourceUrl {
    if (!url) return '';
    let finalUrl = url;
    if (url.includes('<iframe') && url.includes('src=')) {
      const match = url.match(/src=["'](.*?)["']/);
      if (match && match[1]) finalUrl = match[1];
    }
    return this.domSanitizer.bypassSecurityTrustResourceUrl(finalUrl);
  }

  activeTab: 'listings' | 'add' | 'visits' | 'notifications' = 'listings';
  detailSubTab: 'verify' | 'media' | 'docs' | 'timeline' = 'verify';

  myProperties: Models.Property[] = [];
  myVisits: Models.PropertyVisit[] = [];
  notifications: Models.Notification[] = [];
  lastDrawnBoundary: [number, number][] = [];

  // Signals
  selectedProperty = signal<Models.Property | null>(null);
  pendingVisitsCount = signal<number>(0);
  unreadNotificationsCount = signal<number>(0);

  // Lists corresponding to selectedProperty
  propertyImages: Models.PropertyImage[] = [];
  propertyVideos: Models.PropertyVideo[] = [];
  propertyDocs: Models.PropertyDocument[] = [];
  timeline: Models.VerificationTimeline[] = [];
  aiReport: Models.AiVerification | null = null;
  govtVerification: Models.GovernmentVerification | null = null;

  // Forms
  propertyForm!: FormGroup;
  isSaving = false;
  aiLoading = false;
  uploadLoading = false;
  docLoading = false;
  selectedDocType: Models.DocumentType = 'PATTA';

  // Edit Mode state
  isEditMode = false;
  editingPropertyId: string | null = null;

  constructor() {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadData();
    this.loadVisits();
    this.loadNotifications();
  }

  private initForm(): void {
    this.propertyForm = this.fb.group({
      title: ['', [Validators.required]],
      category: ['AGRICULTURAL', [Validators.required]],
      area: [null, [Validators.required, Validators.min(0.01)]],
      price: [null, [Validators.required, Validators.min(100)]],
      description: [''],
      surveyNumber: ['', [Validators.required]],
      address: ['', [Validators.required]],
      latitude: [16.3067, [Validators.required]],
      longitude: [80.4365, [Validators.required]],
      district: ['Guntur', [Validators.required]],
      village: ['Gorantla', [Validators.required]],
      state: ['Andhra Pradesh', [Validators.required]],
      pincode: ['522034', [Validators.required]],
      threeSixtyImageUrl: ['', [Validators.required, Validators.pattern(/momento360\.com|kuula\.co|google\..*?\/maps|360photocam\.com/)]]
    });
  }

  loadData(): void {
    // Load properties
    this.propertyService.getProperties().subscribe(properties => {
      const user = this.authService.currentUser();
      if (user && user.id) {
        this.myProperties = properties.filter(p => p.providerId === user.id);
      } else {
        this.myProperties = properties;
      }
    });
  }

  loadVisits(): void {
    this.propertyService.getVisits().subscribe(res => {
      this.myVisits = res;
      this.pendingVisitsCount.set(res.filter(v => v.status === 'SCHEDULED').length);
    });
  }

  loadNotifications(): void {
    this.propertyService.getNotifications().subscribe(res => {
      this.notifications = res;
      this.unreadNotificationsCount.set(res.filter(n => !n.isRead).length);
    });
  }

  markNotificationRead(id: string): void {
    this.propertyService.markNotificationRead(id).subscribe(() => {
      this.loadNotifications();
    });
  }

  selectProperty(p: Models.Property): void {
    this.selectedProperty.set(p);
    this.detailSubTab = 'verify';
    
    // Load sub resources
    this.propertyService.getImages(p.id).subscribe(res => this.propertyImages = res);
    this.propertyService.getVideos(p.id).subscribe(res => this.propertyVideos = res);
    this.propertyService.getDocuments(p.id).subscribe(res => this.propertyDocs = res);
    this.propertyService.getTimeline(p.id).subscribe(res => this.timeline = res);
    
    this.propertyService.getAiVerification(p.id).subscribe({
      next: (res) => this.aiReport = res,
      error: () => this.aiReport = null
    });

    // Extract govt verify status from timeline or direct if matching endpoints
    this.govtVerification = null; 
  }

  // Location selector handler
  onLocationSelected(e: any): void {
    this.propertyForm.patchValue({
      latitude: Number(e.lat.toFixed(6)),
      longitude: Number(e.lng.toFixed(6)),
      address: e.address || this.propertyForm.value.address,
      village: e.village || this.propertyForm.value.village,
      district: e.district || this.propertyForm.value.district,
      state: e.state || this.propertyForm.value.state,
      pincode: e.pincode || this.propertyForm.value.pincode,
      area: e.area > 0 ? e.area : this.propertyForm.value.area
    });
    this.lastDrawnBoundary = e.boundary || [];
  }

  // Upload Property Photo
  onUploadImage(event: any, propId: string): void {
    const file = event.target.files[0];
    if (!file) return;

    this.uploadLoading = true;
    this.cloudinaryService.uploadFile(file).subscribe({
      next: (uploadRes) => {
        const payload = {
          imageUrl: uploadRes.secure_url,
          thumbnailUrl: this.cloudinaryService.getThumbnailUrl(uploadRes),
          displayOrder: this.propertyImages.length + 1
        };

        this.propertyService.uploadImage(propId, payload).subscribe(newImg => {
          this.propertyImages.push(newImg);
          this.uploadLoading = false;
        });
      },
      error: () => this.uploadLoading = false
    });
  }

  // Upload Video Walkthrough
  onUploadVideo(event: any, propId: string): void {
    const file = event.target.files[0];
    if (!file) return;

    this.uploadLoading = true;
    this.cloudinaryService.uploadFile(file).subscribe({
      next: (uploadRes) => {
        const payload = {
          videoUrl: uploadRes.secure_url,
          duration: uploadRes.duration ? Math.round(uploadRes.duration) : 120,
          thumbnailUrl: this.cloudinaryService.getThumbnailUrl(uploadRes)
        };

        this.propertyService.uploadVideo(propId, payload).subscribe(newVid => {
          this.propertyVideos.push(newVid);
          this.uploadLoading = false;
        });
      },
      error: () => this.uploadLoading = false
    });
  }

  // Upload Legal Doc
  onUploadDoc(event: any, propId: string): void {
    const file = event.target.files[0];
    if (!file) return;

    this.docLoading = true;
    this.cloudinaryService.uploadFile(file).subscribe({
      next: (uploadRes) => {
        const payload = {
          documentType: this.selectedDocType,
          fileUrl: uploadRes.secure_url
        };

        this.propertyService.uploadDocument(propId, payload).subscribe(newDoc => {
          this.propertyDocs.push(newDoc);
          this.docLoading = false;
        });
      },
      error: () => this.docLoading = false
    });
  }

  // Trigger OCR
  triggerOcr(docId: string): void {
    this.propertyService.runOcr(docId).subscribe(() => {
      // reload docs
      const p = this.selectedProperty();
      if (p) this.propertyService.getDocuments(p.id).subscribe(res => this.propertyDocs = res);
    });
  }

  // Run AI Verify
  runAiVerify(propId: string): void {
    this.aiLoading = true;
    this.propertyService.triggerAiVerify(propId).subscribe({
      next: (res) => {
        this.aiReport = res;
        this.aiLoading = false;
        // Celebrate!
        canvasConfetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
        // reload listings
        this.loadData();
      },
      error: () => this.aiLoading = false
    });
  }

  // Change scheduled tour visit status
  changeVisitStatus(visitId: string, status: 'CONFIRMED' | 'REJECTED'): void {
    this.propertyService.updateVisitStatus(visitId, status).subscribe(() => {
      this.loadData();
    });
  }

  // Add/Edit Listing Submit
  onAddProperty(): void {
    if (this.propertyForm.invalid) return;

    this.isSaving = true;
    const payload = { ...this.propertyForm.value };
    
    if (this.lastDrawnBoundary && this.lastDrawnBoundary.length > 0) {
      payload.description = (payload.description || '') + 
        `\n\n[BOUNDS]: ${JSON.stringify(this.lastDrawnBoundary)}`;
    }

    if (this.isEditMode && this.editingPropertyId) {
      payload.status = 'PENDING_GOVT'; // Reset status for govt re-verify
      this.propertyService.updateProperty(this.editingPropertyId, payload).subscribe({
        next: () => this.finishSave(),
        error: () => this.isSaving = false
      });
    } else {
      this.propertyService.createProperty(payload).subscribe({
        next: () => this.finishSave(),
        error: () => this.isSaving = false
      });
    }
  }

  private finishSave(): void {
    this.isSaving = false;
    this.lastDrawnBoundary = [];
    this.isEditMode = false;
    this.editingPropertyId = null;
    this.propertyForm.reset({
      category: 'AGRICULTURAL',
      latitude: 16.3067,
      longitude: 80.4365,
      district: 'Guntur',
      village: 'Gorantla',
      state: 'Andhra Pradesh',
      pincode: '522034'
    });
    this.activeTab = 'listings';
    this.loadData();
  }

  openAddPropertyForm(): void {
    this.isEditMode = false;
    this.editingPropertyId = null;
    this.lastDrawnBoundary = [];
    this.propertyForm.reset({
      category: 'AGRICULTURAL',
      latitude: 16.3067,
      longitude: 80.4365,
      district: 'Guntur',
      village: 'Gorantla',
      state: 'Andhra Pradesh',
      pincode: '522034'
    });
    this.activeTab = 'add';
  }

  editProperty(p: Models.Property): void {
    this.isEditMode = true;
    this.editingPropertyId = p.id;
    
    const bounds = this.parseBoundaryFromDescription(p.description || '');
    this.lastDrawnBoundary = bounds ? bounds : [];

    const cleanDesc = (p.description || '').replace(/\[BOUNDS\]:\s*(\[.*?\])/, '').trim();

    this.propertyForm.patchValue({
      title: p.title,
      category: p.category,
      area: p.area,
      price: p.price,
      description: cleanDesc,
      surveyNumber: p.surveyNumber,
      address: p.address,
      latitude: p.latitude,
      longitude: p.longitude,
      district: p.district,
      village: p.village,
      state: p.state,
      pincode: p.pincode,
      threeSixtyImageUrl: p.threeSixtyImageUrl || ''
    });

    this.activeTab = 'add';
  }

  parseBoundaryFromDescription(desc: string): [number, number][] | null {
    try {
      const match = desc.match(/\[BOUNDS\]:\s*(\[.*?\])/);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
    } catch (e) {
      console.error('Failed to parse boundary coordinates', e);
    }
    return null;
  }

  prefillFromProperty(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const propertyId = select.value;
    if (!propertyId) return;

    const property = this.myProperties.find(p => p.id === propertyId);
    if (!property) return;

    // Prefill the form controls
    this.propertyForm.patchValue({
      title: property.title + ' (Copy)',
      category: property.category,
      area: property.area,
      price: property.price,
      // Strip boundary tags to keep text area clear
      description: (property.description || '').replace(/\n\n\[BOUNDS\]:\s*\[.*?\]/g, '').trim(),
      surveyNumber: property.surveyNumber,
      address: property.address,
      latitude: property.latitude,
      longitude: property.longitude,
      district: property.district || 'Guntur',
      village: property.village || 'Gorantla',
      state: property.state || 'Andhra Pradesh',
      pincode: property.pincode || '522034',
      threeSixtyImageUrl: property.threeSixtyImageUrl || ''
    });

    const customBoundary = this.parseBoundaryFromDescription(property.description || '');
    this.lastDrawnBoundary = customBoundary || [];

    // Reset select element index back to default placeholder
    select.value = '';

    canvasConfetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 }
    });
  }

  onThreeSixtyInputChange(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    const value = input.value.trim();

    if (value.startsWith('<iframe') || value.includes('src=')) {
      const match = value.match(/src=["'](.*?)["']/);
      if (match && match[1]) {
        setTimeout(() => {
          this.propertyForm.patchValue({
            threeSixtyImageUrl: match[1]
          });
        });
      }
    }
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
