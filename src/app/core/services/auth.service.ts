import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: 'BUYER' | 'PROVIDER' | 'GOVERNMENT_OFFICER' | 'ADMIN';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: 'BUYER' | 'PROVIDER' | 'GOVERNMENT_OFFICER' | 'ADMIN';
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = environment.apiUrl;

  // Signals for modern Angular state management
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = signal<boolean>(false);

  constructor() {
    this.loadSession();
  }

  register(payload: any): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/api/auth/register`, payload, {
      responseType: 'text' as 'json',
    });
  }

  login(payload: any): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/api/auth/login`, payload).pipe(
      tap((res) => {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        localStorage.setItem('userEmail', res.email);
        localStorage.setItem('userRole', res.role);
        this.isAuthenticated.set(true);
        this.fetchProfile().subscribe();
      })
    );
  }

  fetchProfile(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/api/users/me`).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      }),
      catchError((err) => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/api/users`);
  }

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }
    // We send refresh token as body { refreshToken }
    return this.http.post<LoginResponse>(`${this.baseUrl}/api/auth/refresh`, { refreshToken }).pipe(
      tap((res) => {
        localStorage.setItem('accessToken', res.accessToken);
        if (res.refreshToken) {
          localStorage.setItem('refreshToken', res.refreshToken);
        }
      })
    );
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      // Best effort logout on server
      this.http.post(`${this.baseUrl}/api/auth/logout`, { refreshToken }).subscribe({
        next: () => {},
        error: () => {},
      });
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  getUserRole(): string | null {
    return localStorage.getItem('userRole');
  }

  private loadSession(): void {
    const token = this.getAccessToken();
    const role = this.getUserRole();
    const email = localStorage.getItem('userEmail');
    if (token && role && email) {
      this.isAuthenticated.set(true);
      // Pre-populate raw values, fetchProfile will verify and fetch full details
      this.currentUser.set({
        id: '',
        email,
        firstName: '',
        lastName: '',
        role: role as any,
      });
      this.fetchProfile().subscribe({
        error: () => this.logout(),
      });
    }
  }
}
