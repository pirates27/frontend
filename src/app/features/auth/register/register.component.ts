import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RoleType } from '../../../core/models/property.models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-radial from-slate-900 via-slate-950 to-black py-12 px-4 relative overflow-hidden">
      <!-- Ambient Background Glows -->
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div class="absolute bottom-1/3 right-1/4 w-80 h-80 bg-skybrand-500/10 rounded-full blur-3xl"></div>

      <!-- Decorative Image: Bottom Left -->
      <img 
        src="https://i.ibb.co/0yYZhMN0/f013f5e9-2f96-4f07-8dae-5d60087d250e.jpg"
        alt="Land aerial view"
        class="absolute bottom-0 left-0 w-[32rem] object-contain pointer-events-none z-0"
        style="-webkit-mask-image: linear-gradient(to top right, black 20%, transparent 75%); mask-image: linear-gradient(to top right, black 20%, transparent 75%);"
      />

      <!-- Decorative Image: Top Right -->
      <img 
        src="https://i.ibb.co/ccmGDYJT/5ea71be8-b3a8-4cc7-84c6-ec15a7d6b37d.jpg"
        alt="Land scenery"
        class="absolute top-0 right-0 w-[32rem] object-contain pointer-events-none z-0"
        style="-webkit-mask-image: linear-gradient(to bottom left, black 20%, transparent 75%); mask-image: linear-gradient(to bottom left, black 20%, transparent 75%);"
      />

      <!-- Glass Register Card -->
      <div class="w-full max-w-lg p-8 glass-card-dark rounded-2xl shadow-2xl relative z-10 animate-slide-up border border-slate-800/60">
        
        <!-- Logo Header -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center gap-2 mb-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-skybrand-500 flex items-center justify-center shadow-lg">
              <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <span class="text-2xl font-bold tracking-tight text-white">Land<span class="text-brand-500">Lens</span></span>
          </div>
          <p class="text-slate-400 text-sm">Join a trusted platform for verified property listings</p>
        </div>

        <!-- Feedback Alert Messages -->
        <div *ngIf="errorMsg" class="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl flex items-start gap-2.5">
          <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{{ errorMsg }}</span>
        </div>

        <div *ngIf="successMsg" class="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl flex items-start gap-2.5">
          <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ successMsg }}</span>
        </div>

        <!-- Register Form -->
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-5">
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- First Name -->
            <div>
              <label class="block text-slate-300 text-sm font-medium mb-1.5" for="firstName">First Name</label>
              <input 
                id="firstName"
                type="text" 
                formControlName="firstName"
                class="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                placeholder="Prasad" />
              <span *ngIf="registerForm.get('firstName')?.touched && registerForm.get('firstName')?.hasError('required')" class="text-xs text-rose-500 mt-1 block">First Name is required</span>
            </div>

            <!-- Last Name -->
            <div>
              <label class="block text-slate-300 text-sm font-medium mb-1.5" for="lastName">Last Name</label>
              <input 
                id="lastName"
                type="text" 
                formControlName="lastName"
                class="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                placeholder="Builder" />
              <span *ngIf="registerForm.get('lastName')?.touched && registerForm.get('lastName')?.hasError('required')" class="text-xs text-rose-500 mt-1 block">Last Name is required</span>
            </div>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-slate-300 text-sm font-medium mb-1.5" for="email">Email Address</label>
            <input 
              id="email"
              type="email" 
              formControlName="email"
              class="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
              placeholder="name@domain.com" />
            <span *ngIf="registerForm.get('email')?.touched && registerForm.get('email')?.hasError('required')" class="text-xs text-rose-500 mt-1 block">Email is required</span>
            <span *ngIf="registerForm.get('email')?.touched && registerForm.get('email')?.hasError('email')" class="text-xs text-rose-500 mt-1 block">Invalid email format</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Phone Number -->
            <div>
              <label class="block text-slate-300 text-sm font-medium mb-1.5" for="phoneNumber">Phone Number</label>
              <input 
                id="phoneNumber"
                type="tel" 
                formControlName="phoneNumber"
                class="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                placeholder="9876543210" />
              <span *ngIf="registerForm.get('phoneNumber')?.touched && registerForm.get('phoneNumber')?.hasError('required')" class="text-xs text-rose-500 mt-1 block">Phone is required</span>
            </div>

            <!-- Role Select -->
            <div>
              <label class="block text-slate-300 text-sm font-medium mb-1.5" for="role">Register As</label>
              <select 
                id="role"
                formControlName="role"
                class="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 px-4 text-white focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm appearance-none">
                <option value="BUYER">Buyer (Explore Lands)</option>
                <option value="PROVIDER">Provider (Sell/List Lands)</option>
                <option value="GOVERNMENT_OFFICER">Government Officer (Inspector)</option>
                <option value="ADMIN">Admin (System Administrator)</option>
              </select>
            </div>
          </div>

          <!-- Password -->
          <div>
            <label class="block text-slate-300 text-sm font-medium mb-1.5" for="password">Password</label>
            <input 
              id="password"
              type="password" 
              formControlName="password"
              class="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
              placeholder="••••••••" />
            <span *ngIf="registerForm.get('password')?.touched && registerForm.get('password')?.hasError('required')" class="text-xs text-rose-500 mt-1 block">Password is required</span>
            <span *ngIf="registerForm.get('password')?.touched && registerForm.get('password')?.hasError('minlength')" class="text-xs text-rose-500 mt-1 block">Password must be at least 6 characters</span>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit"
            [disabled]="registerForm.invalid || loading"
            class="w-full mt-2 py-3 bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-sm flex items-center justify-center gap-2">
            <span *ngIf="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ loading ? 'Creating account...' : 'Sign Up' }}
          </button>
        </form>

        <!-- Form Footer -->
        <div class="mt-8 text-center text-xs text-slate-400">
          <span>Already have an account? </span>
          <a routerLink="/auth/login" class="text-brand-400 hover:text-brand-300 font-semibold transition-colors">Sign in</a>
        </div>

      </div>
    </div>
  `
})
export class RegisterComponent implements OnInit {
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

  registerForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    phoneNumber: ['', [Validators.required]],
    role: ['BUYER', [Validators.required]]
  });

  loading = false;
  errorMsg: string | null = null;
  successMsg: string | null = null;

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.loading = true;
    this.errorMsg = null;
    this.successMsg = null;

    this.authService.register(this.registerForm.value).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMsg = 'Account registered successfully! Redirecting to login page...';
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.message || 'Failed to register account. Email might be in use.';
      }
    });
  }
}
