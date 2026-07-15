import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-redirect',
  standalone: true,
  template: `
    <div class="redirect-container">
      <div class="spinner"></div>
      <p>Redirecting to dashboard...</p>
    </div>
  `,
  styles: `
    .redirect-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      width: 100vw;
      background: var(--bg-primary);
      color: var(--text-secondary);
      gap: 16px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border-color);
      border-top-color: var(--accent-info);
      border-radius: 50%;
      animation: spin 1s infinite linear;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `
})
export class DashboardRedirectComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const role = this.authService.getUserRole();
    if (!role) {
      this.router.navigate(['/login']);
      return;
    }

    switch (role) {
      case 'BUYER':
        this.router.navigate(['/dashboard/buyer']);
        break;
      case 'PROVIDER':
        this.router.navigate(['/dashboard/provider']);
        break;
      case 'GOVERNMENT_OFFICER':
        this.router.navigate(['/dashboard/officer']);
        break;
      case 'ADMIN':
        this.router.navigate(['/dashboard/admin']);
        break;
      default:
        this.router.navigate(['/login']);
        break;
    }
  }
}
