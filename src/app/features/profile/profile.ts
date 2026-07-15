import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, User } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
  ],
  template: `
    <div class="profile-container">
      <div class="glass-panel profile-card" *ngIf="currentUser() as user">
        <div class="profile-header">
          <span class="material-symbols-outlined avatar glow-text-info">account_circle</span>
          <h2>{{ user.firstName }} {{ user.lastName }}</h2>
          <span class="badge" [ngClass]="user.role">{{ user.role }}</span>
        </div>

        <div class="profile-details-grid">
          <div class="detail-item">
            <span class="material-symbols-outlined icon">mail</span>
            <div class="detail-text">
              <span class="label">Email Address</span>
              <span class="value">{{ user.email }}</span>
            </div>
          </div>

          <div class="detail-item">
            <span class="material-symbols-outlined icon">phone</span>
            <div class="detail-text">
              <span class="label">Phone Number</span>
              <span class="value">{{ user.phoneNumber || 'Not provided' }}</span>
            </div>
          </div>

          <div class="detail-item">
            <span class="material-symbols-outlined icon">shield_person</span>
            <div class="detail-text">
              <span class="label">Security Level</span>
              <span class="value">{{ getSecurityText(user.role) }}</span>
            </div>
          </div>

          <div class="detail-item">
            <span class="material-symbols-outlined icon">workspace_premium</span>
            <div class="detail-text">
              <span class="label">Registry Permissions</span>
              <span class="value">{{ getPermissionsText(user.role) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .profile-container {
      padding: 40px 24px;
      display: flex;
      justify-content: center;
      min-height: calc(100vh - 70px);
      box-sizing: border-box;
      background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
      @media(max-width: 768px) {
        padding: 16px;
      }
    }
    .profile-card {
      width: 100%;
      max-width: 580px;
      padding: 40px;
    }
    .profile-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 40px;
      .avatar { font-size: 5rem; color: var(--accent-info); }
      h2 { margin: 12px 0 6px 0; font-size: 1.8rem; font-family: var(--font-display); }
    }
    .profile-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      @media(max-width: 480px) {
        grid-template-columns: 1fr;
      }
    }
    .detail-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px;
      background-color: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      .icon { font-size: 1.6rem; color: var(--accent-info); }
      .detail-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
        .label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .value { font-size: 0.95rem; font-weight: 500; color: var(--text-primary); }
      }
    }
    .badge.BUYER { background: rgba(2, 132, 199, 0.1); color: var(--accent-info); }
    .badge.PROVIDER { background: rgba(16, 185, 129, 0.1); color: var(--accent-primary); }
    .badge.GOVERNMENT_OFFICER { background: rgba(245, 158, 11, 0.1); color: var(--accent-secondary); }
    .badge.ADMIN { background: rgba(239, 68, 68, 0.1); color: var(--accent-danger); }
  `,
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);
  readonly currentUser = this.authService.currentUser;

  getSecurityText(role: string): string {
    switch (role) {
      case 'ADMIN': return 'Full Superuser Clearance';
      case 'GOVERNMENT_OFFICER': return 'Official Registry Clearance';
      case 'PROVIDER': return 'Seller/Developer Credentials';
      default: return 'Standard Watchlist Credentials';
    }
  }

  getPermissionsText(role: string): string {
    switch (role) {
      case 'ADMIN': return 'Override Statuses, System Diagnostics, User Controls';
      case 'GOVERNMENT_OFFICER': return 'Approve/Reject Deeds, Resolve Boundary Claims';
      case 'PROVIDER': return 'Register Lands, Run OCR & AI Checks, Developer API Integration';
      default: return 'Search Land Catalog, Bookmark Watchlist, Schedule Site Visits';
    }
  }
}
