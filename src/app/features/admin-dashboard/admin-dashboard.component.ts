import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { PropertyService } from '../../core/services/property.service';
import { AuthService } from '../../core/services/auth.service';
import * as Models from '../../core/models/property.models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col pb-12">
      <!-- Navbar -->
      <nav class="bg-slate-900 text-white shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white shadow-md">LL</div>
            <span class="text-xl font-bold tracking-tight text-white">Land<span class="text-emerald-400">Lens</span></span>
            <span class="bg-red-800/40 text-red-300 border border-red-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ml-2">Admin Panel</span>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right hidden sm:block">
              <p class="text-sm font-semibold text-white">Administrator</p>
              <p class="text-xs text-slate-400">{{ authService.currentUser()?.email }}</p>
            </div>
            <button (click)="logout()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-lg transition border border-slate-700/50">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <!-- Main Layout -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Sidebar Navigation -->
        <div class="lg:col-span-3 space-y-2">
          <button 
            (click)="activeTab = 'analytics'"
            [class.bg-emerald-600]="activeTab === 'analytics'"
            [class.text-white]="activeTab === 'analytics'"
            [class.bg-white]="activeTab !== 'analytics'"
            [class.text-slate-700]="activeTab !== 'analytics'"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-xs hover:bg-slate-100 transition-all font-semibold text-sm text-left">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2" /></svg>
            System Metrics
          </button>

          <button 
            (click)="activeTab = 'developer'"
            [class.bg-emerald-600]="activeTab === 'developer'"
            [class.text-white]="activeTab === 'developer'"
            [class.bg-white]="activeTab !== 'developer'"
            [class.text-slate-700]="activeTab !== 'developer'"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-xs hover:bg-slate-100 transition-all font-semibold text-sm text-left">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            Developer Portal
          </button>

          <button 
            (click)="activeTab = 'notifications'"
            [class.bg-emerald-600]="activeTab === 'notifications'"
            [class.text-white]="activeTab === 'notifications'"
            [class.bg-white]="activeTab !== 'notifications'"
            [class.text-slate-700]="activeTab !== 'notifications'"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-xs hover:bg-slate-100 transition-all font-semibold text-sm text-left">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            System Notifications
            <span *ngIf="unreadNotificationsCount() > 0" class="ml-auto px-2 py-0.5 bg-amber-500 text-white font-bold rounded-full text-[10px]">
              {{ unreadNotificationsCount() }}
            </span>
          </button>
        </div>

        <!-- Main Content -->
        <div class="lg:col-span-9 space-y-6">
          
          <!-- TAB 1: ANALYTICS -->
          <div *ngIf="activeTab === 'analytics'" class="space-y-6">
            <div class="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
              <h2 class="text-xl font-bold text-slate-800">Platform Analytics Dashboard</h2>
              <p class="text-xs text-slate-500 mt-1">Pre-aggregated rollups from daily platform database metrics.</p>
            </div>

            <!-- Dashboard widgets -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6" *ngIf="analytics">
              <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                <span class="text-[10px] font-extrabold uppercase text-slate-400">Property Views</span>
                <p class="text-2xl font-extrabold text-slate-800 mt-2">{{ analytics.propertyViews }}</p>
              </div>

              <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                <span class="text-[10px] font-extrabold uppercase text-slate-400">Total Searches</span>
                <p class="text-2xl font-extrabold text-slate-800 mt-2">{{ analytics.searchCount }}</p>
              </div>

              <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                <span class="text-[10px] font-extrabold uppercase text-slate-400">Audit Verifications</span>
                <p class="text-2xl font-extrabold text-emerald-600 mt-2">{{ analytics.verificationCount }}</p>
              </div>

              <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                <span class="text-[10px] font-extrabold uppercase text-slate-400">API Gateway Calls</span>
                <p class="text-2xl font-extrabold text-brand-600 mt-2">{{ analytics.apiCalls }}</p>
              </div>
            </div>

            <div *ngIf="!analytics" class="text-center p-12 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
              Loading analytics widgets...
            </div>
          </div>

          <!-- TAB 2: DEVELOPER PORTAL -->
          <div *ngIf="activeTab === 'developer'" class="space-y-6">
            <div class="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 class="text-xl font-bold text-slate-800">Developer API Key integration</h2>
                <p class="text-xs text-slate-500 mt-1">Generate external verification keys for partners and track HTTP usage logs.</p>
              </div>
              
              <button 
                (click)="showCreateKey = !showCreateKey"
                class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5">
                Generate API Key
              </button>
            </div>

            <!-- Create key drawer -->
            <div *ngIf="showCreateKey" class="bg-white p-5 rounded-2xl border border-emerald-500/20 shadow-sm space-y-4">
              <h3 class="font-bold text-slate-800 text-xs">Generate new external API key</h3>
              
              <div class="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  [(ngModel)]="newKeyName" 
                  placeholder="E.g., PartnerPortalIntegration" 
                  class="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs" />
                
                <button 
                  (click)="createKey()"
                  class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition">
                  Create Key
                </button>
              </div>

              <!-- Display generated raw Key (Only shown once!) -->
              <div *ngIf="generatedRawKey" class="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-2">
                <p class="font-bold">Write down this API Key (It will not be shown again!):</p>
                <div class="bg-white p-2 rounded-lg border border-amber-200 font-mono select-all font-bold text-center">
                  {{ generatedRawKey }}
                </div>
              </div>
            </div>

            <!-- List Active Keys -->
            <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
              <div class="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 class="font-bold text-slate-800 text-xs">Active salt-hashed keys</h3>
              </div>

              <div class="divide-y divide-slate-100" *ngIf="developerKeys.length > 0">
                <div *ngFor="let key of developerKeys" class="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 transition">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-slate-800 text-xs">{{ key.name }}</span>
                      <span class="px-2 py-0.5 text-[8px] font-extrabold uppercase rounded-full"
                            [ngClass]="key.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'">
                        {{ key.status }}
                      </span>
                    </div>
                    <p class="text-[10px] text-slate-400 font-mono">Prefix: {{ key.prefix }}*** | Key ID: {{ key.id || key.apiKeyId }}</p>
                  </div>

                  <div class="flex gap-2">
                    <button 
                      (click)="viewKeyLogs(key.id || key.apiKeyId!)"
                      class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg shadow-xs transition">
                      View Access Logs
                    </button>
                    <button 
                      (click)="revokeKey(key.id || key.apiKeyId!)"
                      class="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded-lg shadow-xs transition">
                      Revoke
                    </button>
                  </div>
                </div>
              </div>

              <div *ngIf="developerKeys.length === 0" class="p-8 text-center text-slate-400 text-xs">
                No active external developer integration keys found.
              </div>
            </div>

            <!-- API Access Logs Panel -->
            <div *ngIf="selectedKeyLogs" class="bg-white rounded-2xl border border-slate-150 p-6 space-y-4 shadow-sm">
              <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 class="font-bold text-slate-800 text-xs">HTTP Usage Access Logs (Last 50 calls)</h4>
                <button (click)="selectedKeyLogs = null" class="text-xs text-slate-400 hover:text-slate-600">Close Logs</button>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                      <th class="py-2.5 px-3">Method</th>
                      <th class="py-2.5 px-3">Endpoint</th>
                      <th class="py-2.5 px-3">Status</th>
                      <th class="py-2.5 px-3">IP Address</th>
                      <th class="py-2.5 px-3">Response Time</th>
                      <th class="py-2.5 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr *ngFor="let log of selectedKeyLogs">
                      <td class="py-2.5 px-3 font-bold" [ngClass]="log.method === 'GET' ? 'text-blue-600' : 'text-emerald-600'">{{ log.method }}</td>
                      <td class="py-2.5 px-3 truncate max-w-[200px]">{{ log.endpoint }}</td>
                      <td class="py-2.5 px-3 font-semibold" [ngClass]="log.statusCode < 300 ? 'text-emerald-600' : 'text-rose-500'">{{ log.statusCode }}</td>
                      <td class="py-2.5 px-3 text-slate-500">{{ log.ipAddress }}</td>
                      <td class="py-2.5 px-3 text-slate-500">{{ log.responseTimeMs }} ms</td>
                      <td class="py-2.5 px-3 text-slate-400 text-[10px]">{{ log.requestTimestamp | date:'medium' }}</td>
                    </tr>
                    <tr *ngIf="selectedKeyLogs.length === 0">
                      <td colspan="6" class="text-center py-6 text-slate-400">No calls logged for this API key.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <!-- TAB 3: NOTIFICATIONS -->
          <div *ngIf="activeTab === 'notifications'" class="space-y-6">
            <div class="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
              <h2 class="text-xl font-bold text-slate-800">System Notifications</h2>
              <p class="text-xs text-slate-500 mt-1">Alerts regarding verification statuses, visits, and account activity.</p>
            </div>

            <div class="space-y-4" *ngIf="notifications.length > 0">
              <div *ngFor="let notification of notifications" 
                   [ngClass]="notification.isRead ? 'bg-white opacity-70' : 'bg-emerald-50 border-emerald-200'"
                   class="p-5 rounded-2xl border border-slate-100 shadow-xs flex justify-between items-start gap-4 transition-all hover:opacity-100">
                <div class="space-y-1 flex-1">
                  <h3 class="font-bold text-sm text-slate-800">{{ notification.title }}</h3>
                  <p class="text-xs text-slate-600 leading-relaxed">{{ notification.message }}</p>
                  <p class="text-[10px] text-slate-400 font-medium">{{ notification.createdTime | date:'medium' }}</p>
                </div>
                
                <button *ngIf="!notification.isRead" (click)="markNotificationRead(notification.id)" class="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] rounded-lg transition">
                  Mark Read
                </button>
                <svg *ngIf="notification.isRead" class="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>

            <div *ngIf="notifications.length === 0" class="text-center p-12 bg-white rounded-2xl border border-slate-150 text-slate-400 text-xs">
              You have no notifications.
            </div>
          </div>

        </div>
      </main>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  authService = inject(AuthService);
  private propertyService = inject(PropertyService);

  activeTab: 'analytics' | 'developer' | 'notifications' = 'analytics';
  
  analytics: Models.AnalyticsDashboard | null = null;
  developerKeys: Models.DeveloperKey[] = [];
  selectedKeyLogs: Models.DeveloperKeyLog[] | null = null;
  notifications: Models.Notification[] = [];

  // Signals
  unreadNotificationsCount = signal<number>(0);

  // Key creation state
  showCreateKey = false;
  newKeyName = '';
  generatedRawKey: string | null = null;

  ngOnInit(): void {
    this.loadAnalytics();
    this.loadKeys();
    this.loadNotifications();
  }

  loadAnalytics(): void {
    this.propertyService.getAdminAnalytics().subscribe({
      next: (res) => this.analytics = res,
      error: () => this.analytics = null
    });
  }

  loadKeys(): void {
    this.propertyService.getDeveloperKeys().subscribe(res => {
      this.developerKeys = res;
    });
  }

  loadNotifications(): void {
    this.propertyService.getNotifications().subscribe(res => {
      this.notifications = res;
      this.unreadNotificationsCount.set(res.filter(n => !n.isRead).length);
    });
  }

  markNotificationRead(id: string): void {
    this.propertyService.markNotificationRead(id).subscribe(() => {
      this.loadNotifications();
    });
  }

  createKey(): void {
    if (!this.newKeyName.trim()) return;

    this.propertyService.createDeveloperKey(this.newKeyName).subscribe(res => {
      this.newKeyName = '';
      this.generatedRawKey = res.rawApiKey || null;
      this.loadKeys();
    });
  }

  viewKeyLogs(keyId: string): void {
    this.propertyService.getDeveloperKeyLogs(keyId).subscribe(res => {
      this.selectedKeyLogs = res;
    });
  }

  revokeKey(keyId: string): void {
    this.propertyService.deleteDeveloperKey(keyId).subscribe({
      next: () => {
        this.loadKeys();
        this.selectedKeyLogs = null;
      },
      error: (err) => {
        if (err.status === 200) {
          this.loadKeys();
          this.selectedKeyLogs = null;
        }
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
