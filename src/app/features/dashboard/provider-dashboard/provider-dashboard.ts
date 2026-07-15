import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PropertyService, Property, Visit } from '../../../core/services/property.service';
import { DeveloperService, ApiKey, ApiLog } from '../../../core/services/developer.service';
import { VerificationService } from '../../../core/services/verification.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-provider-dashboard',
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
    MatSlideToggleModule,
    MatTabsModule,
  ],
  template: `
    <div class="provider-dashboard">
      <div class="header-actions-row">
        <div>
          <h1 class="glow-text-green">Provider Control Center</h1>
          <p>Manage your listings, audits, tours, and developer integrations.</p>
        </div>
        <button mat-raised-button color="accent" routerLink="properties/create" class="create-btn glow-border-green">
          <span class="material-symbols-outlined">add_circle</span>
          Add New Property
        </button>
      </div>

      <mat-tab-group [selectedIndex]="activeTabIndex()" (selectedIndexChange)="activeTabIndex.set($event)" class="dashboard-tabs">
        <!-- My Properties Tab -->
        <mat-tab label="My Lands">
          <div class="tab-content">
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

                    <button mat-raised-button color="primary" 
                            *ngIf="item.status === 'PENDING_AI'" 
                            (click)="triggerAIVerify(item.id)" 
                            [disabled]="verifyingId() === item.id">
                      <span *ngIf="verifyingId() !== item.id">Trigger AI Audit</span>
                      <span *ngIf="verifyingId() === item.id">Auditing...</span>
                    </button>
                    
                    <button mat-button class="view-detail-btn" [routerLink]="['properties', item.id]">
                      View Detail
                    </button>
                  </div>
                </div>
              </div>
              <ng-template #noProperties>
                <div class="empty-state">
                  <span class="material-symbols-outlined">gite</span>
                  <p>You have not uploaded any properties yet.</p>
                  <button mat-flat-button color="accent" routerLink="properties/create">Create your first listing</button>
                </div>
              </ng-template>
            </div>
          </div>
        </mat-tab>

        <!-- Tour Requests Tab -->
        <mat-tab label="Tour Requests">
          <div class="tab-content">
            <div class="visits-section glass-panel">
              <h3>Tour Requests Inbox</h3>
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
                    <button mat-mini-fab color="accent" (click)="updateVisit(visit.id, 'CONFIRMED')" class="glow-border-green">
                      <mat-icon>check</mat-icon>
                    </button>
                    <button mat-mini-fab color="warn" (click)="updateVisit(visit.id, 'REJECTED')" class="glow-border-danger">
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
        </mat-tab>

        <!-- Developer Integration Tab -->
        <mat-tab label="Developer Keys">
          <div class="tab-content">
            <div class="developer-toggle-panel glass-panel">
              <div class="toggle-header">
                <div>
                  <h3>Developer API Integration</h3>
                  <p>Enable developer mode to generate API keys for external applications to query your listings.</p>
                </div>
                <mat-slide-toggle [(ngModel)]="devModeEnabled"></mat-slide-toggle>
              </div>

              <div class="dev-portal" *ngIf="devModeEnabled()">
                <hr class="portal-divider" />
                <div class="dev-portal-grid">
                  <!-- Keys Management -->
                  <div class="keys-panel">
                    <h4>Active API Keys</h4>
                    <div class="generate-row">
                      <mat-form-field appearance="fill">
                        <mat-label>Key Description / Name</mat-label>
                        <input matInput [ngModel]="newKeyName()" (ngModelChange)="newKeyName.set($event)" placeholder="e.g. PartnerPortalIntegration" />
                      </mat-form-field>
                      <button mat-raised-button color="accent" (click)="generateKey()" [disabled]="!newKeyName()">Generate</button>
                    </div>

                    <!-- Keys List -->
                    <div class="keys-list" *ngIf="apiKeys().length > 0; else noKeys">
                      <div class="key-item glass-panel" *ngFor="let key of apiKeys()" [ngClass]="{ 'active-log-key': selectedKeyId() === key.id }">
                        <div class="key-details" (click)="selectKey(key.id!)">
                          <h5>{{ key.name }}</h5>
                          <p class="prefix">Prefix: <code>{{ key.prefix }}</code> | Status: {{ key.status }}</p>
                          <p class="raw-key" *ngIf="key.rawApiKey">
                            Raw Key (Copy this now!): <code>{{ key.rawApiKey }}</code>
                          </p>
                        </div>
                        <button mat-icon-button color="warn" (click)="revokeKey(key.id!)" title="Revoke Key">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>
                    </div>
                    <ng-template #noKeys>
                      <div class="empty-state mini">
                        <p>No API keys generated yet.</p>
                      </div>
                    </ng-template>
                  </div>

                  <!-- API Key Request Logs -->
                  <div class="logs-panel">
                    <h4>Request logs for selected key</h4>
                    <div class="logs-list" *ngIf="apiLogs().length > 0; else noLogs">
                      <div class="log-item" *ngFor="let log of apiLogs()">
                        <div class="log-meta">
                          <span class="method" [ngClass]="log.method">{{ log.method }}</span>
                          <span class="status" [ngClass]="{ 'success': log.statusCode < 400, 'error': log.statusCode >= 400 }">{{ log.statusCode }}</span>
                        </div>
                        <div class="log-details">
                          <p class="url"><code>{{ log.endpoint }}</code></p>
                          <p class="time">IP: {{ log.ipAddress }} | Time: {{ log.responseTimeMs }}ms | Date: {{ log.requestTimestamp }}</p>
                        </div>
                      </div>
                    </div>
                    <ng-template #noLogs>
                      <div class="empty-state mini">
                        <span class="material-symbols-outlined">terminal</span>
                        <p>Click on an API key on the left to load its traffic logs.</p>
                      </div>
                    </ng-template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- Support Help Tab -->
        <mat-tab label="AI Help & Support">
          <div class="tab-content help-tab">
            <div class="glass-panel help-card" style="padding: 24px;">
              <h3>AI Provider Agent Support</h3>
              <p>Have questions about registry passbook bounds, uploading media, or matching land deeds?</p>
              <div style="background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 16px;">
                <p style="font-weight: 600; color: var(--accent-info); margin-top: 0;">💡 Tip: Auto-Audits</p>
                <p style="margin-bottom: 0; font-size: 0.85rem;">You can trigger automated AI checks on any of your listings that are in the <strong>PENDING_AI</strong> status. This will execute document forgery checks and scan for overlapping claims instantly.</p>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
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
    .listings-section, .visits-section, .developer-toggle-panel {
      padding: 20px;
      h3 { font-family: var(--font-display); margin-bottom: 20px; }
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
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
      &:hover { border-color: rgba(255, 255, 255, 0.1); }
      @media(max-width: 600px) {
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
      gap: 12px;
    }
    .view-detail-btn {
      color: var(--accent-info);
    }
    .visits-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .visit-item {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid var(--border-color);
    }
    .visit-info {
      h4 { margin: 0 0 4px 0; font-size: 0.95rem; }
      .buyer { margin: 0 0 4px 0; font-size: 0.8rem; color: var(--text-muted); }
      .time {
        margin: 0; font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;
        span { font-size: 0.95rem; color: var(--accent-info); }
      }
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
      padding: 40px 20px;
      color: var(--text-muted);
      gap: 12px;
      text-align: center;
      span { font-size: 2.5rem; }
      p { margin: 0; font-size: 0.9rem; }
      &.mini { padding: 20px; }
    }
    .toggle-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      h3 { margin: 0 0 4px 0; font-family: var(--font-display); }
      p { margin: 0; color: var(--text-secondary); font-size: 0.85rem; }
    }
    .portal-divider {
      border: none;
      border-top: 1px solid var(--border-color);
      margin: 20px 0;
    }
    .dev-portal-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      @media(max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }
    .generate-row {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 20px;
      mat-form-field { flex: 1; margin-bottom: -1.25em; }
    }
    .keys-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .key-item {
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid var(--border-color);
      cursor: pointer;
      &.active-log-key {
        border-color: var(--accent-info);
        background: rgba(2, 132, 199, 0.04);
      }
    }
    .key-details {
      flex: 1;
      h5 { margin: 0 0 4px 0; font-size: 0.95rem; }
      .prefix { margin: 0 0 4px 0; font-size: 0.75rem; color: var(--text-secondary); code { background: #000; padding: 2px 4px; border-radius: 4px; } }
      .raw-key { margin: 4px 0 0 0; font-size: 0.75rem; color: var(--accent-secondary); code { background: #000; padding: 2px 4px; border-radius: 4px; } }
    }
    .logs-panel {
      h4 { margin-bottom: 20px; }
    }
    .logs-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 380px;
      overflow-y: auto;
    }
    .log-item {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      gap: 12px;
      font-size: 0.8rem;
    }
    .log-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
      min-width: 48px;
      .method { font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; }
      .method.GET { background: rgba(16, 185, 129, 0.15); color: var(--accent-primary); }
      .method.POST { background: rgba(2, 132, 199, 0.15); color: var(--accent-info); }
      .method.DELETE { background: rgba(239, 68, 68, 0.15); color: var(--accent-danger); }
      .status { font-weight: 600; font-size: 0.75rem; }
      .status.success { color: var(--accent-primary); }
      .status.error { color: var(--accent-danger); }
    }
    .log-details {
      flex: 1;
      .url { margin: 0 0 4px 0; code { background: #000; padding: 2px 4px; border-radius: 4px; font-size: 0.75rem; } }
      .time { margin: 0; color: var(--text-muted); font-size: 0.7rem; }
    }
    .tab-content {
      padding: 16px 0;
    }
  `,
})
export class ProviderDashboardComponent implements OnInit {
  private readonly propertyService = inject(PropertyService);
  private readonly developerService = inject(DeveloperService);
  private readonly verificationService = inject(VerificationService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  readonly myProperties = signal<Property[]>([]);
  readonly myVisits = signal<Visit[]>([]);
  readonly apiKeys = signal<ApiKey[]>([]);
  readonly apiLogs = signal<ApiLog[]>([]);
  
  readonly devModeEnabled = signal<boolean>(false);
  readonly verifyingId = signal<string | null>(null);
  readonly newKeyName = signal<string>('');
  readonly selectedKeyId = signal<string | null>(null);
  readonly activeTabIndex = signal<number>(0);

  ngOnInit(): void {
    this.loadProperties();
    this.loadVisits();
    this.loadApiKeys();

    this.route.queryParams.subscribe((params) => {
      const tab = params['tab'];
      if (tab === 'visits') {
        this.activeTabIndex.set(1);
      } else if (tab === 'developer') {
        this.devModeEnabled.set(true);
        this.activeTabIndex.set(2);
      } else if (tab === 'chat') {
        this.activeTabIndex.set(3);
      } else {
        this.activeTabIndex.set(0);
      }
    });
  }

  loadProperties(): void {
    this.propertyService.getProperties().subscribe({
      next: (res) => {
        this.myProperties.set(res || []);
      },
    });
  }

  loadVisits(): void {
    this.propertyService.getVisits().subscribe({
      next: (res) => {
        this.myVisits.set(res || []);
      },
    });
  }

  loadApiKeys(): void {
    this.developerService.getApiKeys().subscribe({
      next: (res) => {
        this.apiKeys.set(res || []);
      },
    });
  }

  triggerAIVerify(propertyId: string): void {
    this.verifyingId.set(propertyId);
    this.verificationService.triggerAIVerify(propertyId).subscribe({
      next: (report) => {
        this.verifyingId.set(null);
        this.snackBar.open(`AI Check complete! Trust Score: ${report.aiTrustScore}%`, 'Dismiss', { duration: 4000 });
        this.loadProperties();
      },
      error: () => {
        this.verifyingId.set(null);
        this.snackBar.open('Error executing AI Trust verify audit.', 'Dismiss', { duration: 3000 });
      },
    });
  }

  updateVisit(visitId: string, status: 'CONFIRMED' | 'REJECTED'): void {
    this.propertyService.updateVisitStatus(visitId, status).subscribe({
      next: () => {
        this.snackBar.open(`Tour visit booking ${status.toLowerCase()}`, 'Dismiss', { duration: 3000 });
        this.loadVisits();
      },
    });
  }

  generateKey(): void {
    if (!this.newKeyName()) return;
    this.developerService.createApiKey(this.newKeyName()).subscribe({
      next: (key) => {
        this.snackBar.open('API key created successfully!', 'Dismiss', { duration: 3000 });
        this.newKeyName.set('');
        this.loadApiKeys();
      },
    });
  }

  revokeKey(keyId: string): void {
    this.developerService.revokeApiKey(keyId).subscribe({
      next: () => {
        this.snackBar.open('API key revoked and disabled', 'Dismiss', { duration: 3000 });
        this.loadApiKeys();
        if (this.selectedKeyId() === keyId) {
          this.apiLogs.set([]);
          this.selectedKeyId.set(null);
        }
      },
    });
  }

  selectKey(keyId: string): void {
    this.selectedKeyId.set(keyId);
    this.developerService.getApiKeyLogs(keyId).subscribe({
      next: (logs) => {
        this.apiLogs.set(logs || []);
      },
      error: () => {
        this.apiLogs.set([]);
      },
    });
  }
}
