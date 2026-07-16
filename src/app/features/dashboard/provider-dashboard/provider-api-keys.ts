import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DeveloperService, ApiKey, ApiLog } from '../../../core/services/developer.service';

@Component({
  selector: 'app-provider-api-keys',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="developer-dashboard animate-fade-in">
      <div class="header-row">
        <h1 class="glow-text-green">Developer Portal</h1>
        <p>Integrate LandLens listing queries directly inside your external web property portal apps.</p>
      </div>

      <div class="developer-toggle-panel glass-panel">
        <div class="toggle-header">
          <div>
            <h3>Developer API Integration</h3>
            <p>Enable developer mode to generate API keys for external applications to query your listings.</p>
          </div>
          <mat-slide-toggle [(ngModel)]="devModeEnabled"></mat-slide-toggle>
        </div>

        <div class="dev-portal" *ngIf="devModeEnabled">
          <hr class="portal-divider" />
          <div class="dev-portal-grid">
            <!-- Keys Management -->
            <div class="keys-panel">
              <h4>Active API Keys</h4>
              <div class="generate-row">
                <mat-form-field appearance="fill">
                  <mat-label>Key Description / Name</mat-label>
                  <input matInput [(ngModel)]="newKeyName" placeholder="e.g. PartnerPortalIntegration" />
                </mat-form-field>
                <button mat-raised-button color="accent" class="btn-interactive" (click)="generateKey()" [disabled]="!newKeyName">Generate</button>
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
                    <p class="time">IP: {{ log.ipAddress }} | Time: {{ log.responseTimeMs }}ms | Date: {{ log.requestTimestamp | date:'medium' }}</p>
                  </div>
                </div>
              </div>
              <ng-template #noLogs>
                <div class="empty-state mini">
                  <p>{{ selectedKeyId() ? 'No requests logged for this key.' : 'Select an API key to view its logs.' }}</p>
                </div>
              </ng-template>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .developer-dashboard {
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
    .developer-toggle-panel {
      padding: 24px;
    }
    .toggle-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      h3 { margin: 0; font-family: var(--font-display); }
      p { margin: 4px 0 0 0; color: var(--text-secondary); font-size: 0.85rem; }
    }
    .portal-divider { border: none; border-top: 1px solid var(--border-color); margin: 20px 0; }
    .dev-portal-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      @media(max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }
    .keys-panel, .logs-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      h4 { margin: 0; font-family: var(--font-display); font-size: 1.1rem; }
    }
    .generate-row {
      display: flex;
      gap: 12px;
      align-items: center;
      mat-form-field { flex: 1; margin-bottom: -1.25em; }
    }
    .keys-list, .logs-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 400px;
      overflow-y: auto;
    }
    .key-item {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid var(--border-color);
      transition: var(--transition-fast);
      &.active-log-key {
        border-color: var(--accent-info);
        background: rgba(2, 132, 199, 0.05);
      }
      .key-details {
        flex: 1;
        cursor: pointer;
        h5 { margin: 0 0 4px 0; font-family: var(--font-display); }
        .prefix { margin: 0 0 4px 0; font-size: 0.75rem; color: var(--text-secondary); code { background: rgba(0,0,0,0.15); padding: 2px 4px; border-radius: 4px; } }
        .raw-key { margin: 0; font-size: 0.8rem; color: var(--accent-secondary); code { font-weight: 600; background: #000; padding: 2px 4px; border-radius: 4px; } }
      }
    }
    .log-item {
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      display: flex;
      gap: 12px;
      align-items: center;
      background: var(--bg-secondary);
      .log-meta {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        min-width: 50px;
        .method { font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; }
        .method.GET { background: rgba(16, 185, 129, 0.1); color: var(--accent-primary); }
        .method.POST { background: rgba(2, 132, 199, 0.1); color: var(--accent-info); }
        .status { font-size: 0.75rem; font-weight: 600; }
        .status.success { color: var(--accent-primary); }
        .status.error { color: var(--accent-danger); }
      }
      .log-details {
        flex: 1;
        .url { margin: 0 0 4px 0; font-size: 0.8rem; code { word-break: break-all; } }
        .time { margin: 0; font-size: 0.7rem; color: var(--text-muted); }
      }
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px;
      color: var(--text-muted);
      border: 1px dashed var(--border-color);
      border-radius: 12px;
      text-align: center;
      p { margin: 0; font-size: 0.85rem; }
      &.mini { height: 100px; }
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
export class ProviderApiKeysComponent implements OnInit {
  private readonly developerService = inject(DeveloperService);
  private readonly snackBar = inject(MatSnackBar);

  devModeEnabled = false;
  newKeyName = '';
  readonly apiKeys = signal<ApiKey[]>([]);
  readonly selectedKeyId = signal<string | null>(null);
  readonly apiLogs = signal<ApiLog[]>([]);

  ngOnInit() {
    this.loadKeys();
  }

  loadKeys() {
    this.developerService.getApiKeys().subscribe({
      next: (res) => {
        this.apiKeys.set(res || []);
        if (res && res.length > 0) {
          this.devModeEnabled = true;
        }
      }
    });
  }

  generateKey() {
    if (!this.newKeyName) return;
    this.developerService.createApiKey(this.newKeyName).subscribe({
      next: (key: ApiKey) => {
        this.snackBar.open('New API key generated successfully!', 'Dismiss', { duration: 3000 });
        this.newKeyName = '';
        this.loadKeys();
      }
    });
  }

  revokeKey(keyId: string) {
    this.developerService.revokeApiKey(keyId).subscribe({
      next: () => {
        this.snackBar.open('API key revoked successfully', 'Dismiss', { duration: 2500 });
        if (this.selectedKeyId() === keyId) {
          this.selectedKeyId.set(null);
          this.apiLogs.set([]);
        }
        this.loadKeys();
      }
    });
  }

  selectKey(keyId: string) {
    this.selectedKeyId.set(keyId);
    this.developerService.getApiKeyLogs(keyId).subscribe({
      next: (res: ApiLog[]) => {
        this.apiLogs.set(res || []);
      }
    });
  }
}
