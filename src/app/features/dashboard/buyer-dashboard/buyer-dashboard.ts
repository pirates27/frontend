import { Component, OnInit, OnDestroy, inject, signal, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PropertyService, Property, Visit } from '../../../core/services/property.service';
import { ChatService } from '../../../core/services/chat.service';
import { environment } from '../../../../environments/environment';
import mapboxgl from 'mapbox-gl';

@Component({
  selector: 'app-buyer-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
  ],
  template: `
    <div class="buyer-dashboard">
      <mat-tab-group [selectedIndex]="activeTabIndex()" (selectedIndexChange)="activeTabIndex.set($event)" mat-stretch-tabs="false" mat-align-tabs="start" class="dashboard-tabs">
        <!-- Browse Tab -->
        <mat-tab label="Browse Properties">
          <div class="browse-layout">
            <!-- Filter Side Panel -->
            <div class="filter-panel glass-panel">
              <h3>Search Filters</h3>
              <div class="filter-group">
                <mat-form-field appearance="fill">
                  <mat-label>State</mat-label>
                  <input matInput [(ngModel)]="filters.state" (input)="onFilterChange()" placeholder="e.g. Andhra Pradesh" />
                </mat-form-field>

                <mat-form-field appearance="fill">
                  <mat-label>District</mat-label>
                  <input matInput [(ngModel)]="filters.district" (input)="onFilterChange()" placeholder="e.g. Guntur" />
                </mat-form-field>

                <mat-form-field appearance="fill">
                  <mat-label>Category</mat-label>
                  <mat-select [(ngModel)]="filters.category" (selectionChange)="onFilterChange()">
                    <mat-option value="">All Categories</mat-option>
                    <mat-option value="AGRICULTURAL">Agricultural</mat-option>
                    <mat-option value="RESIDENTIAL">Residential</mat-option>
                    <mat-option value="COMMERCIAL">Commercial</mat-option>
                    <mat-option value="INDUSTRIAL">Industrial</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="fill">
                  <mat-label>Max Price (₹)</mat-label>
                  <input matInput type="number" [(ngModel)]="filters.maxPrice" (input)="onFilterChange()" placeholder="e.g. 5000000" />
                </mat-form-field>

                <button mat-raised-button color="primary" class="clear-btn" (click)="clearFilters()">Clear Filters</button>
              </div>
            </div>

            <!-- Middle Map & List Layout -->
            <div class="results-layout">
              <div class="map-wrapper glass-panel">
                <div #mapContainer class="map-container"></div>
              </div>

              <div class="listings-wrapper">
                <h3>Matching Land Plots ({{ properties().length }})</h3>
                <div class="listings-grid" *ngIf="properties().length > 0; else noListings">
                  <div class="property-card glass-panel glass-panel-hover" *ngFor="let item of properties()" [routerLink]="['/properties', item.id]">
                    <div class="card-img" [style.background-image]="'url(' + (item.threeSixtyImageUrl || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600') + ')'">
                      <span class="badge badge-approved" *ngIf="item.status === 'APPROVED'">VERIFIED OWNER</span>
                      <span class="badge badge-pending-govt" *ngIf="item.status === 'PENDING_GOVT'">AUDIT IN PROGRESS</span>
                    </div>
                    <div class="card-content">
                      <h4 class="card-title">{{ item.title }}</h4>
                      <p class="card-loc"><span class="material-symbols-outlined">location_on</span> {{ item.address }}</p>
                      <div class="card-footer">
                        <span class="price">₹{{ item.price | number }}</span>
                        <span class="area">{{ item.area }} Acres</span>
                      </div>
                    </div>
                  </div>
                </div>
                <ng-template #noListings>
                  <div class="empty-state glass-panel">
                    <span class="material-symbols-outlined">map</span>
                    <p>No verified properties found matching filters.</p>
                  </div>
                </ng-template>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- Saved Tab -->
        <mat-tab label="My Bookmarks">
          <div class="tab-content">
            <h3>Saved Watchlist</h3>
            <div class="listings-grid" *ngIf="savedProperties().length > 0; else noSaved">
              <div class="property-card glass-panel glass-panel-hover" *ngFor="let item of savedProperties()" [routerLink]="['/properties', item.id]">
                <div class="card-img" [style.background-image]="'url(' + (item.threeSixtyImageUrl || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600') + ')'">
                  <span class="badge badge-approved">VERIFIED</span>
                </div>
                <div class="card-content">
                  <h4 class="card-title">{{ item.title }}</h4>
                  <p class="card-loc"><span class="material-symbols-outlined">location_on</span> {{ item.address }}</p>
                  <div class="card-footer">
                    <span class="price">₹{{ item.price | number }}</span>
                    <button mat-icon-button color="warn" (click)="unsave($event, item.id)">
                      <mat-icon>bookmark</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <ng-template #noSaved>
              <div class="empty-state glass-panel">
                <span class="material-symbols-outlined">bookmark_border</span>
                <p>No saved land bookmarks. Start browsing properties to save them!</p>
              </div>
            </ng-template>
          </div>
        </mat-tab>

        <!-- Visits Tab -->
        <mat-tab label="Guided Site Visits">
          <div class="tab-content">
            <h3>Scheduled Visit Tours</h3>
            <div class="visits-list" *ngIf="visits().length > 0; else noVisits">
              <div class="visit-card glass-panel" *ngFor="let item of visits()">
                <div class="visit-header">
                  <div>
                    <h4>{{ item.property?.title }}</h4>
                    <p class="survey">Survey Number: {{ item.property?.surveyNumber }}</p>
                  </div>
                  <span class="badge" [ngClass]="{
                    'badge-approved': item.status === 'CONFIRMED',
                    'badge-pending': item.status === 'PENDING',
                    'badge-rejected': item.status === 'REJECTED'
                  }">{{ item.status }}</span>
                </div>
                <div class="visit-details">
                  <div class="detail-item">
                    <span class="material-symbols-outlined">calendar_month</span>
                    <span>Date: {{ item.visitDate }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="material-symbols-outlined">schedule</span>
                    <span>Time: {{ item.visitTime }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="material-symbols-outlined">location_on</span>
                    <span>Address: {{ item.property?.address }}</span>
                  </div>
                </div>
                <div class="visit-actions">
                  <button mat-button color="primary" [routerLink]="['/properties', item.propertyId]">View Property Details</button>
                </div>
              </div>
            </div>
            <ng-template #noVisits>
              <div class="empty-state glass-panel">
                <span class="material-symbols-outlined">tour</span>
                <p>No scheduled site visits found. Schedule one from property details page!</p>
              </div>
            </ng-template>
          </div>
        </mat-tab>
      </mat-tab-group>

      <!-- Float Chat FAB -->
      <button class="ai-fab glow-border-info" (click)="openAIChat()">
        <span class="material-symbols-outlined">forum</span>
        <span>AI Assistant</span>
      </button>
    </div>
  `,
  styles: `
    .buyer-dashboard {
      padding: 24px;
      position: relative;
      min-height: calc(100vh - 70px);
      box-sizing: border-box;
      @media(max-width: 768px) {
        padding: 12px;
      }
    }
    .browse-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 24px;
      margin-top: 16px;
      @media(max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }
    .filter-panel {
      padding: 20px;
      height: fit-content;
      h3 { margin-bottom: 20px; font-family: var(--font-display); }
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .clear-btn {
      margin-top: 8px;
    }
    .results-layout {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .map-wrapper {
      height: 380px;
      width: 100%;
      overflow: hidden;
      position: relative;
    }
    .map-container {
      height: 100%;
      width: 100%;
      border-radius: 12px;
    }
    .listings-wrapper h3 {
      font-family: var(--font-display);
      margin-bottom: 16px;
    }
    .listings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    .property-card {
      cursor: pointer;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      text-decoration: none;
    }
    .card-img {
      height: 160px;
      background-size: cover;
      background-position: center;
      padding: 12px;
      display: flex;
      align-items: flex-start;
      position: relative;
    }
    .card-content {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .card-title {
      font-size: 1.1rem;
      margin: 0;
      color: var(--text-primary);
    }
    .card-loc {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 4px;
      span { font-size: 1rem; color: var(--accent-info); }
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border-color);
      .price { font-weight: 700; color: var(--accent-primary); font-size: 1.1rem; }
      .area { font-size: 0.8rem; color: var(--text-muted); }
    }
    .tab-content {
      padding: 20px 0;
      h3 { font-family: var(--font-display); margin-bottom: 20px; }
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--text-muted);
      gap: 16px;
      text-align: center;
      span { font-size: 3.5rem; }
      p { margin: 0; font-size: 1rem; }
    }
    .visits-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
      @media(max-width: 480px) {
        grid-template-columns: 1fr;
      }
    }
    .visit-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .visit-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      h4 { margin: 0; font-size: 1.1rem; }
      .survey { margin: 4px 0 0 0; font-size: 0.8rem; color: var(--text-muted); }
    }
    .visit-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: var(--text-secondary);
      span:first-child { font-size: 1.1rem; color: var(--accent-info); }
    }
    .visit-actions {
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid var(--border-color);
      padding-top: 12px;
      margin-top: 8px;
    }
    .ai-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 100;
      padding: 12px 24px;
      border-radius: 50px;
      background-color: var(--accent-info);
      color: var(--text-primary);
      border: none;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 10px 20px var(--glow-info);
      transition: var(--transition-fast);
      @media(max-width: 768px) {
        bottom: 80px; /* Shift up above bottom nav */
      }
      &:hover {
        transform: translateY(-2px);
      }
    }
  `,
})
export class BuyerDashboardComponent implements OnInit, OnDestroy {
  private readonly propertyService = inject(PropertyService);
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  private readonly mapContainer = viewChild<ElementRef>('mapContainer');

  readonly properties = signal<Property[]>([]);
  readonly savedProperties = signal<Property[]>([]);
  readonly visits = signal<Visit[]>([]);
  readonly activeTabIndex = signal<number>(0);
  
  readonly filters = {
    state: '',
    district: '',
    category: '',
    maxPrice: null as number | null,
  };

  private map: mapboxgl.Map | null = null;
  private markers: mapboxgl.Marker[] = [];

  ngOnInit(): void {
    this.loadProperties();
    this.loadSavedProperties();
    this.loadVisits();

    this.route.queryParams.subscribe((params) => {
      const tab = params['tab'];
      if (tab === 'saved') {
        this.activeTabIndex.set(1);
      } else if (tab === 'visits') {
        this.activeTabIndex.set(2);
      } else {
        this.activeTabIndex.set(0);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  loadProperties(): void {
    const queryFilters = {
      ...this.filters,
      maxPrice: this.filters.maxPrice === null ? undefined : this.filters.maxPrice,
    };
    this.propertyService.getProperties(queryFilters).subscribe({
      next: (res) => {
        // Filter out non-approved listings for buyers, keeping safety
        const approved = (res || []).filter(p => p.status === 'APPROVED' || p.status === 'PENDING_GOVT');
        this.properties.set(approved);
        this.initMap(approved);
      },
    });
  }

  loadSavedProperties(): void {
    this.propertyService.getSavedProperties().subscribe({
      next: (res) => {
        this.savedProperties.set(res || []);
      },
    });
  }

  loadVisits(): void {
    this.propertyService.getVisits().subscribe({
      next: (res) => {
        this.visits.set(res || []);
      },
    });
  }

  onFilterChange(): void {
    this.loadProperties();
  }

  clearFilters(): void {
    this.filters.state = '';
    this.filters.district = '';
    this.filters.category = '';
    this.filters.maxPrice = null;
    this.loadProperties();
  }

  unsave(event: MouseEvent, propertyId: string): void {
    event.stopPropagation();
    this.propertyService.unsaveProperty(propertyId).subscribe({
      next: () => {
        this.snackBar.open('Removed from bookmarks', 'Dismiss', { duration: 2000 });
        this.loadSavedProperties();
      },
    });
  }

  openAIChat(): void {
    this.chatService.createConversation('Land Documents Query').subscribe({
      next: (convo) => {
        this.router.navigate(['/ai-chat', convo.id]);
      },
      error: () => {
        // Go directly to chat hub if conversation creation fails or already exists
        this.router.navigate(['/ai-chat']);
      },
    });
  }

  private initMap(plots: Property[]): void {
    const container = this.mapContainer()?.nativeElement;
    if (!container) return;

    if (!this.map) {
      (mapboxgl as any).accessToken = environment.mapboxToken;
      this.map = new mapboxgl.Map({
        container: container,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [79.0882, 21.1458], // Center of India
        zoom: 4,
      });

      this.map.addControl(new mapboxgl.NavigationControl());
      this.map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }));
    }

    // Clear existing markers
    this.markers.forEach((m) => m.remove());
    this.markers = [];

    if (plots.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();

    plots.forEach((plot) => {
      if (!plot.longitude || !plot.latitude) return;

      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = plot.status === 'APPROVED' ? '#10b981' : '#f59e0b';
      el.style.border = '2px solid #ffffff';
      el.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
      el.style.cursor = 'pointer';

      // Animate map centering on marker click
      el.addEventListener('click', () => {
        this.map?.easeTo({
          center: [plot.longitude, plot.latitude],
          zoom: 12,
          duration: 1000,
        });
      });

      const popupHtml = `
        <div style="color: #1e293b; padding: 8px; font-family: sans-serif;">
          <h4 style="margin: 0 0 4px 0; font-weight: 600;">${plot.title}</h4>
          <p style="margin: 0 0 8px 0; font-size: 0.8rem; color: #64748b;">₹${plot.price.toLocaleString()} - ${plot.area} Acres</p>
          <a href="/dashboard/buyer/properties/${plot.id}" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; text-decoration: none;">View Detail</a>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([plot.longitude, plot.latitude])
        .setPopup(popup)
        .addTo(this.map!);

      this.markers.push(marker);
      bounds.extend([plot.longitude, plot.latitude]);
    });

    if (plots.length > 0 && this.map) {
      this.map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
    }
  }
}
