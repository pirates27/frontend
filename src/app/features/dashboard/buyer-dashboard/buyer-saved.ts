import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PropertyService, Property } from '../../../core/services/property.service';

@Component({
  selector: 'app-buyer-saved',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="saved-dashboard animate-fade-in">
      <div class="header-row">
        <h1 class="glow-text-info">My Saved Watchlist</h1>
        <p>Bookmarked land listings for easy monitoring and quick access.</p>
      </div>

      <div class="listings-wrapper glass-panel">
        <div class="listings-grid" *ngIf="savedProperties().length > 0; else noSaved">
          <div class="property-card glass-panel card-interactive" *ngFor="let item of savedProperties()" [routerLink]="['/dashboard/buyer/properties', item.id]">
            <div class="card-img" [style.background-image]="'url(' + (item.threeSixtyImageUrl || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600') + ')'">
              <span class="badge badge-approved">VERIFIED</span>
            </div>
            <div class="card-content">
              <h4 class="card-title">{{ item.title }}</h4>
              <p class="card-loc"><span class="material-symbols-outlined">location_on</span> {{ item.address }}</p>
              <div class="card-footer">
                <span class="price">₹{{ item.price | number }}</span>
                <button mat-icon-button color="warn" class="btn-interactive" (click)="unsave($event, item.id)">
                  <mat-icon>bookmark</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </div>
        <ng-template #noSaved>
          <div class="empty-state">
            <span class="material-symbols-outlined">bookmark_border</span>
            <p>No saved land bookmarks. Start browsing properties to save them!</p>
            <button mat-raised-button color="primary" routerLink="/dashboard/buyer">Browse Properties</button>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .saved-dashboard {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      box-sizing: border-box;
      @media(max-width: 768px) {
        padding: 12px;
      }
    }
    .header-row {
      h1 { margin-bottom: 8px; font-family: var(--font-display); }
      p { margin: 0; color: var(--text-secondary); }
    }
    .listings-wrapper {
      padding: 24px;
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
export class BuyerSavedComponent implements OnInit {
  private readonly propertyService = inject(PropertyService);
  private readonly snackBar = inject(MatSnackBar);

  readonly savedProperties = signal<Property[]>([]);

  ngOnInit() {
    this.loadSaved();
  }

  loadSaved() {
    this.propertyService.getSavedProperties().subscribe({
      next: (res) => {
        this.savedProperties.set(res || []);
      }
    });
  }

  unsave(event: Event, id: string) {
    event.stopPropagation();
    this.propertyService.unsaveProperty(id).subscribe({
      next: () => {
        this.snackBar.open('Removed from bookmarks', 'Dismiss', { duration: 2500 });
        this.loadSaved();
      }
    });
  }
}
