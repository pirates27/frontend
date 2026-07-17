import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-radial from-slate-900 via-slate-950 to-black px-4 relative overflow-hidden">
      <!-- Ambient Background Glows -->
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div class="absolute bottom-1/3 right-1/4 w-80 h-80 bg-skybrand-500/10 rounded-full blur-3xl"></div>

      <!-- Decorative Image: Bottom Left -->
      <img 
        src="https://i.ibb.co/0yYZhMN0/f013f5e9-2f96-4f07-8dae-5d60087d250e.jpg"
        alt="Land aerial view"
        class="absolute bottom-0 left-0 w-[30rem] h-80 object-cover pointer-events-none z-0"
        style="border-top-right-radius: 2rem;"
      />

      <!-- Decorative Image: Top Right -->
      <img 
        src="https://i.ibb.co/ccmGDYJT/5ea71be8-b3a8-4cc7-84c6-ec15a7d6b37d.jpg"
        alt="Land scenery"
        class="absolute top-0 right-0 w-[30rem] h-80 object-cover pointer-events-none z-0"
        style="border-bottom-left-radius: 2rem;"
      />

      <!-- Glass Login Card -->
      <div class="w-full max-w-md p-8 glass-card-dark rounded-2xl shadow-2xl relative z-10 animate-slide-up border border-slate-800/60">
        
        <!-- Logo Header -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center gap-2 mb-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-skybrand-500 flex items-center justify-center shadow-lg">
              <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2m13 0V9a2 2 0 01-2 2h-2M3 10V6a2 2 0 012-2h2m0 0V3m0 7v10a2 2 0 002 2h7a2 2 0 002-2v-2m-9 0H3" />
              </svg>
            </div>
            <span class="text-2xl font-bold tracking-tight text-white">Land<span class="text-brand-500">Lens</span></span>
          </div>
          <p class="text-slate-400 text-sm">AI-Powered Government Land Verification Portal</p>
        </div>

        <!-- Alert messages -->
        <div *ngIf="errorMsg" class="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl flex items-start gap-2.5">
          <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{{ errorMsg }}</span>
        </div>

        <!-- Login Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-5">
          
          <!-- Email Input -->
          <div>
            <label class="block text-slate-300 text-sm font-medium mb-1.5" for="email">Email Address</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                </svg>
              </span>
              <input 
                id="email"
                type="email" 
                formControlName="email"
                class="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                placeholder="you@domain.com" />
            </div>
            <span *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.hasError('required')" class="text-xs text-rose-500 mt-1 block">Email is required</span>
            <span *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.hasError('email')" class="text-xs text-rose-500 mt-1 block">Invalid email format</span>
          </div>

          <!-- Password Input -->
          <div>
            <label class="block text-slate-300 text-sm font-medium mb-1.5" for="password">Password</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input 
                id="password"
                type="password" 
                formControlName="password"
                class="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                placeholder="••••••••" />
            </div>
            <span *ngIf="loginForm.get('password')?.touched && loginForm.get('password')?.hasError('required')" class="text-xs text-rose-500 mt-1 block">Password is required</span>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit"
            [disabled]="loginForm.invalid || loading"
            class="w-full mt-2 py-3 bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-sm flex items-center justify-center gap-2">
            <span *ngIf="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <!-- Form Footer -->
        <div class="mt-8 text-center text-xs text-slate-400">
          <span>Don't have an account? </span>
          <a routerLink="/auth/register" class="text-brand-400 hover:text-brand-300 font-semibold transition-colors">Create account</a>
        </div>

      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    if (this.authService.isLoggedIn) {
      const role = this.authService.userRole();
      if (role) {
        this.authService.redirectBasedOnRole(role);
      } else {
        this.router.navigate(['/buyer']);
      }
    }
  }

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  loading = false;
  errorMsg: string | null = null;

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMsg = null;

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        // Redirection is handled in AuthService.login() using switchMap
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.message || 'Invalid email or password. Please try again.';
      }
    });
  }
}
