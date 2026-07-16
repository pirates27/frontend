import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const rootRedirectGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const hasSession = authService.isLoggedIn || Boolean(localStorage.getItem('access_token') || localStorage.getItem('refresh_token') || localStorage.getItem('user_role'));

  if (hasSession) {
    const role = (authService.userRole() || localStorage.getItem('user_role') || 'BUYER') as any;
    authService.redirectBasedOnRole(role);
  } else {
    router.navigate(['/auth/login']);
  }
  return false;
};
