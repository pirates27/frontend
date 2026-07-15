import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="auth-container">
      <div class="glass-panel auth-card">
        <div class="auth-header">
          <div class="logo">
            <span class="material-symbols-outlined logo-icon">visibility</span>
            <h1>Land<span>Lens</span></h1>
          </div>
          <p>AI-Powered Land Verification & Ownership Audit</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="fill">
            <mat-label>Email Address</mat-label>
            <input matInput type="email" formControlName="email" placeholder="name@landlens.com" required />
            <mat-error *ngIf="loginForm.get('email')?.hasError('email')">Please enter a valid email</mat-error>
            <mat-error *ngIf="loginForm.get('email')?.hasError('required')">Email is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Password</mat-label>
            <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="password" required />
            <button
              mat-icon-button
              matSuffix
              type="button"
              (click)="togglePasswordVisibility($event)"
              [attr.aria-label]="'Hide password'"
              [attr.aria-checked]="hidePassword()">
              <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error *ngIf="loginForm.get('password')?.hasError('required')">Password is required</mat-error>
          </mat-form-field>

          <div class="form-actions">
            <button
              mat-raised-button
              color="primary"
              type="submit"
              [disabled]="loginForm.invalid || isLoading()"
              class="submit-btn glow-border-info">
              <span *ngIf="!isLoading()">Sign In</span>
              <span *ngIf="isLoading()">Authenticating...</span>
            </button>
          </div>
        </form>

        <div class="auth-footer">
          <p>Don't have an account? <a routerLink="/register">Register here</a></p>
        </div>
      </div>
    </div>
  `,
  styles: `
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      width: 100vw;
      background: 
        radial-gradient(circle at 20% 20%, rgba(2, 132, 199, 0.05) 0%, transparent 40%),
        radial-gradient(circle at 80% 80%, rgba(5, 150, 105, 0.05) 0%, transparent 40%),
        radial-gradient(rgba(15, 23, 42, 0.04) 1.5px, transparent 1.5px),
        linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
      background-size: 100% 100%, 100% 100%, 24px 24px, 100% 100%;
      padding: 20px;
      box-sizing: border-box;
    }
    .auth-card {
      width: 100%;
      max-width: 440px;
      padding: 40px;
      box-sizing: border-box;
      background: var(--glass-bg);
      backdrop-filter: var(--glass-blur);
      border: 1px solid var(--glass-border);
      box-shadow: var(--shadow-premium);
      border-radius: 20px;
    }
    .auth-header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .logo-icon {
      font-size: 2.5rem;
      color: var(--accent-primary);
      text-shadow: 0 0 10px var(--glow-green);
    }
    .logo h1 {
      font-size: 2.2rem;
      font-weight: 800;
      margin: 0;
      span {
        color: var(--accent-primary);
      }
    }
    .auth-header p {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin: 0;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .submit-btn {
      width: 100%;
      padding: 12px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 8px;
      background: var(--accent-info);
      color: var(--text-primary);
      border: none;
      cursor: pointer;
      transition: var(--transition-fast);
      &:disabled {
        background: var(--bg-tertiary);
        color: var(--text-muted);
        cursor: not-allowed;
      }
    }
    .auth-footer {
      margin-top: 30px;
      text-align: center;
      p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--text-secondary);
      }
      a {
        color: var(--accent-primary);
        font-weight: 600;
        text-shadow: 0 0 8px var(--glow-green);
      }
    }
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly hidePassword = signal<boolean>(true);
  readonly isLoading = signal<boolean>(false);

  togglePasswordVisibility(event: MouseEvent): void {
    this.hidePassword.update((val) => !val);
    event.stopPropagation();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.snackBar.open('Login Successful!', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.snackBar.open(err.error?.message || 'Authentication Failed', 'Dismiss', {
          duration: 4000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }
}
