import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PropertyService, Property } from '../../../core/services/property.service';
import { FraudService, FraudReport } from '../../../core/services/fraud.service';
import { VerificationService } from '../../../core/services/verification.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-officer-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
  ],
  template: `
    <div class="officer-dashboard">
      <div class="header-row">
        <h1 class="glow-text-gold">Inspector Registry & Disputes Portal</h1>
        <p>Review deeds, inspect boundary coordinates, audit AI forgery flags, and resolve land disputes.</p>
      </div>

      <mat-tab-group [selectedIndex]="activeTabIndex()" (selectedIndexChange)="activeTabIndex.set($event)" class="dashboard-tabs">
        <!-- Approvals Queue Tab -->
        <mat-tab label="Pending Approvals">
          <div class="tab-content">
            <div class="approvals-panel glass-panel">
              <h3>Approvals Queue ({{ pendingProperties().length }})</h3>
              <div class="list-wrapper" *ngIf="pendingProperties().length > 0; else noPending">
                <div class="queue-item glass-panel" *ngFor="let item of pendingProperties()">
                  <div class="item-info" [routerLink]="['properties', item.id]">
                    <h4>{{ item.title }}</h4>
                    <p class="meta">Code: {{ item.propertyCode }} | Survey No: {{ item.surveyNumber }}</p>
                    <p class="address"><span class="material-symbols-outlined">location_on</span> {{ item.address }}</p>
                  </div>
                  <div class="item-actions">
                    <span class="badge badge-pending-govt">PENDING GOVT</span>
                    <button mat-raised-button color="primary" [routerLink]="['properties', item.id]">Audit & Verify</button>
                  </div>
                </div>
              </div>
              <ng-template #noPending>
                <div class="empty-state">
                  <span class="material-symbols-outlined">verified_user</span>
                  <p>No land listings pending government approval.</p>
                </div>
              </ng-template>
            </div>
          </div>
        </mat-tab>

        <!-- Disputes Tab -->
        <mat-tab label="Disputes">
          <div class="tab-content">
            <div class="disputes-panel glass-panel">
              <h3>Fraud Disputes Inbox ({{ fraudReports().length }})</h3>
              <div class="list-wrapper" *ngIf="fraudReports().length > 0; else noFrauds">
                <div class="queue-item glass-panel" *ngFor="let report of fraudReports()">
                  <div class="item-info">
                    <div class="title-row">
                      <h4>{{ report.reason }}</h4>
                      <span class="eta-label"><span class="material-symbols-outlined">hourglass_empty</span> ETA: 3 Days</span>
                    </div>
                    <p class="meta">Reporter ID: {{ report.reporterId }} | Listing: {{ report.property?.title || 'Unknown Property' }}</p>
                    <p class="desc">"{{ report.description }}"</p>
                  </div>
                  <div class="item-actions">
                    <span class="badge" [ngClass]="{
                      'badge-approved': report.status === 'RESOLVED_DISMISSED',
                      'badge-rejected': report.status === 'RESOLVED_FRAUDULENT',
                      'badge-pending-govt': report.status === 'UNDER_INVESTIGATION',
                      'badge-pending-ai': report.status === 'PENDING'
                    }">{{ report.status }}</span>

                    <div class="dispute-buttons" *ngIf="report.status === 'PENDING' || report.status === 'UNDER_INVESTIGATION'">
                      <button mat-button color="accent" *ngIf="!report.officerId" (click)="assignReport(report.id)">
                        Assign Self
                      </button>
                      <div class="resolve-buttons" *ngIf="report.officerId">
                        <button mat-mini-fab color="accent" (click)="resolveReport(report.id, 'RESOLVED_DISMISSED')" title="Dismiss Complaint">
                          <mat-icon>check</mat-icon>
                        </button>
                        <button mat-mini-fab color="warn" (click)="resolveReport(report.id, 'RESOLVED_FRAUDULENT')" title="Mark as Fraudulent">
                          <mat-icon>close</mat-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <ng-template #noFrauds>
                <div class="empty-state">
                  <span class="material-symbols-outlined">gavel</span>
                  <p>No active land fraud reports in the system.</p>
                </div>
              </ng-template>
            </div>
          </div>
        </mat-tab>

        <!-- Compare Claims Tab -->
        <mat-tab label="Compare Claims">
          <div class="tab-content">
            <div class="comparison-panel glass-panel">
              <h3>Overlapping Claim & Title Deed Compare Tool</h3>
              <p class="subtitle">Select two conflicting properties to compare their deeds, coordinates, and resolve ownership title.</p>
              
              <div class="compare-selectors">
                <mat-form-field appearance="fill">
                  <mat-label>Select Property A (Existing Record)</mat-label>
                  <mat-select [(ngModel)]="comparePropAId" (selectionChange)="loadPropertyDetails('A')">
                    <mat-option *ngFor="let p of allProperties()" [value]="p.id">{{ p.title }} ({{ p.propertyCode }})</mat-option>
                  </mat-select>
                </mat-form-field>

                <div class="vs-badge">VS</div>

                <mat-form-field appearance="fill">
                  <mat-label>Select Property B (Conflicting Claim)</mat-label>
                  <mat-select [(ngModel)]="comparePropBId" (selectionChange)="loadPropertyDetails('B')">
                    <mat-option *ngFor="let p of allProperties()" [value]="p.id">{{ p.title }} ({{ p.propertyCode }})</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <!-- Clashing Warning Alert Banner -->
              <div class="dispute-alert-banner glass-panel glow-border-danger animate-fade-in" *ngIf="hasClash()">
                <span class="material-symbols-outlined text-red">warning</span>
                <div>
                  <strong style="color: var(--accent-danger)">Critical Clashing Bounds Alert!</strong>
                  <p style="margin: 4px 0 0 0; font-size: 0.82rem; color: var(--text-primary); line-height: 1.4;">
                    <span *ngIf="propADetails()?.surveyNumber === propBDetails()?.surveyNumber">⚠️ Identical Survey Number ({{ propADetails()?.surveyNumber }}) claimed by A and B. </span>
                    <span *ngIf="propADetails()?.latitude === propBDetails()?.latitude && propADetails()?.longitude === propBDetails()?.longitude">⚠️ Exact coordinate bounds overlap detected ({{ propADetails()?.latitude }}, {{ propADetails()?.longitude }}).</span>
                  </p>
                </div>
              </div>

              <div class="comparison-grid" *ngIf="propADetails() || propBDetails()">
                <!-- Card A -->
                <div class="compare-card glass-panel" *ngIf="propADetails() as a; else selectA">
                  <h4 class="card-side text-green">Property A (Record)</h4>
                  <div class="meta-field"><strong>Title:</strong> {{ a.title }}</div>
                  <div class="meta-field" [class.clash-highlight]="propBDetails() && a.surveyNumber === propBDetails()?.surveyNumber">
                    <strong>Survey No:</strong> {{ a.surveyNumber }}
                  </div>
                  <div class="meta-field" [class.clash-highlight]="propBDetails() && a.latitude === propBDetails()?.latitude && a.longitude === propBDetails()?.longitude">
                    <strong>Coordinates:</strong> {{ a.latitude }}, {{ a.longitude }}
                  </div>
                  <div class="meta-field"><strong>Address:</strong> {{ a.address }}</div>
                  <div class="meta-field"><strong>Price:</strong> ₹{{ a.price | number }}</div>
                  <div class="meta-field"><strong>Status:</strong> <span class="badge badge-approved">{{ a.status }}</span></div>
                  <div class="meta-field"><strong>OCR Text:</strong> <code>{{ a.description }}</code></div>
                  <button mat-raised-button color="accent" class="resolve-btn" (click)="confirmOwnership(a.id)">
                    Choose Owner A
                  </button>
                </div>
                <ng-template #selectA>
                  <div class="empty-state select-placeholder">Select property A to display record</div>
                </ng-template>

                <!-- Card B -->
                <div class="compare-card glass-panel" *ngIf="propBDetails() as b; else selectB">
                  <h4 class="card-side text-gold">Property B (New Claim)</h4>
                  <div class="meta-field"><strong>Title:</strong> {{ b.title }}</div>
                  <div class="meta-field" [class.clash-highlight]="propADetails() && b.surveyNumber === propADetails()?.surveyNumber">
                    <strong>Survey No:</strong> {{ b.surveyNumber }}
                  </div>
                  <div class="meta-field" [class.clash-highlight]="propADetails() && b.latitude === propADetails()?.latitude && b.longitude === propADetails()?.longitude">
                    <strong>Coordinates:</strong> {{ b.latitude }}, {{ b.longitude }}
                  </div>
                  <div class="meta-field"><strong>Address:</strong> {{ b.address }}</div>
                  <div class="meta-field"><strong>Price:</strong> ₹{{ b.price | number }}</div>
                  <div class="meta-field"><strong>Status:</strong> <span class="badge badge-pending">{{ b.status }}</span></div>
                  <div class="meta-field"><strong>OCR Text:</strong> <code>{{ b.description }}</code></div>
                  <button mat-raised-button color="accent" class="resolve-btn" (click)="confirmOwnership(b.id)">
                    Choose Owner B
                  </button>
                </div>
                <ng-template #selectB>
                  <div class="empty-state select-placeholder">Select property B to display record</div>
                </ng-template>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
    .officer-dashboard {
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
    .approvals-panel, .disputes-panel {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      h3 { font-family: var(--font-display); margin: 0; }
    }
    .list-wrapper {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 480px;
      overflow-y: auto;
    }
    .queue-item {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid var(--border-color);
      gap: 12px;
      &:hover { border-color: rgba(255, 255, 255, 0.1); }
      @media(max-width: 600px) {
        flex-direction: column;
        align-items: flex-start;
        .item-actions { width: 100%; justify-content: space-between; }
      }
    }
    .item-info {
      flex: 1;
      cursor: pointer;
      h4 { margin: 0 0 4px 0; font-size: 1rem; color: var(--text-primary); }
      .meta { margin: 0 0 6px 0; font-size: 0.75rem; color: var(--text-muted); }
      .address { margin: 0; font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; span { font-size: 1rem; color: var(--accent-info); } }
      .desc { margin: 8px 0 0 0; font-size: 0.8rem; color: var(--text-secondary); font-style: italic; background: rgba(0,0,0,0.15); padding: 8px; border-radius: 4px; }
    }
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
      h4 { margin: 0; }
    }
    .eta-label {
      font-size: 0.75rem;
      color: var(--accent-secondary);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
      span { font-size: 0.9rem; }
    }
    .item-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .dispute-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .resolve-buttons {
      display: flex;
      gap: 8px;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: var(--text-muted);
      gap: 12px;
      text-align: center;
      span { font-size: 2.5rem; }
      p { margin: 0; font-size: 0.9rem; }
    }
    .comparison-panel {
      padding: 24px;
      h3 { font-family: var(--font-display); margin-bottom: 4px; }
      .subtitle { color: var(--text-secondary); font-size: 0.85rem; margin: 0 0 20px 0; }
    }
    .compare-selectors {
      display: grid;
      grid-template-columns: 1fr 60px 1fr;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      mat-form-field { margin-bottom: -1.25em; }
      @media(max-width: 768px) {
        grid-template-columns: 1fr;
        .vs-badge { margin: 4px auto; }
      }
    }
    .vs-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 36px;
      width: 36px;
      border-radius: 50%;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      font-weight: 800;
      color: var(--accent-secondary);
      margin: 0 auto;
    }
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      @media(max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }
    .compare-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      border: 1px solid var(--border-color);
      .card-side { margin: 0; font-family: var(--font-display); font-size: 1.1rem; }
      .text-green { color: var(--accent-primary); }
      .text-gold { color: var(--accent-secondary); }
      .meta-field {
        font-size: 0.85rem;
        color: var(--text-secondary);
        transition: all 0.3s;
        strong { color: var(--text-primary); }
        code { background: #000; padding: 4px; display: block; border-radius: 4px; max-height: 80px; overflow-y: auto; font-size: 0.75rem; margin-top: 4px; }
      }
    }
    .clash-highlight {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 8px;
      border-radius: 8px;
      color: var(--accent-danger) !important;
      strong { color: #fff !important; }
    }
    .dispute-alert-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      margin-bottom: 24px;
      border-color: rgba(239, 68, 68, 0.4) !important;
      background: rgba(239, 68, 68, 0.08) !important;
      border-radius: 12px;
      box-shadow: 0 0 15px rgba(239, 68, 68, 0.1);
      span { font-size: 2.2rem; }
    }
    .resolve-btn {
      margin-top: 12px;
      font-weight: 600;
    }
    .select-placeholder {
      border: 1px dashed var(--border-color);
      border-radius: 12px;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
    }
    .tab-content {
      padding: 16px 0;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
  `,
})
export class OfficerDashboardComponent implements OnInit {
  private readonly propertyService = inject(PropertyService);
  private readonly fraudService = inject(FraudService);
  private readonly verificationService = inject(VerificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  readonly pendingProperties = signal<Property[]>([]);
  readonly fraudReports = signal<FraudReport[]>([]);
  readonly allProperties = signal<Property[]>([]);
  readonly activeTabIndex = signal<number>(0);

  comparePropAId = '';
  comparePropBId = '';
  readonly propADetails = signal<Property | null>(null);
  readonly propBDetails = signal<Property | null>(null);

  ngOnInit(): void {
    this.loadPending();
    this.loadFrauds();
    this.loadAllProperties();

    this.route.queryParams.subscribe((params) => {
      const tab = params['tab'];
      if (tab === 'disputes') {
        this.activeTabIndex.set(1);
      } else if (tab === 'compare') {
        this.activeTabIndex.set(2);
      } else {
        this.activeTabIndex.set(0);
      }
    });
  }

  loadPending(): void {
    this.propertyService.getProperties().subscribe({
      next: (res) => {
        const pending = (res || []).filter((p) => p.status === 'PENDING_GOVT');
        this.pendingProperties.set(pending);
      },
    });
  }

  loadFrauds(): void {
    this.fraudService.getAllFraudReports().subscribe({
      next: (res) => {
        this.fraudReports.set(res || []);
      },
    });
  }

  loadAllProperties(): void {
    this.propertyService.getProperties().subscribe({
      next: (res) => {
        this.allProperties.set(res || []);
      },
    });
  }

  hasClash(): boolean {
    const a = this.propADetails();
    const b = this.propBDetails();
    if (!a || !b) return false;
    return a.surveyNumber === b.surveyNumber || (a.latitude === b.latitude && a.longitude === b.longitude);
  }

  assignReport(reportId: string): void {
    const me = localStorage.getItem('userEmail') || 'officer';
    this.fraudService.assignFraudReport(reportId, me).subscribe({
      next: () => {
        this.snackBar.open('Dispute assigned to you successfully', 'Dismiss', { duration: 3000 });
        this.loadFrauds();
      },
    });
  }

  resolveReport(reportId: string, status: 'RESOLVED_FRAUDULENT' | 'RESOLVED_DISMISSED'): void {
    this.fraudService.resolveFraudReport(reportId, status).subscribe({
      next: () => {
        this.snackBar.open(`Dispute complaint status updated to ${status.toLowerCase()}`, 'Dismiss', { duration: 3000 });
        this.loadFrauds();
      },
    });
  }

  loadPropertyDetails(side: 'A' | 'B'): void {
    const id = side === 'A' ? this.comparePropAId : this.comparePropBId;
    if (!id) {
      if (side === 'A') this.propADetails.set(null);
      else this.propBDetails.set(null);
      return;
    }

    this.propertyService.getPropertyById(id).subscribe({
      next: (res) => {
        if (side === 'A') this.propADetails.set(res);
        else this.propBDetails.set(res);
      },
    });
  }

  confirmOwnership(propertyId: string): void {
    const isA = propertyId === this.comparePropAId;
    const correctId = isA ? this.comparePropAId : this.comparePropBId;
    const wrongId = isA ? this.comparePropBId : this.comparePropAId;

    this.verificationService.submitGovernmentVerify(correctId, {
      status: 'APPROVED',
      remarks: 'Ownership title confirmed after side-by-side deed comparison. Approved.',
    }).subscribe({
      next: () => {
        if (wrongId) {
          this.verificationService.submitGovernmentVerify(wrongId, {
            status: 'REJECTED',
            remarks: 'Title claim rejected after comparison audits. Marked fraudulent.',
          }).subscribe();
        }
        this.snackBar.open('Disputed claim resolved. Owner updated.', 'Dismiss', { duration: 3000 });
        this.loadPending();
        this.loadAllProperties();
        this.propADetails.set(null);
        this.propBDetails.set(null);
        this.comparePropAId = '';
        this.comparePropBId = '';
      },
    });
  }
}
