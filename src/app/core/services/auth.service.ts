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

// Cookie Helpers
function setCookie(name: string, value: string, days: number = 7) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  document.cookie = name + "=" + encodeURIComponent(value || "") + expires + "; path=/; SameSite=Strict; Secure";
}

function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length));
  }
  return null;
}

function eraseCookie(name: string) {
  document.cookie = name + '=; Max-Age=-99999999; path=/; SameSite=Strict; Secure';
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
        // Save to localStorage
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        localStorage.setItem('userEmail', res.email);
        localStorage.setItem('userRole', res.role);

        // Save to cookies
        setCookie('accessToken', res.accessToken);
        setCookie('refreshToken', res.refreshToken);
        setCookie('userEmail', res.email);
        setCookie('userRole', res.role);

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
        if (err.status === 401 || err.status === 403) {
          this.logout();
        }
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
    return this.http.post<LoginResponse>(`${this.baseUrl}/api/auth/refresh`, { refreshToken }).pipe(
      tap((res) => {
        localStorage.setItem('accessToken', res.accessToken);
        setCookie('accessToken', res.accessToken);
        if (res.refreshToken) {
          localStorage.setItem('refreshToken', res.refreshToken);
          setCookie('refreshToken', res.refreshToken);
        }
      })
    );
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${this.baseUrl}/api/auth/logout`, { refreshToken }).subscribe({
        next: () => {},
        error: () => {},
      });
    }

    // Clear Storage
    localStorage.clear();
    sessionStorage.clear();

    // Erase Cookies
    eraseCookie('accessToken');
    eraseCookie('refreshToken');
    eraseCookie('userEmail');
    eraseCookie('userRole');

    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    let token = localStorage.getItem('accessToken');
    if (!token) {
      token = getCookie('accessToken');
      if (token) {
        localStorage.setItem('accessToken', token);
      }
    }
    return token;
  }

  getRefreshToken(): string | null {
    let token = localStorage.getItem('refreshToken');
    if (!token) {
      token = getCookie('refreshToken');
      if (token) {
        localStorage.setItem('refreshToken', token);
      }
    }
    return token;
  }

  getUserRole(): string | null {
    let role = localStorage.getItem('userRole');
    if (!role) {
      role = getCookie('userRole');
      if (role) {
        localStorage.setItem('userRole', role);
      }
    }
    return role;
  }

  private loadSession(): void {
    const token = this.getAccessToken();
    const role = this.getUserRole();
    let email = localStorage.getItem('userEmail');
    if (!email) {
      email = getCookie('userEmail');
      if (email) {
        localStorage.setItem('userEmail', email);
      }
    }

    if (token && role && email) {
      this.isAuthenticated.set(true);
      this.currentUser.set({
        id: '',
        email,
        firstName: '',
        lastName: '',
        role: role as any,
      });
      
      this.fetchProfile().subscribe({
        error: (err) => {
          // Do NOT log out for connection timeouts or database restarts.
          console.warn('Initial session check failed (transient network or database start):', err);
        },
      });
    }
  }
}
