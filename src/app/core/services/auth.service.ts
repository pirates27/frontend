import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RoleType, User } from '../models/property.models';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: RoleType;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Angular Signals for reactive state
  currentUser = signal<User | null>(null);
  accessToken = signal<string | null>(localStorage.getItem('access_token'));
  refreshTokenSignal = signal<string | null>(localStorage.getItem('refresh_token'));
  userRole = signal<RoleType | null>(localStorage.getItem('user_role') as RoleType);
  //asasmashwsdk ahbvroziv 
  constructor() {
    // If we have an access token on start, try to load profile silently
    if (this.accessToken() || localStorage.getItem('access_token')) {
      setTimeout(() => {
        this.getProfile().subscribe({
          error: (err) => {
            console.warn('Silent getProfile check on startup/reload encountered error. Retaining session across HMR:', err);
            // Do NOT call clearSession() here during HMR or temporary network delays!
          }
        });
      }, 0);
    }
  }

  // Register
  register(userData: any): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/api/auth/register`, userData, {
      responseType: 'text' // API returns plain text on successful registration
    });
  }

  // Login
  login(credentials: any): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/api/auth/login`, credentials).pipe(
      tap(res => {
        this.setSession(res);
      }),
      switchMap(res => {
        // Load the full profile details immediately after successful login
        return this.getProfile().pipe(
          tap(() => {
            this.redirectBasedOnRole(res.role);
          }),
          switchMap(() => [res]) // resolve with the login response
        );
      })
    );
  }

  // Load user profile
  getProfile(): Observable<User> {
    return this.http.get<User>(`${environment.apiBaseUrl}/api/users/me`).pipe(
      tap(user => {
        this.currentUser.set(user);
        this.userRole.set(user.role);
        localStorage.setItem('user_role', user.role);
      })
    );
  }

  // Logout
  logout(): Observable<any> {
    const token = this.refreshTokenSignal();
    this.clearSession();
    this.router.navigate(['/auth/login']);

    if (token) {
      // Send logout request with refresh token in body to revoke the session
      return this.http.post(`${environment.apiBaseUrl}/api/auth/logout`, {
        refreshToken: token
      }, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'text'
      }).pipe(
        catchError(err => throwError(() => err))
      );
    }
    return new Observable(sub => sub.complete());
  }

  // Refresh Token
  refreshAccessToken(): Observable<any> {
    const token = this.refreshTokenSignal();
    if (!token) {
      this.clearSession();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<any>(`${environment.apiBaseUrl}/api/auth/refresh`, {
      refreshToken: token
    }).pipe(
      tap(res => {
        const newAccessToken = res.accessToken || res.token;
        if (newAccessToken) {
          this.accessToken.set(newAccessToken);
          localStorage.setItem('access_token', newAccessToken);
          if (res.refreshToken) {
            this.refreshTokenSignal.set(res.refreshToken);
            localStorage.setItem('refresh_token', res.refreshToken);
          }
        }
      }),
      catchError(err => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  private setSession(authResult: LoginResponse): void {
    this.accessToken.set(authResult.accessToken);
    this.refreshTokenSignal.set(authResult.refreshToken);
    this.userRole.set(authResult.role);

    localStorage.setItem('access_token', authResult.accessToken);
    localStorage.setItem('refresh_token', authResult.refreshToken);
    localStorage.setItem('user_role', authResult.role);
  }

  private clearSession(): void {
    this.accessToken.set(null);
    this.refreshTokenSignal.set(null);
    this.userRole.set(null);
    this.currentUser.set(null);

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
  }

  redirectBasedOnRole(role: RoleType): void {
    switch (role) {
      case 'ADMIN':
        this.router.navigate(['/admin']);
        break;
      case 'GOVERNMENT_OFFICER':
        this.router.navigate(['/officer']);
        break;
      case 'PROVIDER':
        this.router.navigate(['/provider']);
        break;
      case 'BUYER':
      default:
        this.router.navigate(['/buyer']);
        break;
    }
  }

  // Convenience state helpers
  get isLoggedIn(): boolean {
    return Boolean(this.accessToken() || localStorage.getItem('access_token') || localStorage.getItem('refresh_token') || localStorage.getItem('user_role'));
  }

  get isAdmin(): boolean {
    return this.userRole() === 'ADMIN';
  }

  get isGovtOfficer(): boolean {
    return this.userRole() === 'GOVERNMENT_OFFICER';
  }

  get isProvider(): boolean {
    return this.userRole() === 'PROVIDER';
  }

  get isBuyer(): boolean {
    return this.userRole() === 'BUYER';
  }
}
