import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PropertyStatus } from '../../../core/models/property.models';

@Component({
  selector: 'app-verification-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="getBadgeClasses()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs border transition-all duration-300">
      
      <!-- Icon indicator -->
      <span class="flex h-2 w-2 relative" *ngIf="status === 'PENDING_AI' || status === 'PENDING_GOVT'">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" [ngClass]="status === 'PENDING_AI' ? 'bg-amber-400' : 'bg-emerald-400'"></span>
        <span class="relative inline-flex rounded-full h-2 w-2" [ngClass]="status === 'PENDING_AI' ? 'bg-amber-500' : 'bg-emerald-500'"></span>
      </span>

      <!-- Standard Check/Cross Icons -->
      <span *ngIf="status === 'APPROVED'" class="text-emerald-100 bg-emerald-700/80 rounded-full p-0.5">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>

      <span *ngIf="status === 'REJECTED'" class="text-rose-100 bg-rose-700/80 rounded-full p-0.5">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>

      <span *ngIf="status === 'DISPUTED'" class="text-red-100 bg-red-800 rounded-full p-0.5">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </span>

      <!-- Badge Text -->
      <span>{{ getBadgeText() }}</span>

      <!-- AI Score display -->
      <span *ngIf="status === 'APPROVED' && aiScore !== undefined" class="ml-1 bg-emerald-950/30 text-emerald-100 px-1.5 py-0.5 rounded-sm font-bold border border-emerald-500/20">
        AI: {{ aiScore }}%
      </span>
    </div>
  `
})
export class VerificationBadgeComponent {
  @Input() status: PropertyStatus = 'PENDING_AI';
  @Input() aiScore?: number;

  getBadgeClasses(): string {
    switch (this.status) {
      case 'APPROVED':
        return 'bg-emerald-950/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-400';
      case 'PENDING_GOVT':
        return 'bg-emerald-500/10 border-emerald-400/20 text-emerald-600 dark:text-emerald-400';
      case 'PENDING_AI':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
      case 'REJECTED':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400';
      case 'DISPUTED':
        return 'bg-red-600/10 border-red-500/30 text-red-600 dark:text-red-400';
      default:
        return 'bg-slate-100 border-slate-200 text-slate-700';
    }
  }

  getBadgeText(): string {
    switch (this.status) {
      case 'APPROVED':
        return 'Approved Land';
      case 'PENDING_GOVT':
        return 'Govt Verify Pending';
      case 'PENDING_AI':
        return 'AI Checking...';
      case 'REJECTED':
        return 'Rejected';
      case 'DISPUTED':
        return 'Disputed / Fraud Flag';
      default:
        return 'Unknown';
    }
  }
}
