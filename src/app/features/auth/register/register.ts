import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
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
          <p>Register Your LandLens Account</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <div class="name-row">
            <mat-form-field appearance="fill">
              <mat-label>First Name</mat-label>
              <input matInput formControlName="firstName" required />
              <mat-error *ngIf="registerForm.get('firstName')?.hasError('required')">Required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Last Name</mat-label>
              <input matInput formControlName="lastName" required />
              <mat-error *ngIf="registerForm.get('lastName')?.hasError('required')">Required</mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="fill">
            <mat-label>Email Address</mat-label>
            <input matInput type="email" formControlName="email" placeholder="name@domain.com" required />
            <mat-error *ngIf="registerForm.get('email')?.hasError('email')">Please enter a valid email</mat-error>
            <mat-error *ngIf="registerForm.get('email')?.hasError('required')">Email is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Phone Number</mat-label>
            <input matInput type="tel" formControlName="phoneNumber" placeholder="9876543210" required />
            <mat-error *ngIf="registerForm.get('phoneNumber')?.hasError('required')">Phone number is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Role</mat-label>
            <mat-select formControlName="role" required>
              <mat-option value="BUYER">Buyer (Search & Schedule Visits)</mat-option>
              <mat-option value="PROVIDER">Provider/Seller (Create & Verify Land)</mat-option>
              <mat-option value="GOVERNMENT_OFFICER">Government Officer (Review & Approve)</mat-option>
              <mat-option value="ADMIN">System Admin (Full Access)</mat-option>
            </mat-select>
            <mat-error *ngIf="registerForm.get('role')?.hasError('required')">Role selection is required</mat-error>
          </mat-form-field>

          <div class="role-hint" *ngIf="registerForm.get('role')?.value">
            <span class="material-symbols-outlined hint-icon">info</span>
            <span [ngSwitch]="registerForm.get('role')?.value">
              <span *ngSwitchCase="'BUYER'">Explore properties, bookmark listings, schedule guided site tours, file fraud reports, and interact with the AI assistant.</span>
              <span *ngSwitchCase="'PROVIDER'">Create property listings, upload deeds, trigger AI trust and risk checks, request OCR processing, and manage developer keys.</span>
              <span *ngSwitchCase="'GOVERNMENT_OFFICER'">Verify land registry coordinates, review legal documents, assign and resolve disputes/fraud reports, and override approval logs.</span>
              <span *ngSwitchCase="'ADMIN'">Complete oversight of users, analytics data tracking, security configuration overrides, and dashboard statistics.</span>
            </span>
          </div>

          <mat-form-field appearance="fill">
            <mat-label>Password</mat-label>
            <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="password" required (input)="checkPasswordStrength()" />
            <button
              mat-icon-button
              matSuffix
              type="button"
              (click)="togglePasswordVisibility($event)"
              [attr.aria-label]="'Hide password'">
              <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error *ngIf="registerForm.get('password')?.hasError('required')">Password is required</mat-error>
          </mat-form-field>

          <!-- Password Strength Indicator -->
          <div class="strength-meter" *ngIf="registerForm.get('password')?.value">
            <div class="strength-bar" [ngClass]="strengthClass()"></div>
            <span class="strength-label">Password strength: {{ strengthText() }}</span>
          </div>

          <div class="form-actions">
            <button
              mat-raised-button
              color="accent"
              type="submit"
              [disabled]="registerForm.invalid || isLoading()"
              class="submit-btn glow-border-green">
              <span *ngIf="!isLoading()">Register Account</span>
              <span *ngIf="isLoading()">Creating Account...</span>
            </button>
          </div>
        </form>

        <div class="auth-footer">
          <p>Already have an account? <a routerLink="/login">Login here</a></p>
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
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .auth-card {
      width: 100%;
      max-width: 480px;
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
      margin-bottom: 25px;
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
      gap: 16px;
    }
    .name-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .role-hint {
      display: flex;
      gap: 8px;
      padding: 12px;
      background-color: rgba(2, 132, 199, 0.08);
      border: 1px solid rgba(2, 132, 199, 0.2);
      border-radius: 8px;
      font-size: 0.8rem;
      line-height: 1.4;
      color: var(--text-secondary);
      .hint-icon {
        font-size: 1.1rem;
        color: var(--accent-info);
      }
    }
    .strength-meter {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: -8px;
    }
    .strength-bar {
      height: 4px;
      border-radius: 2px;
      background-color: var(--border-color);
      width: 100%;
      position: relative;
      overflow: hidden;
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        transition: width var(--transition-fast), background-color var(--transition-fast);
      }
      &.weak::before { width: 33%; background-color: var(--accent-danger); }
      &.medium::before { width: 66%; background-color: var(--accent-secondary); }
      &.strong::before { width: 100%; background-color: var(--accent-primary); }
    }
    .strength-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    .submit-btn {
      width: 100%;
      padding: 12px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 8px;
      background: var(--accent-primary);
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
      margin-top: 25px;
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
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly registerForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    phoneNumber: ['', [Validators.required]],
    role: ['', [Validators.required]],
  });

  readonly hidePassword = signal<boolean>(true);
  readonly isLoading = signal<boolean>(false);
  readonly strengthClass = signal<string>('weak');
  readonly strengthText = signal<string>('Weak');

  togglePasswordVisibility(event: MouseEvent): void {
    this.hidePassword.update((val) => !val);
    event.stopPropagation();
  }

  checkPasswordStrength(): void {
    const password = this.registerForm.get('password')?.value || '';
    if (!password) return;

    let points = 0;
    if (password.length >= 8) points++;
    if (/[A-Z]/.test(password)) points++;
    if (/[0-9]/.test(password)) points++;
    if (/[^A-Za-z0-9]/.test(password)) points++;

    if (points <= 1) {
      this.strengthClass.set('weak');
      this.strengthText.set('Weak');
    } else if (points === 2 || points === 3) {
      this.strengthClass.set('medium');
      this.strengthText.set('Medium');
    } else {
      this.strengthClass.set('strong');
      this.strengthText.set('Strong');
    }
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.authService.register(this.registerForm.value).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.snackBar.open('Registration Successful! Please log in.', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.snackBar.open(err.error?.message || 'Registration Failed', 'Dismiss', {
          duration: 4000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }
}
