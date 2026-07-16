import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('landlens');
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const token = this.authService.getAccessToken();
    const role = this.authService.getUserRole();
    if (token && role) {
      const path = window.location.pathname;
      if (path === '/' || path === '/login' || path === '/register') {
        this.redirectToDashboard(role);
      }
    }
  }

  private redirectToDashboard(role: string): void {
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
