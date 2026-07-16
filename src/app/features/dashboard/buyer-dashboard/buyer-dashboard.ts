import { Component, OnInit, OnDestroy, inject, signal, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PropertyService, Property } from '../../../core/services/property.service';
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
  ],
  template: `
    <div class="buyer-dashboard animate-fade-in">
      <div class="header-row">
        <h1 class="glow-text-info">Explore Land Listings</h1>
        <p>Browse verified plots, inspect coordinate registry overlays, and schedule guided tours.</p>
      </div>

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

            <button mat-raised-button color="primary" class="clear-btn btn-interactive" (click)="clearFilters()">Clear Filters</button>
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
              <div class="property-card glass-panel card-interactive" *ngFor="let item of properties()" [routerLink]="['properties', item.id]">
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
    </div>
  `,
  styles: [`
    .buyer-dashboard {
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
    .header-row {
      h1 { margin-bottom: 8px; font-family: var(--font-display); }
      p { margin: 0; color: var(--text-secondary); }
    }
    .browse-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 24px;
      @media(max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }
    .filter-panel {
      padding: 20px;
      height: fit-content;
      border: 1px solid var(--border-color);
      h3 { margin-top: 0; font-family: var(--font-display); font-size: 1.15rem; }
      .filter-group {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .clear-btn { width: 100%; }
    }
    .results-layout {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .map-wrapper {
      padding: 12px;
      border: 1px solid var(--border-color);
    }
    .map-container {
      height: 380px;
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
      @media(max-width: 768px) {
        height: 240px;
      }
    }
    .listings-wrapper {
      h3 { font-family: var(--font-display); margin: 0 0 16px 0; }
    }
    .listings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }
    .property-card {
      overflow: hidden;
      border: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      height: 100%;
      .card-img {
        height: 180px;
        background-size: cover;
        background-position: center;
        position: relative;
      }
      .card-content {
        padding: 16px;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .card-title {
        margin: 0 0 8px 0;
        font-family: var(--font-display);
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
      }
      .card-loc {
        margin: 0 0 16px 0;
        font-size: 0.85rem;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        gap: 4px;
        span { font-size: 1.1rem; color: var(--accent-info); }
      }
      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        .price { font-weight: 700; font-size: 1.2rem; color: var(--accent-primary); }
        .area { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }
      }
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
      span { font-size: 4rem; }
      p { margin: 0; font-size: 1rem; }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
  `]
})
export class BuyerDashboardComponent implements OnInit, OnDestroy {
  private readonly propertyService = inject(PropertyService);
  private readonly snackBar = inject(MatSnackBar);

  private readonly mapContainer = viewChild<ElementRef>('mapContainer');

  readonly properties = signal<Property[]>([]);
  filters = { state: '', district: '', category: '', maxPrice: undefined };

  private map: mapboxgl.Map | null = null;
  private markers: mapboxgl.Marker[] = [];

  ngOnInit(): void {
    this.loadProperties();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  loadProperties(): void {
    this.propertyService.getProperties(this.filters).subscribe({
      next: (res) => {
        this.properties.set(res || []);
        setTimeout(() => this.initMap(res || []), 100);
      },
    });
  }

  onFilterChange(): void {
    this.loadProperties();
  }

  clearFilters(): void {
    this.filters = { state: '', district: '', category: '', maxPrice: undefined };
    this.loadProperties();
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
