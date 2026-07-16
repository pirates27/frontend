import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, ChildrenOutletContexts } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { slideInAnimation } from '../../core/animations/route.animations';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-buyer-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatMenuModule
  ],
  animations: [slideInAnimation],
  template: `
    <!-- Top Header -->
    <mat-toolbar color="primary" class="buyer-header">
      <span class="logo">LandLens</span>
      <span class="spacer"></span>
      <button mat-icon-button [matMenuTriggerFor]="profileMenu">
        <mat-icon [class.pulse-bell]="unreadCount > 0">account_circle</mat-icon>
      </button>
      <mat-menu #profileMenu="matMenu">
        <button mat-menu-item routerLink="/dashboard/buyer/profile">Profile</button>
        <button mat-menu-item routerLink="/dashboard/buyer/notifications">
          <mat-icon>notifications</mat-icon>
          Notifications
          <span class="badge" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
        </button>
        <button mat-menu-item (click)="logout()">Logout</button>
      </mat-menu>
    </mat-toolbar>

    <!-- Main Content -->
    <main class="buyer-content" [@routeAnimations]="getRouteAnimationData()">
      <router-outlet></router-outlet>
    </main>

    <!-- Bottom Navigation -->
    <nav class="bottom-nav">
      <a mat-button routerLink="/dashboard/buyer" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
        <mat-icon>home</mat-icon>
        <span>Properties</span>
      </a>
      <a mat-button routerLink="/dashboard/buyer/saved" routerLinkActive="active">
        <mat-icon>bookmark</mat-icon>
        <span>Saved</span>
      </a>

      <!-- Central Floating Action Button -->
      <button class="fab-center glow-border-info btn-interactive" routerLink="/dashboard/buyer/ai-chat" title="AI Chat Assistant">
        <mat-icon>chat</mat-icon>
      </button>

      <a mat-button routerLink="/dashboard/buyer/visits" routerLinkActive="active">
        <mat-icon>event</mat-icon>
        <span>Visits</span>
      </a>
      <a mat-button routerLink="/dashboard/buyer/profile" routerLinkActive="active">
        <mat-icon>person</mat-icon>
        <span>Profile</span>
      </a>
    </nav>
  `,
  styles: [`
    .buyer-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      padding: 0 16px;
      height: 56px;
      background-color: var(--bg-secondary) !important;
      border-bottom: 1px solid var(--border-color);
    }
    .spacer { flex: 1; }
    .logo { font-weight: 700; font-size: 1.2rem; color: var(--accent-primary); }
    .badge {
      background: var(--accent-danger);
      color: white;
      border-radius: 50%;
      padding: 2px 6px;
      font-size: 0.7rem;
      margin-left: 4px;
    }
    .buyer-content {
      padding: 16px;
      padding-bottom: 80px; /* space for bottom nav */
      min-height: calc(100vh - 56px - 80px);
      position: relative;
      background: 
        radial-gradient(rgba(15, 23, 42, 0.03) 1px, transparent 1px),
        var(--bg-primary);
      background-size: 24px 24px;
    }
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-around;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-color);
      padding: 8px 0;
      z-index: 1000;
      align-items: center;
    }
    .bottom-nav a {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.7rem;
      min-width: 64px;
      padding: 4px 8px;
      border-radius: 8px;
      transition: background 0.2s;
    }
    .bottom-nav a.active {
      color: var(--accent-info);
      background: rgba(2, 132, 199, 0.1);
    }
    .bottom-nav a mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    .fab-center {
      position: relative;
      top: -18px;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--accent-info);
      color: #fff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px var(--glow-info);
      cursor: pointer;
    }
    .fab-center mat-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
    }
    @media (min-width: 768px) {
      .bottom-nav { display: none; }
      .buyer-content { padding-bottom: 16px; }
    }
  `]
})
export class BuyerLayoutComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly contexts = inject(ChildrenOutletContexts);
  private pollSubscription?: Subscription;
  unreadCount = 0;

  ngOnInit() {
    this.loadUnreadCount();
    // Start notifications polling every 30s
    this.pollSubscription = interval(30000).subscribe(() => {
      this.loadUnreadCount();
    });
  }

  ngOnDestroy() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  loadUnreadCount() {
    this.notificationService.getNotifications().subscribe({
      next: (notifs) => {
        this.unreadCount = notifs.filter(n => !n.isRead).length;
      }
    });
  }

  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.routeConfig?.path || '';
  }

  logout() {
    this.auth.logout();
  }
}
