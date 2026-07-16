import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PropertyService, Property } from '../../../core/services/property.service';
import { VerificationService } from '../../../core/services/verification.service';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="provider-dashboard animate-fade-in">
      <div class="header-actions-row">
        <div>
          <h1 class="glow-text-green">Provider Control Center</h1>
          <p>Manage your registered land plots, monitor ownership verification, and trigger AI document checks.</p>
        </div>
        <button mat-raised-button color="accent" routerLink="properties/create" class="create-btn glow-border-green btn-interactive">
          <span class="material-symbols-outlined">add_circle</span>
          Add New Property
        </button>
      </div>

      <div class="listings-section glass-panel">
        <div class="section-header">
          <h3>My Properties ({{ myProperties().length }})</h3>
        </div>
        <div class="properties-list" *ngIf="myProperties().length > 0; else noProperties">
          <div class="prop-item glass-panel" *ngFor="let item of myProperties()">
            <div class="prop-info" [routerLink]="['properties', item.id]">
              <h4>{{ item.title }}</h4>
              <p class="code">Code: {{ item.propertyCode }} | Category: {{ item.category }}</p>
              <div class="prop-stats">
                <span>Price: ₹{{ item.price | number }}</span>
                <span>Area: {{ item.area }} Acres</span>
              </div>
            </div>
            <div class="prop-actions">
              <span class="badge" [ngClass]="{
                'badge-approved': item.status === 'APPROVED',
                'badge-pending-ai': item.status === 'PENDING_AI',
                'badge-pending-govt': item.status === 'PENDING_GOVT',
                'badge-rejected': item.status === 'REJECTED'
              }">{{ item.status }}</span>

              <button mat-raised-button color="primary" class="btn-interactive"
                      *ngIf="item.status === 'PENDING_AI'" 
                      (click)="triggerAIVerify(item.id)" 
                      [disabled]="verifyingId() === item.id">
                <span *ngIf="verifyingId() !== item.id">Trigger AI Audit</span>
                <span *ngIf="verifyingId() === item.id">Auditing...</span>
              </button>
              
              <button mat-button class="view-detail-btn btn-interactive" [routerLink]="['properties', item.id]">
                View Detail
              </button>
            </div>
          </div>
        </div>
        <ng-template #noProperties>
          <div class="empty-state">
            <span class="material-symbols-outlined">gite</span>
            <p>You have not uploaded any properties yet.</p>
            <button mat-flat-button color="accent" class="btn-interactive" routerLink="properties/create">Create your first listing</button>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .provider-dashboard {
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
    .header-actions-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      h1 { margin-bottom: 8px; font-family: var(--font-display); }
      p { margin: 0; color: var(--text-secondary); }
      @media(max-width: 768px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
        .create-btn { width: 100%; }
      }
    }
    .create-btn {
      padding: 12px 24px;
      font-weight: 600;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .listings-section {
      padding: 24px;
      h3 { font-family: var(--font-display); margin: 0; }
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .properties-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .prop-item {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid var(--border-color);
      gap: 16px;
      transition: var(--transition-fast);
      &:hover { border-color: rgba(255, 255, 255, 0.1); }
      @media(max-width: 768px) {
        flex-direction: column;
        align-items: flex-start;
        .prop-actions { width: 100%; justify-content: space-between; }
      }
    }
    .prop-info {
      cursor: pointer;
      flex: 1;
      h4 { margin: 0 0 4px 0; font-size: 1.1rem; color: var(--text-primary); }
      .code { margin: 0 0 8px 0; font-size: 0.8rem; color: var(--text-muted); }
      .prop-stats {
        display: flex;
        gap: 16px;
        font-size: 0.85rem;
        color: var(--text-secondary);
      }
    }
    .prop-actions {
      display: flex;
      align-items: center;
      gap: 16px;
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
export class ProviderDashboardComponent implements OnInit {
  private readonly propertyService = inject(PropertyService);
  private readonly verificationService = inject(VerificationService);
  private readonly snackBar = inject(MatSnackBar);

  readonly myProperties = signal<Property[]>([]);
  readonly verifyingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadProperties();
  }

  loadProperties(): void {
    this.propertyService.getProperties().subscribe({
      next: (res) => {
        // Filter properties belonging to this seller/provider
        // (The backend already filters by provider if caller is PROVIDER role)
        this.myProperties.set(res || []);
      },
    });
  }

  triggerAIVerify(propertyId: string): void {
    this.verifyingId.set(propertyId);
    this.verificationService.triggerAIVerify(propertyId).subscribe({
      next: () => {
        this.verifyingId.set(null);
        this.snackBar.open('AI analysis completed. Verification reports logged.', 'Dismiss', { duration: 3000 });
        this.loadProperties();
      },
      error: () => {
        this.verifyingId.set(null);
        this.snackBar.open('Error triggering AI verification logs.', 'Dismiss', { duration: 3000 });
      },
    });
  }
}
