import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const hasSession = authService.isLoggedIn || Boolean(localStorage.getItem('access_token') || localStorage.getItem('refresh_token') || localStorage.getItem('user_role'));

  if (hasSession) {
    const requiredRoles = route.data['roles'] as string[];
    const role = (authService.userRole() || localStorage.getItem('user_role')) as any;
    
    if (requiredRoles && requiredRoles.length > 0) {
      if (!role || !requiredRoles.includes(role)) {
        // User has a session but not authorized for this specific route.
        // Redirect them to their appropriate dashboard instead of kicking to login!
        if (role) {
          authService.redirectBasedOnRole(role);
        } else {
          const fallbackRole = (localStorage.getItem('user_role') || 'BUYER') as any;
          authService.redirectBasedOnRole(fallbackRole);
        }
        return false;
      }
    }
    return true;
  }

  // Not logged in, redirect to login page with return URL
  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
