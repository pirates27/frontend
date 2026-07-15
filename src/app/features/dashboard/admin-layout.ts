import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, ChildrenOutletContexts } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';
import { slideInAnimation } from '../../core/animations/route.animations';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule
  ],
  animations: [slideInAnimation],
  template: `
    <mat-sidenav-container class="admin-container">
      <!-- Sidebar -->
      <mat-sidenav #sidenav mode="side" opened class="admin-sidenav">
        <div class="sidenav-header">
          <span class="logo">LandLens</span>
          <span class="role-badge">Admin</span>
        </div>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard/admin" [routerLinkActive]="['active']" [routerLinkActiveOptions]="{ exact: true }">
            <mat-icon>analytics</mat-icon>
            <span>Analytics</span>
          </a>
          <a mat-list-item routerLink="/dashboard/admin" [queryParams]="{ tab: 'users' }" routerLinkActive="active">
            <mat-icon>people</mat-icon>
            <span>Users Directory</span>
          </a>
          <a mat-list-item routerLink="/dashboard/admin/profile" routerLinkActive="active">
            <mat-icon>person</mat-icon>
            <span>Profile</span>
          </a>
          <a mat-list-item routerLink="/dashboard/admin/notifications" routerLinkActive="active">
            <mat-icon>notifications</mat-icon>
            <span>Notifications</span>
          </a>
        </mat-nav-list>
        <div class="sidenav-footer">
          <button mat-button (click)="logout()">
            <mat-icon>exit_to_app</mat-icon>
            Logout
          </button>
        </div>
      </mat-sidenav>

      <!-- Content -->
      <mat-sidenav-content>
        <mat-toolbar color="primary" class="admin-toolbar">
          <button mat-icon-button (click)="sidenav.toggle()" class="menu-toggle">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="spacer"></span>
          <button mat-icon-button [matMenuTriggerFor]="profileMenu">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #profileMenu="matMenu">
            <button mat-menu-item routerLink="/dashboard/admin/profile">Profile</button>
            <button mat-menu-item routerLink="/dashboard/admin/notifications">Notifications</button>
            <button mat-menu-item (click)="logout()">Logout</button>
          </mat-menu>
        </mat-toolbar>
        <div class="admin-content" [@routeAnimations]="getRouteAnimationData()">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .admin-container { height: 100vh; background-color: var(--bg-primary); }
    .admin-sidenav {
      width: 260px;
      background: var(--bg-secondary) !important;
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
    }
    .sidenav-header {
      padding: 24px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo { font-weight: 700; font-size: 1.4rem; color: var(--accent-primary); }
    .role-badge {
      background: var(--bg-tertiary);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.7rem;
      color: var(--text-secondary);
    }
    mat-nav-list a {
      color: var(--text-secondary) !important;
      border-radius: 8px;
      margin: 4px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    mat-nav-list a.active {
      background: rgba(2, 132, 199, 0.15) !important;
      color: var(--text-primary) !important;
      border: 1px solid rgba(2, 132, 199, 0.3);
    }
    mat-nav-list a mat-icon { margin-right: 12px; color: var(--accent-info); }
    .sidenav-footer {
      margin-top: auto;
      padding: 16px;
      border-top: 1px solid var(--border-color);
      button { color: var(--accent-danger); }
    }
    .admin-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background-color: var(--bg-secondary) !important;
      border-bottom: 1px solid var(--border-color);
    }
    .menu-toggle { display: none; }
    .spacer { flex: 1; }
    .admin-content {
      padding: 24px;
      background: 
        radial-gradient(rgba(15, 23, 42, 0.03) 1px, transparent 1px),
        linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
      background-size: 24px 24px, 100% 100%;
      min-height: calc(100vh - 64px);
      box-sizing: border-box;
      position: relative;
    }
    @media (max-width: 1023px) {
      .menu-toggle { display: inline-flex; }
      .admin-sidenav {
        width: 200px;
      }
    }
    @media (max-width: 767px) {
      .admin-sidenav { width: 80%; }
      .admin-content { padding: 16px; }
    }
  `]
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly contexts = inject(ChildrenOutletContexts);

  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.routeConfig?.path || '';
  }

  logout() { this.auth.logout(); }
}
