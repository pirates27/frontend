import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import {
  ProfileRedirectComponent,
  NotificationsRedirectComponent,
  PropertiesRedirectComponent,
  AiChatRedirectComponent,
} from './features/dashboard/redirects';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard-redirect').then((m) => m.DashboardRedirectComponent),
    canActivate: [authGuard],
  },

  // Buyer routes
  {
    path: 'dashboard/buyer',
    loadComponent: () => import('./features/dashboard/buyer-layout').then((m) => m.BuyerLayoutComponent),
    canActivate: [authGuard, roleGuard(['BUYER'])],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/buyer-dashboard/buyer-dashboard').then((m) => m.BuyerDashboardComponent),
      },
      {
        path: 'saved',
        loadComponent: () => import('./features/dashboard/buyer-dashboard/buyer-saved').then((m) => m.BuyerSavedComponent),
      },
      {
        path: 'visits',
        loadComponent: () => import('./features/dashboard/buyer-dashboard/buyer-visits').then((m) => m.BuyerVisitsComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.ProfileComponent),
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications').then((m) => m.NotificationsComponent),
      },
      {
        path: 'ai-chat',
        loadComponent: () => import('./features/ai-chat/chat-assistant/chat-assistant').then((m) => m.ChatAssistantComponent),
      },
      {
        path: 'properties/:id',
        loadComponent: () => import('./features/properties/property-detail/property-detail').then((m) => m.PropertyDetailComponent),
      },
    ],
  },

  // Provider routes
  {
    path: 'dashboard/provider',
    loadComponent: () => import('./features/dashboard/provider-layout').then((m) => m.ProviderLayoutComponent),
    canActivate: [authGuard, roleGuard(['PROVIDER'])],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/provider-dashboard/provider-dashboard').then((m) => m.ProviderDashboardComponent),
      },
      {
        path: 'visits',
        loadComponent: () => import('./features/dashboard/provider-dashboard/provider-visits').then((m) => m.ProviderVisitsComponent),
      },
      {
        path: 'api-keys',
        loadComponent: () => import('./features/dashboard/provider-dashboard/provider-api-keys').then((m) => m.ProviderApiKeysComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.ProfileComponent),
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications').then((m) => m.NotificationsComponent),
      },
      {
        path: 'ai-chat',
        loadComponent: () => import('./features/ai-chat/chat-assistant/chat-assistant').then((m) => m.ChatAssistantComponent),
      },
      {
        path: 'properties/create',
        loadComponent: () => import('./features/properties/property-create/property-create').then((m) => m.PropertyCreateComponent),
      },
      {
        path: 'properties/:id',
        loadComponent: () => import('./features/properties/property-detail/property-detail').then((m) => m.PropertyDetailComponent),
      },
    ],
  },

  // Officer routes
  {
    path: 'dashboard/officer',
    loadComponent: () => import('./features/dashboard/officer-layout').then((m) => m.OfficerLayoutComponent),
    canActivate: [authGuard, roleGuard(['GOVERNMENT_OFFICER'])],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/officer-dashboard/officer-dashboard').then((m) => m.OfficerDashboardComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.ProfileComponent),
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications').then((m) => m.NotificationsComponent),
      },
      {
        path: 'properties/:id',
        loadComponent: () => import('./features/properties/property-detail/property-detail').then((m) => m.PropertyDetailComponent),
      },
    ],
  },

  // Admin routes
  {
    path: 'dashboard/admin',
    loadComponent: () => import('./features/dashboard/admin-layout').then((m) => m.AdminLayoutComponent),
    canActivate: [authGuard, roleGuard(['ADMIN'])],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.ProfileComponent),
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications').then((m) => m.NotificationsComponent),
      },
    ],
  },

  // Redirects for legacy/generic routes
  { path: 'profile', component: ProfileRedirectComponent, canActivate: [authGuard] },
  { path: 'notifications', component: NotificationsRedirectComponent, canActivate: [authGuard] },
  { path: 'properties/:id', component: PropertiesRedirectComponent, canActivate: [authGuard] },
  { path: 'ai-chat', component: AiChatRedirectComponent, canActivate: [authGuard] },

  { path: '**', redirectTo: '/dashboard' },
];
