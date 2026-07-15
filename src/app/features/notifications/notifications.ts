import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService, NotificationAlert } from '../../core/services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="notifications-container">
      <div class="glass-panel notifications-card">
        <div class="card-header">
          <h2>Notifications Inbox</h2>
          <button mat-button color="primary" *ngIf="unreadCount() > 0" (click)="markAllAsRead()">Mark all as read</button>
        </div>

        <div class="notifications-list" *ngIf="notifications().length > 0; else emptyState">
          <div class="notif-row glass-panel" 
               *ngFor="let item of notifications()" 
               [class.unread]="!item.isRead"
               (click)="markRead(item)">
            <div class="notif-icon-col">
              <span class="material-symbols-outlined icon" [ngClass]="item.type">
                {{ getIcon(item.type) }}
              </span>
            </div>
            <div class="notif-body">
              <div class="title-row">
                <h4>{{ item.title }}</h4>
                <span class="dot" *ngIf="!item.isRead"></span>
              </div>
              <p class="desc">{{ item.message }}</p>
              <span class="time" *ngIf="item.createdTime">{{ item.createdTime | date:'medium' }}</span>
            </div>
          </div>
        </div>

        <ng-template #emptyState>
          <div class="empty-state">
            <span class="material-symbols-outlined empty-icon">notifications_off</span>
            <p>Your inbox is clear! You have no notifications.</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: `
    .notifications-container {
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
    .notifications-card {
      width: 100%;
      max-width: 680px;
      padding: 30px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      h2 { margin: 0; font-family: var(--font-display); }
    }
    .notifications-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .notif-row {
      padding: 16px;
      display: flex;
      gap: 16px;
      border: 1px solid var(--border-color);
      cursor: pointer;
      transition: var(--transition-fast);
      &:hover { border-color: rgba(255, 255, 255, 0.12); }
      &.unread {
        background-color: rgba(2, 132, 199, 0.04);
        border-color: rgba(2, 132, 199, 0.2);
      }
    }
    .notif-icon-col {
      .icon {
        font-size: 2rem;
        &.VERIFICATION { color: var(--accent-primary); }
        &.DISPUTE { color: var(--accent-danger); }
        &.ALERT { color: var(--accent-secondary); }
        &.CHAT { color: var(--accent-info); }
      }
    }
    .notif-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      .title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        h4 { margin: 0; font-size: 1rem; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background-color: var(--accent-danger); box-shadow: 0 0 8px var(--accent-danger); }
      }
      .desc { margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; }
      .time { font-size: 0.7rem; color: var(--text-muted); margin-top: 4px; }
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
      .empty-icon { font-size: 3.5rem; }
      p { margin: 0; font-size: 1rem; }
    }
  `,
})
export class NotificationsComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly snackBar = inject(MatSnackBar);

  readonly notifications = signal<NotificationAlert[]>([]);
  readonly unreadCount = signal<number>(0);

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: (res) => {
        this.notifications.set(res || []);
        this.unreadCount.set((res || []).filter((n) => !n.isRead).length);
      },
    });
  }

  markRead(item: NotificationAlert): void {
    if (item.isRead) return;

    this.notificationService.markAsRead(item.id).subscribe({
      next: () => {
        this.loadNotifications();
      },
    });
  }

  markAllAsRead(): void {
    const unread = this.notifications().filter((n) => !n.isRead);
    unread.forEach((n) => {
      this.notificationService.markAsRead(n.id).subscribe();
    });
    this.snackBar.open('All alerts marked read', 'Dismiss', { duration: 2500 });
    setTimeout(() => this.loadNotifications(), 500);
  }

  getIcon(type: string): string {
    switch (type) {
      case 'VERIFICATION': return 'verified_user';
      case 'DISPUTE': return 'gavel';
      case 'CHAT': return 'forum';
      default: return 'warning';
    }
  }
}
