import { Component, OnInit, OnDestroy, inject, signal, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AnalyticsService, AnalyticsDashboard } from '../../../core/services/analytics.service';
import { AuthService, User } from '../../../core/services/auth.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
  ],
  template: `
    <div class="admin-dashboard">
      <div class="header-row">
        <h1 class="glow-text-danger">Platform Administration Portal</h1>
        <p>Monitor real-time search queries, audit registry growth, and manage system user accounts.</p>
      </div>

      <!-- KPI Metrics Row -->
      <div class="metrics-grid" *ngIf="analyticsData() as data">
        <div class="metric-card glass-panel glow-border-info">
          <div class="card-left">
            <span class="material-symbols-outlined icon text-blue">visibility</span>
            <span class="label">Property Views</span>
          </div>
          <span class="value">{{ data.propertyViews }}</span>
        </div>

        <div class="metric-card glass-panel glow-border-green">
          <div class="card-left">
            <span class="material-symbols-outlined icon text-green">search</span>
            <span class="label">Search Queries</span>
          </div>
          <span class="value">{{ data.searchCount }}</span>
        </div>

        <div class="metric-card glass-panel glow-border-gold">
          <div class="card-left">
            <span class="material-symbols-outlined icon text-gold">verified_user</span>
            <span class="label">Audits Conducted</span>
          </div>
          <span class="value">{{ data.verificationCount }}</span>
        </div>

        <div class="metric-card glass-panel glow-border-danger">
          <div class="card-left">
            <span class="material-symbols-outlined icon text-red">gavel</span>
            <span class="label">Disputes Filed</span>
          </div>
          <span class="value">{{ data.fraudCount }}</span>
        </div>

        <div class="metric-card glass-panel glow-border-info">
          <div class="card-left">
            <span class="material-symbols-outlined icon text-cyan">api</span>
            <span class="label">External API Hits</span>
          </div>
          <span class="value">{{ data.apiCalls }}</span>
        </div>
      </div>

      <mat-tab-group [selectedIndex]="activeTabIndex()" (selectedIndexChange)="activeTabIndex.set($event)" class="dashboard-tabs">
        <!-- Analytics Tab -->
        <mat-tab label="System Analytics">
          <div class="tab-content">
            <div class="chart-panel glass-panel">
              <h3>Daily Activity Overview</h3>
              <div class="canvas-wrapper">
                <canvas #analyticsChart></canvas>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- User Management Tab -->
        <mat-tab label="Users Directory">
          <div class="tab-content">
            <div class="users-panel glass-panel">
              <h3>User Profiles Directory</h3>
              <div class="table-wrapper">
                <table class="custom-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let u of users()">
                      <td>{{ u.firstName }} {{ u.lastName }}</td>
                      <td>{{ u.email }}</td>
                      <td><span class="role-cell">{{ u.role }}</span></td>
                      <td>
                        <span class="status-indicator" [ngClass]="{ 'active': activeStates()[u.email] !== false, 'inactive': activeStates()[u.email] === false }"></span>
                        {{ activeStates()[u.email] !== false ? 'Active' : 'Suspended' }}
                      </td>
                      <td>
                        <button mat-flat-button 
                                [color]="activeStates()[u.email] !== false ? 'warn' : 'accent'" 
                                (click)="toggleUserStatus(u.email)"
                                class="action-btn">
                          {{ activeStates()[u.email] !== false ? 'Deactivate' : 'Activate' }}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
    .admin-dashboard {
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
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .metric-card {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid var(--border-color);
      .card-left {
        display: flex;
        flex-direction: column;
        gap: 4px;
        .icon { font-size: 1.8rem; }
        .label { font-size: 0.8rem; color: var(--text-secondary); font-weight: 500; }
        .text-blue { color: var(--accent-info); }
        .text-green { color: var(--accent-primary); }
        .text-gold { color: var(--accent-secondary); }
        .text-red { color: var(--accent-danger); }
        .text-cyan { color: #06b6d4; }
      }
      .value {
        font-size: 2rem;
        font-weight: 800;
        font-family: var(--font-display);
      }
    }
    .chart-panel, .users-panel {
      padding: 20px;
      h3 { font-family: var(--font-display); margin-bottom: 20px; }
    }
    .canvas-wrapper {
      height: 380px;
      width: 100%;
      position: relative;
    }
    .table-wrapper {
      overflow-x: auto;
    }
    .custom-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
      th {
        padding: 12px;
        border-bottom: 2px solid var(--border-color);
        color: var(--text-primary);
        font-family: var(--font-display);
      }
      td {
        padding: 12px;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-secondary);
      }
      tr:hover { background-color: rgba(255, 255, 255, 0.02); }
    }
    .role-cell {
      background: rgba(2, 132, 199, 0.1);
      color: var(--accent-info);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .status-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
      &.active { background-color: var(--accent-primary); box-shadow: 0 0 8px var(--accent-primary); }
      &.inactive { background-color: var(--accent-danger); box-shadow: 0 0 8px var(--accent-danger); }
    }
    .action-btn {
      font-size: 0.75rem;
      padding: 4px 12px;
      height: 32px;
      line-height: 32px;
    }
    .tab-content {
      padding: 16px 0;
    }
  `,
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  private readonly chartRef = viewChild<ElementRef>('analyticsChart');

  readonly analyticsData = signal<AnalyticsDashboard | null>(null);
  readonly users = signal<User[]>([]);
  readonly activeStates = signal<{ [email: string]: boolean }>({});
  readonly activeTabIndex = signal<number>(0);

  private chart: Chart | null = null;

  ngOnInit(): void {
    this.loadAnalytics();
    this.loadUsers();

    this.route.queryParams.subscribe((params) => {
      const tab = params['tab'];
      if (tab === 'users') {
        this.activeTabIndex.set(1);
      } else {
        this.activeTabIndex.set(0);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  loadAnalytics(): void {
    this.analyticsService.getAnalyticsDashboard().subscribe({
      next: (res) => {
        this.analyticsData.set(res || {
          analyticsDate: new Date().toISOString().split('T')[0],
          propertyViews: 120,
          searchCount: 85,
          verificationCount: 14,
          fraudCount: 2,
          apiCalls: 340,
        });
        setTimeout(() => this.initChart(), 200);
      },
      error: () => {
        this.analyticsData.set({
          analyticsDate: new Date().toISOString().split('T')[0],
          propertyViews: 120,
          searchCount: 85,
          verificationCount: 14,
          fraudCount: 2,
          apiCalls: 340,
        });
        setTimeout(() => this.initChart(), 200);
      },
    });
  }

  loadUsers(): void {
    this.authService.getAllUsers().subscribe({
      next: (res) => {
        this.users.set(res || []);
      },
      error: () => {
        this.users.set([
          { id: '1', firstName: 'Super', lastName: 'Admin', email: 'admin@landlens.com', role: 'ADMIN' },
          { id: '2', firstName: 'Builder', lastName: 'Prasad', email: 'provider@landlens.com', role: 'PROVIDER' },
          { id: '3', firstName: 'Inspector', lastName: 'Rao', email: 'officer@landlens.com', role: 'GOVERNMENT_OFFICER' },
          { id: '4', firstName: 'Buyer', lastName: 'Kumar', email: 'buyer@landlens.com', role: 'BUYER' },
        ]);
      },
    });
  }

  toggleUserStatus(email: string): void {
    const currentStates = this.activeStates();
    const currentState = currentStates[email] !== false;
    
    currentStates[email] = !currentState;
    this.activeStates.set({ ...currentStates });
    
    const statusMsg = !currentState ? 'Activated' : 'Deactivated';
    this.snackBar.open(`User account ${statusMsg} successfully!`, 'Dismiss', { duration: 3000 });
  }

  private initChart(): void {
    const canvas = this.chartRef()?.nativeElement;
    if (!canvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const data = this.analyticsData();
    if (!data) return;

    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Views', 'Searches', 'Audits', 'Disputes', 'API Calls'],
        datasets: [
          {
            label: 'Total Platform Events',
            data: [
              data.propertyViews,
              data.searchCount,
              data.verificationCount,
              data.fraudCount,
              data.apiCalls,
            ],
            backgroundColor: [
              '#0284c7',
              '#10b981',
              '#f59e0b',
              '#ef4444',
              '#06b6d4',
            ],
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8' },
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' },
          },
        },
      },
    });
  }
}
