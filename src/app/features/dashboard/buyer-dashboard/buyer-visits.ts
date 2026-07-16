import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PropertyService, Visit } from '../../../core/services/property.service';

@Component({
  selector: 'app-buyer-visits',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="visits-dashboard animate-fade-in">
      <div class="header-row">
        <h1 class="glow-text-info">Guided Site Visits</h1>
        <p>Monitor status of your scheduled land boundary verification tours.</p>
      </div>

      <div class="visits-wrapper glass-panel">
        <div class="visits-list" *ngIf="visits().length > 0; else noVisits">
          <div class="visit-card glass-panel" *ngFor="let item of visits()">
            <div class="visit-header">
              <div>
                <h4>{{ item.property?.title || 'Land Plot' }}</h4>
                <p class="survey">Survey Number: {{ item.property?.surveyNumber }}</p>
              </div>
              <span class="badge" [ngClass]="{
                'badge-approved': item.status === 'CONFIRMED',
                'badge-pending-govt': item.status === 'PENDING',
                'badge-rejected': item.status === 'REJECTED',
                'badge-approved-completed': item.status === 'COMPLETED'
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
              <button mat-raised-button color="primary" [routerLink]="['/dashboard/buyer/properties', item.propertyId]">
                View Property details
              </button>
            </div>
          </div>
        </div>
        <ng-template #noVisits>
          <div class="empty-state">
            <span class="material-symbols-outlined">tour</span>
            <p>No scheduled site visits found. Schedule one from property details page!</p>
            <button mat-raised-button color="primary" routerLink="/dashboard/buyer">Browse Properties</button>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .visits-dashboard {
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
    .visits-wrapper {
      padding: 24px;
    }
    .visits-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .visit-card {
      padding: 20px;
      border: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .visit-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      h4 { margin: 0 0 4px 0; font-family: var(--font-display); font-size: 1.1rem; }
      .survey { margin: 0; font-size: 0.8rem; color: var(--text-muted); }
    }
    .visit-details {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      @media(max-width: 600px) {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .detail-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        color: var(--text-secondary);
        span:first-child { color: var(--accent-info); }
      }
    }
    .visit-actions {
      display: flex;
      justify-content: flex-end;
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
    .badge-approved-completed {
      background: rgba(5, 150, 105, 0.1);
      color: var(--accent-primary);
      border: 1px solid rgba(5, 150, 105, 0.2);
    }
    @media (max-width: 600px) {
      .visit-header { flex-direction: column; gap: 8px; }
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
export class BuyerVisitsComponent implements OnInit {
  private readonly propertyService = inject(PropertyService);

  readonly visits = signal<Visit[]>([]);

  ngOnInit() {
    this.propertyService.getVisits().subscribe({
      next: (res) => {
        this.visits.set(res || []);
      }
    });
  }
}
