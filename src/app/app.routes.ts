import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { rootRedirectGuard } from './core/guards/root-redirect.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [rootRedirectGuard],
    children: []
  },
  {
    path: 'auth/login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'buyer',
    loadComponent: () => import('./features/buyer-dashboard/buyer-dashboard.component').then(m => m.BuyerDashboardComponent),
    canActivate: [authGuard],
    data: { roles: ['BUYER'] }
  },
  {
    path: 'provider',
    loadComponent: () => import('./features/provider-dashboard/provider-dashboard.component').then(m => m.ProviderDashboardComponent),
    canActivate: [authGuard],
    data: { roles: ['PROVIDER'] }
  },
  {
    path: 'officer',
    loadComponent: () => import('./features/govt-dashboard/govt-dashboard.component').then(m => m.GovtDashboardComponent),
    canActivate: [authGuard],
    data: { roles: ['GOVERNMENT_OFFICER', 'ADMIN'] }
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [authGuard],
    data: { roles: ['ADMIN', 'GOVERNMENT_OFFICER'] }
  },
  {
    path: 'properties/:id',
    loadComponent: () => import('./features/property-detail/property-detail.component').then(m => m.PropertyDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
