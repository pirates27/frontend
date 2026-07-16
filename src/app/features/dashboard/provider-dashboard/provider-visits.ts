import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PropertyService, Visit } from '../../../core/services/property.service';

@Component({
  selector: 'app-provider-visits',
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
        <h1 class="glow-text-green">Buyer Tour Requests</h1>
        <p>Review and schedule land boundary site tour requests from interested buyers.</p>
      </div>

      <div class="visits-wrapper glass-panel">
        <h3>Tour Requests Inbox ({{ myVisits().length }})</h3>
        <div class="visits-list" *ngIf="myVisits().length > 0; else noVisits">
          <div class="visit-item glass-panel" *ngFor="let visit of myVisits()">
            <div class="visit-info">
              <h4>{{ visit.property?.title || 'Land Plot' }}</h4>
              <p class="buyer">Scheduled by: {{ visit.buyerName || 'Interested Buyer' }}</p>
              <p class="time">
                <span class="material-symbols-outlined">calendar_month</span> {{ visit.visitDate }} | 
                <span class="material-symbols-outlined">schedule</span> {{ visit.visitTime }}
              </p>
            </div>
            <div class="visit-actions" *ngIf="visit.status === 'PENDING'; else visitStatus">
              <button mat-mini-fab color="accent" (click)="updateVisit(visit.id, 'CONFIRMED')" class="glow-border-green btn-interactive">
                <mat-icon>check</mat-icon>
              </button>
              <button mat-mini-fab color="warn" (click)="updateVisit(visit.id, 'REJECTED')" class="glow-border-danger btn-interactive">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <ng-template #visitStatus>
              <span class="badge" [ngClass]="{
                'badge-approved': visit.status === 'CONFIRMED',
                'badge-rejected': visit.status === 'REJECTED'
              }">{{ visit.status }}</span>
            </ng-template>
          </div>
        </div>
        <ng-template #noVisits>
          <div class="empty-state">
            <span class="material-symbols-outlined">tour</span>
            <p>No site tours scheduled by buyers yet.</p>
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
    .visit-item {
      padding: 16px;
      border: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      @media(max-width: 600px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        .visit-actions { width: 100%; justify-content: flex-end; }
      }
    }
    .visit-info {
      h4 { margin: 0 0 4px 0; font-family: var(--font-display); }
      .buyer { margin: 0 0 8px 0; font-size: 0.85rem; color: var(--text-secondary); }
      .time { margin: 0; font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; span { font-size: 1rem; color: var(--accent-info); } }
    }
    .visit-actions {
      display: flex;
      gap: 8px;
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
export class ProviderVisitsComponent implements OnInit {
  private readonly propertyService = inject(PropertyService);
  private readonly snackBar = inject(MatSnackBar);

  readonly myVisits = signal<Visit[]>([]);

  ngOnInit() {
    this.loadVisits();
  }

  loadVisits() {
    this.propertyService.getVisits().subscribe({
      next: (res) => {
        this.myVisits.set(res || []);
      }
    });
  }

  updateVisit(visitId: string, status: 'CONFIRMED' | 'REJECTED') {
    this.propertyService.updateVisitStatus(visitId, status).subscribe({
      next: () => {
        this.snackBar.open(`Tour request set to: ${status.toLowerCase()}`, 'Dismiss', { duration: 2500 });
        this.loadVisits();
      }
    });
  }
}
