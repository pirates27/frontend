import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-panorama-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full min-h-[350px] bg-slate-950 rounded-2xl overflow-hidden shadow-lg border border-slate-800 flex flex-col justify-between">
      
      <!-- Invalid URL Screen -->
      <div *ngIf="errorMsg" class="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-300">
        <svg class="w-12 h-12 text-rose-500 mb-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h4 class="text-lg font-semibold text-white mb-2">Virtual Tour Load Error</h4>
        <p class="text-sm text-slate-400 max-w-sm mb-6">{{ errorMsg }}</p>
        <a *ngIf="extractedUrl" [href]="extractedUrl" target="_blank" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl shadow-md transition-all">
          Open Tour in New Tab
        </a>
      </div>

      <!-- Iframe Viewer Screen -->
      <ng-container *ngIf="!errorMsg && safeUrl">
        <div class="absolute inset-0 w-full h-full z-10 bg-black">
          <iframe 
            [src]="safeUrl"
            class="w-full h-full border-0"
            allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
          </iframe>
        </div>

        <!-- Gradient mask to cover Google "View on Google Maps" / "Interactive 360° View" strip -->
        <div class="panorama-google-mask"></div>
        <!-- Left mask: covers Google pegman / attribution icon -->
        <div class="panorama-google-mask-left"></div>
        <!-- Right mask: covers © copyright text -->
        <div class="panorama-google-mask-right"></div>
 
        <!-- Float Badge (top-left) -->
        <div class="absolute top-4 left-4 z-30 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full border border-slate-700/50 flex items-center gap-1.5 backdrop-blur-xs">
          <span class="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span>Interactive 360° View</span>
        </div>

        <!-- Float Button (top-right) -->
        <a 
          [href]="url" 
          target="_blank" 
          class="absolute top-4 right-4 z-30 bg-emerald-600/95 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-md border border-emerald-500/25 transition-all flex items-center gap-1.5 backdrop-blur-xs">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open Street View
        </a>
      </ng-container>


      <!-- Empty / Placeholder State -->
      <div *ngIf="!url" class="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <svg class="w-16 h-16 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <h4 class="text-base font-semibold text-slate-200 mb-1">No Virtual Tour Uploaded</h4>
        <p class="text-xs text-slate-500 max-w-xs">360° panorama views are verified by AI for boundary overlaps and duplicate claims.</p>
      </div>

    </div>
  `
})
export class PanoramaViewerComponent implements OnChanges {
  @Input() url: string = '';

  extractedUrl: string = '';
  safeUrl: SafeResourceUrl | null = null;
  errorMsg: string | null = null;

  private sanitizer = inject(DomSanitizer);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['url']) {
      this.extractedUrl = this.url || '';
      
      // Extract URL if user pasted an iframe embed code
      if (this.extractedUrl && typeof this.extractedUrl === 'string' && this.extractedUrl.trim().toLowerCase().startsWith('<iframe')) {
        const match = this.extractedUrl.match(/src\s*=\s*["']([^"']+)["']/i);
        if (match && match[1]) {
          this.extractedUrl = match[1];
        }
      }
      this.validateAndSanitizeUrl();
    }
  }

  private validateAndSanitizeUrl(): void {
    this.errorMsg = null;
    this.safeUrl = null;

    if (!this.extractedUrl) {
      return;
    }

    try {
      const parsedUrl = new URL(this.extractedUrl);
      const hostname = parsedUrl.hostname.toLowerCase();

      // Check if it belongs to supported providers
      const isMomento = hostname.includes('momento360.com');
      const isKuula = hostname.includes('kuula.co');
      const is360PhotoCam = hostname.includes('360photocam.com');
      const isGoogleMaps = hostname.includes('google.com') || hostname.includes('google.co.in');

      if (!isMomento && !isKuula && !is360PhotoCam && !isGoogleMaps) {
        this.errorMsg = 'This 360° provider is not officially supported. We support Google Maps, Momento360, Kuula, and 360PhotoCam.';
        return;
      }

      // Format URL for embedding if necessary
      let embedUrl = this.extractedUrl;

      if (isMomento && !this.extractedUrl.includes('/e/')) {
        // If it's Momento360 and not already an embed URL, warning/fallback
        // Note: Momento360 share link is usually of type https://momento360.com/e/u/xxxx
        this.errorMsg = 'Invalid Momento360 format. Please copy the embed or share link of the form: https://momento360.com/e/u/...';
        return;
      }

      if (isGoogleMaps && !this.extractedUrl.includes('/maps/')) {
        this.errorMsg = 'Invalid Google Maps format. Please provide a Google Maps street view embed URL.';
        return;
      }

      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    } catch (e) {
      this.errorMsg = 'The provided virtual tour link is not a valid URL.';
    }
  }
}
