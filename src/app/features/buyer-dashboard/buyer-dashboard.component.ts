import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PropertyService } from '../../core/services/property.service';
import { AuthService } from '../../core/services/auth.service';
import { MapComponent } from '../../shared/components/map/map.component';
import { VerificationBadgeComponent } from '../../shared/components/verification-badge/verification-badge.component';
import * as Models from '../../core/models/property.models';

@Component({
  selector: 'app-buyer-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MapComponent, VerificationBadgeComponent, RouterLink],
  template: `
    <div class="h-screen flex flex-col overflow-hidden bg-slate-50">
      
      <!-- Navbar -->
      <nav class="bg-slate-900 text-white shadow-lg shrink-0 z-30">
        <div class="px-4 sm:px-6 flex justify-between items-center h-16">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white shadow-md">LL</div>
            <span class="text-xl font-bold tracking-tight text-white">Land<span class="text-emerald-400">Lens</span></span>
            <span class="bg-emerald-800/40 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ml-2 hidden sm:inline-flex">Buyer Portal</span>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right hidden sm:block">
              <p class="text-sm font-semibold text-white">{{ authService.currentUser()?.firstName }} {{ authService.currentUser()?.lastName }}</p>
              <p class="text-xs text-slate-400">Buyer Account</p>
            </div>
            <button (click)="logout()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-lg transition border border-slate-700/50">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <!-- Body: Sidebar + Scrollable Content -->
      <div class="flex flex-1 overflow-hidden">

        <!-- Fixed Left Sidebar (Desktop only) -->
        <aside class="hidden md:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200 shadow-sm overflow-y-auto">
          <div class="px-5 py-5 border-b border-slate-100">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Navigation</p>
            <p class="text-xs text-slate-600 font-medium">Buyer Portal</p>
          </div>
          <nav class="flex flex-col gap-1 p-3 flex-1">
            <button 
              (click)="setViewMode('explore')"
              [class.bg-emerald-600]="viewTab === 'explore'"
              [class.text-white]="viewTab === 'explore'"
              [class.shadow-md]="viewTab === 'explore'"
              [class.text-slate-600]="viewTab !== 'explore'"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-xs text-left">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              Explore Lands
            </button>
            <button 
              (click)="setViewMode('saved')"
              [class.bg-emerald-600]="viewTab === 'saved'"
              [class.text-white]="viewTab === 'saved'"
              [class.shadow-md]="viewTab === 'saved'"
              [class.text-slate-600]="viewTab !== 'saved'"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-xs text-left">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              Saved Watchlist
            </button>
            <button 
              (click)="setViewMode('visits')"
              [class.bg-emerald-600]="viewTab === 'visits'"
              [class.text-white]="viewTab === 'visits'"
              [class.shadow-md]="viewTab === 'visits'"
              [class.text-slate-600]="viewTab !== 'visits'"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-xs text-left">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              My Scheduled Visits
            </button>
            <button 
              (click)="setViewMode('chat')"
              [class.bg-emerald-50]="viewTab === 'chat'"
              [class.text-emerald-700]="viewTab === 'chat'"
              [class.text-slate-600]="viewTab !== 'chat'"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-xs text-left">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              AI Assistant Chat
            </button>
            <button 
              (click)="setViewMode('notifications')"
              [class.bg-emerald-50]="viewTab === 'notifications'"
              [class.text-emerald-700]="viewTab === 'notifications'"
              [class.text-slate-600]="viewTab !== 'notifications'"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-xs text-left relative">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              Notifications
              <span *ngIf="unreadNotificationsCount() > 0" class="ml-auto px-2 py-0.5 bg-amber-500 text-white font-bold rounded-full text-[10px]">
                {{ unreadNotificationsCount() }}
              </span>
            </button>
          </nav>
          <div class="px-4 py-4 border-t border-slate-100">
            <button (click)="logout()" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all font-semibold text-xs">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </aside>

        <!-- Scrollable Main Content Pane -->
        <main class="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div class="px-6 py-6 space-y-6">

          <!-- TAB 1: EXPLORE LANDS -->
          <div *ngIf="viewTab === 'explore'" class="space-y-6 flex flex-col h-full">
            
            <!-- Filters Card -->
            <div class="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 space-y-4">
              <h2 class="text-base font-bold text-slate-800">Search Properties</h2>
              
              <form [formGroup]="filterForm" (ngSubmit)="applyFilters()" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label class="block text-slate-500 text-[10px] font-bold uppercase mb-1">State</label>
                  <input type="text" formControlName="state" placeholder="Andhra Pradesh" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs" />
                </div>
                <div>
                  <label class="block text-slate-500 text-[10px] font-bold uppercase mb-1">District</label>
                  <input type="text" formControlName="district" placeholder="Guntur" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs" />
                </div>
                <div>
                  <label class="block text-slate-500 text-[10px] font-bold uppercase mb-1">Category</label>
                  <select formControlName="category" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs">
                    <option value="">All Categories</option>
                    <option value="AGRICULTURAL">Agricultural Plot</option>
                    <option value="RESIDENTIAL">Residential Plot</option>
                    <option value="COMMERCIAL">Commercial space</option>
                    <option value="INDUSTRIAL">Industrial site</option>
                  </select>
                </div>
                <div class="flex items-end gap-2">
                  <button type="submit" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all">
                    Search
                  </button>
                  <button type="button" (click)="resetFilters()" class="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all">
                    Reset
                  </button>
                </div>
              </form>
            </div>

            <!-- View Toggle & Count -->
            <div class="flex justify-between items-center bg-white px-5 py-3 rounded-xl border border-slate-100 shadow-xs">
              <span class="text-xs text-slate-500 font-medium">{{ properties.length }} properties matched</span>
              
              <div class="flex gap-1.5 bg-slate-100 p-0.5 rounded-lg">
                <button 
                  (click)="listMode = 'list'"
                  [class.bg-white]="listMode === 'list'"
                  [class.text-slate-800]="listMode === 'list'"
                  [class.text-slate-500]="listMode !== 'list'"
                  class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all shadow-xs">
                  List
                </button>
                <button 
                  (click)="listMode = 'map'"
                  [class.bg-white]="listMode === 'map'"
                  [class.text-slate-800]="listMode === 'map'"
                  [class.text-slate-500]="listMode !== 'map'"
                  class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all shadow-xs">
                  Map View
                </button>
              </div>
            </div>

            <!-- LIST MODE -->
            <div *ngIf="listMode === 'list'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div *ngFor="let p of properties" class="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden flex flex-col justify-between hover:shadow-md transition-all">
                
                <div class="p-5 space-y-4">
                  <div class="flex justify-between items-start">
                    <div>
                      <h3 class="font-bold text-slate-800 truncate text-sm hover:text-emerald-600 transition-colors" [routerLink]="['/properties', p.id]">{{ p.title }}</h3>
                      <p class="text-[10px] text-slate-500 truncate mt-0.5">{{ p.village }}, {{ p.district }}</p>
                    </div>
                    <app-verification-badge [status]="p.status"></app-verification-badge>
                  </div>

                  <div class="flex justify-between text-[11px] text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    <span><strong>Area:</strong> {{ p.area }} ac</span>
                    <span><strong>Price:</strong> ₹{{ p.price.toLocaleString('en-IN') }}</span>
                  </div>
                </div>

                <div class="bg-slate-50 px-5 py-3 border-t border-slate-100/50 flex justify-between items-center">
                  <button (click)="toggleBookmark(p.id)" class="text-slate-400 hover:text-rose-500 transition-colors">
                    <svg [class.fill-rose-500]="isBookmarked(p.id)" [class.text-rose-500]="isBookmarked(p.id)" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                  <button [routerLink]="['/properties', p.id]" class="text-xs text-emerald-600 font-bold hover:underline">
                    View Details &rarr;
                  </button>
                </div>
              </div>
            </div>

            <!-- MAP MODE -->
            <div *ngIf="listMode === 'map'" class="h-[500px] w-full rounded-2xl overflow-hidden shadow-md">
              <app-map mode="view" [properties]="properties" (locationSelected)="onMapMarkerClick($event)"></app-map>
            </div>

          </div>

          <!-- TAB 2: SAVED WATCHLIST -->
          <div *ngIf="viewTab === 'saved'" class="space-y-6">
            <div class="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
              <h2 class="text-lg font-bold text-slate-800">Saved Property Watchlist</h2>
              <p class="text-xs text-slate-500 mt-1">Lands bookmarked for comparison, AI score tracking, and visits planning.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" *ngIf="savedProperties.length > 0">
              <div *ngFor="let p of savedProperties" class="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden flex flex-col justify-between">
                <div class="p-5 space-y-4">
                  <div class="flex justify-between items-start">
                    <div>
                      <h3 class="font-bold text-slate-800 truncate text-sm" [routerLink]="['/properties', p.id]">{{ p.title }}</h3>
                      <p class="text-[10px] text-slate-500 truncate mt-0.5">{{ p.village }}, {{ p.district }}</p>
                    </div>
                    <app-verification-badge [status]="p.status"></app-verification-badge>
                  </div>
                  
                  <div class="flex justify-between text-[11px] text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    <span><strong>Area:</strong> {{ p.area }} ac</span>
                    <span><strong>Price:</strong> ₹{{ p.price.toLocaleString('en-IN') }}</span>
                  </div>
                </div>

                <div class="bg-slate-50 px-5 py-3 border-t border-slate-100/50 flex justify-between items-center">
                  <button (click)="toggleBookmark(p.id)" class="text-xs text-rose-500 font-semibold hover:underline">Remove</button>
                  <button [routerLink]="['/properties', p.id]" class="text-xs text-emerald-600 font-bold hover:underline">Explore Details &rarr;</button>
                </div>
              </div>
            </div>

            <!-- Empty watchlist -->
            <div *ngIf="savedProperties.length === 0" class="text-center p-12 bg-white rounded-2xl shadow-xs border border-slate-100">
              <svg class="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              <p class="text-xs text-slate-500">Your bookmark watchlist is empty.</p>
            </div>
          </div>

          <!-- TAB 3: VISITS -->
          <div *ngIf="viewTab === 'visits'" class="space-y-6">
            <div class="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
              <h2 class="text-lg font-bold text-slate-800">Your Guided Visits Registry</h2>
              <p class="text-xs text-slate-500 mt-1">Track status of scheduled tours on your bookmarked properties.</p>
            </div>

            <div class="space-y-4" *ngIf="visits.length > 0">
              <div *ngFor="let v of visits" class="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-800 text-sm">Scheduled Date: {{ v.visitDate }} at {{ v.visitTime }}</span>
                    <span class="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full"
                          [ngClass]="{
                            'bg-amber-100 text-amber-800': v.status === 'SCHEDULED',
                            'bg-emerald-100 text-emerald-800': v.status === 'CONFIRMED',
                            'bg-rose-100 text-rose-800': v.status === 'REJECTED'
                          }">
                      {{ v.status }}
                    </span>
                  </div>
                  <p class="text-[10px] text-slate-400 mt-1">Property Reference ID: {{ v.propertyId }}</p>
                </div>
                <button [routerLink]="['/properties', v.propertyId]" class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition">
                  Inspect Land Profile
                </button>
              </div>
            </div>

            <div *ngIf="visits.length === 0" class="text-center p-12 bg-white rounded-2xl shadow-xs border border-slate-100">
              <svg class="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <p class="text-xs text-slate-500">No scheduled visits on registry.</p>
            </div>
          </div>

          <!-- TAB 4: AI CHAT ASSISTANT -->
          <div *ngIf="viewTab === 'chat'" class="h-[600px] flex gap-4">
            
            <!-- Conversations list (left) -->
            <div class="w-64 bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex flex-col justify-between shrink-0">
              <div class="space-y-4 flex-1 overflow-auto">
                <div class="flex justify-between items-center">
                  <h3 class="font-bold text-slate-800 text-xs">AI Chat threads</h3>
                  <button (click)="createNewChat()" class="text-emerald-600 hover:text-emerald-500 text-xs font-bold flex items-center gap-0.5">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                    New
                  </button>
                </div>

                <div class="space-y-2">
                  <button 
                    *ngFor="let convo of conversations" 
                    (click)="selectConversation(convo.id)"
                    [class.bg-emerald-50]="selectedConvoId === convo.id"
                    [class.border-emerald-200]="selectedConvoId === convo.id"
                    [class.text-emerald-700]="selectedConvoId === convo.id"
                    [class.bg-slate-50]="selectedConvoId !== convo.id"
                    class="w-full text-left p-3 border border-slate-100 rounded-xl text-xs font-medium hover:bg-slate-100 transition truncate">
                    {{ convo.title || 'Untitled Chat' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Messages view (right) -->
            <div class="flex-1 bg-white rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between overflow-hidden">
              <!-- Chat Header -->
              <div class="px-6 py-4 border-b border-slate-100 bg-slate-900 text-white flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white shadow-md">AI</div>
                <div>
                  <h4 class="text-xs font-bold">LandLens AI Verification Assistant</h4>
                  <p class="text-[10px] text-slate-400">Ask questions about land records, Patta passbooks or survey boundaries.</p>
                </div>
              </div>

              <!-- Message Window -->
              <div class="flex-1 p-6 overflow-auto space-y-4 bg-slate-50/50">
                <div *ngFor="let msg of messages" 
                     [ngClass]="msg.senderRole === 'USER' ? 'justify-end' : 'justify-start'" 
                     class="flex">
                  <div [ngClass]="msg.senderRole === 'USER' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'"
                       class="max-w-[70%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs">
                    {{ msg.content }}
                  </div>
                </div>

                <div *ngIf="messages.length === 0" class="text-center text-slate-400 py-12 text-xs">
                  Select a chat thread or click 'New' to consult LandLens AI about property records check.
                </div>
              </div>

              <!-- Input bar -->
              <div class="p-4 border-t border-slate-100 flex gap-2">
                <input 
                  type="text" 
                  [(ngModel)]="chatInput" 
                  (keyup.enter)="sendMessage()"
                  placeholder="Ask explaining Patta verification..." 
                  class="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-hidden focus:border-emerald-500 text-xs" />
                <button 
                  (click)="sendMessage()"
                  class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition font-semibold text-xs">
                  Send
                </button>
              </div>
            </div>

          </div><!-- /chat tab -->

          <!-- TAB 5: NOTIFICATIONS -->
          <div *ngIf="viewTab === 'notifications'" class="space-y-6">
            <div class="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
              <h2 class="text-xl font-bold text-slate-800">System Notifications</h2>
              <p class="text-xs text-slate-500 mt-1">Alerts regarding verification statuses, visits, and account activity.</p>
            </div>

            <div class="space-y-4" *ngIf="notifications.length > 0">
              <div *ngFor="let notification of notifications" 
                   [ngClass]="notification.isRead ? 'bg-white opacity-70' : 'bg-emerald-50 border-emerald-200'"
                   class="p-5 rounded-2xl border border-slate-100 shadow-xs flex justify-between items-start gap-4 transition-all hover:opacity-100">
                <div class="space-y-1 flex-1">
                  <h3 class="font-bold text-sm text-slate-800">{{ notification.title }}</h3>
                  <p class="text-xs text-slate-600 leading-relaxed">{{ notification.message }}</p>
                  <p class="text-[10px] text-slate-400 font-medium">{{ notification.createdTime | date:'medium' }}</p>
                </div>
                
                <button *ngIf="!notification.isRead" (click)="markNotificationRead(notification.id)" class="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] rounded-lg transition">
                  Mark Read
                </button>
                <svg *ngIf="notification.isRead" class="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>

            <div *ngIf="notifications.length === 0" class="text-center p-12 bg-white rounded-2xl border border-slate-150 text-slate-400 text-xs">
              You have no notifications.
            </div>
          </div>

          </div><!-- /px-6 wrapper -->
        </main>
      </div>

      <!-- Mobile Navigation Bar (Bottom Nav) -->
      <nav class="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 shadow-2xl" style="padding-bottom: env(safe-area-inset-bottom)">
        <div class="flex items-end justify-around h-16">

          <!-- Explore -->
          <button (click)="setViewMode('explore')" class="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative group">
            <div [class.bg-emerald-100]="viewTab === 'explore'" class="flex flex-col items-center justify-center w-12 py-1.5 rounded-2xl transition-all">
              <svg [class.text-emerald-600]="viewTab === 'explore'" [class.text-slate-400]="viewTab !== 'explore'" class="w-5 h-5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span [class.text-emerald-600]="viewTab === 'explore'" [class.text-slate-400]="viewTab !== 'explore'" [class.font-bold]="viewTab === 'explore'" class="text-[9px] font-medium mt-0.5 transition-colors">Explore</span>
            </div>
          </button>

          <!-- Watchlist -->
          <button (click)="setViewMode('saved')" class="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative group">
            <div [class.bg-emerald-100]="viewTab === 'saved'" class="flex flex-col items-center justify-center w-12 py-1.5 rounded-2xl transition-all">
              <svg [class.text-emerald-600]="viewTab === 'saved'" [class.text-slate-400]="viewTab !== 'saved'" class="w-5 h-5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              <span [class.text-emerald-600]="viewTab === 'saved'" [class.text-slate-400]="viewTab !== 'saved'" [class.font-bold]="viewTab === 'saved'" class="text-[9px] font-medium mt-0.5 transition-colors">Watchlist</span>
            </div>
          </button>

          <!-- Explore FAB-style centre button -->
          <button (click)="setViewMode('visits')" class="flex flex-col items-center justify-center flex-1 h-full">
            <div [class.bg-emerald-600]="viewTab === 'visits'" [class.shadow-lg]="viewTab === 'visits'" [class.bg-slate-100]="viewTab !== 'visits'" class="flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all -mt-4 shadow-md">
              <svg [class.text-white]="viewTab === 'visits'" [class.text-slate-500]="viewTab !== 'visits'" class="w-6 h-6 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span [class.text-white]="viewTab === 'visits'" [class.text-slate-500]="viewTab !== 'visits'" class="text-[8px] font-bold mt-0.5 transition-colors">Visits</span>
            </div>
          </button>

          <!-- AI Chat -->
          <button (click)="setViewMode('chat')" class="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative group">
            <div [class.bg-emerald-100]="viewTab === 'chat'" class="flex flex-col items-center justify-center w-12 py-1.5 rounded-2xl transition-all">
              <svg [class.text-emerald-600]="viewTab === 'chat'" [class.text-slate-400]="viewTab !== 'chat'" class="w-5 h-5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <span [class.text-emerald-600]="viewTab === 'chat'" [class.text-slate-400]="viewTab !== 'chat'" [class.font-bold]="viewTab === 'chat'" class="text-[9px] font-medium mt-0.5 transition-colors">AI Chat</span>
            </div>
          </button>

          <!-- Notifications -->
          <button (click)="setViewMode('notifications')" class="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative group">
            <div [class.bg-emerald-100]="viewTab === 'notifications'" class="flex flex-col items-center justify-center w-12 py-1.5 rounded-2xl transition-all relative">
              <svg [class.text-emerald-600]="viewTab === 'notifications'" [class.text-slate-400]="viewTab !== 'notifications'" class="w-5 h-5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span [class.text-emerald-600]="viewTab === 'notifications'" [class.text-slate-400]="viewTab !== 'notifications'" [class.font-bold]="viewTab === 'notifications'" class="text-[9px] font-medium mt-0.5 transition-colors">Alerts</span>
              <span *ngIf="unreadNotificationsCount() > 0" class="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white"></span>
            </div>
          </button>

        </div>
      </nav>

    </div><!-- /h-screen root -->
  `
})
export class BuyerDashboardComponent implements OnInit {
  authService = inject(AuthService);
  private propertyService = inject(PropertyService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  viewTab: 'explore' | 'saved' | 'visits' | 'chat' | 'notifications' = 'explore';
  listMode: 'list' | 'map' = 'list';

  properties: Models.Property[] = [];
  savedProperties: Models.Property[] = [];
  visits: Models.PropertyVisit[] = [];
  conversations: Models.AiConversation[] = [];
  messages: Models.AiMessage[] = [];
  notifications: Models.Notification[] = [];

  // Signals
  unreadNotificationsCount = signal<number>(0);

  // Saved bookmark cache
  bookmarkIds = new Set<string>();

  // Filter Form
  filterForm!: FormGroup;

  // AI Chat Signal states
  selectedConvoId: string | null = null;
  chatInput = '';

  constructor() {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadData();
    this.loadBookmarks();
    this.loadVisits();
    this.loadNotifications();
  }

  private initForm(): void {
    this.filterForm = this.fb.group({
      state: [''],
      district: [''],
      category: ['']
    });
  }

  setViewMode(tab: 'explore' | 'saved' | 'visits' | 'chat' | 'notifications'): void {
    this.viewTab = tab;
    if (tab === 'saved') {
      this.loadBookmarks();
    } else if (tab === 'visits') {
      this.loadVisits();
    } else if (tab === 'chat') {
      this.loadConversations();
    } else if (tab === 'notifications') {
      this.loadNotifications();
    }
  }

  loadData(): void {
    // Only query properties that are APPROVED to show to buyers,
    // though buyers can search with general params
    this.propertyService.getProperties(this.filterForm.value).subscribe(res => {
      this.properties = res.filter(p => p.status === 'APPROVED');
    });
  }

  loadBookmarks(): void {
    this.propertyService.getSavedProperties().subscribe(res => {
      this.savedProperties = res;
      this.bookmarkIds = new Set(res.map(p => p.id));
    });
  }

  loadVisits(): void {
    this.propertyService.getVisits().subscribe(res => {
      this.visits = res;
    });
  }

  loadNotifications(): void {
    this.propertyService.getNotifications().subscribe(res => {
      this.notifications = res;
      this.unreadNotificationsCount.set(res.filter(n => !n.isRead).length);
    });
  }

  markNotificationRead(id: string): void {
    this.propertyService.markNotificationRead(id).subscribe(() => {
      this.loadNotifications();
    });
  }

  isBookmarked(id: string): boolean {
    return this.bookmarkIds.has(id);
  }

  toggleBookmark(id: string): void {
    if (this.isBookmarked(id)) {
      this.propertyService.unsaveProperty(id).subscribe(() => {
        this.loadBookmarks();
      });
    } else {
      this.propertyService.saveProperty(id).subscribe(() => {
        this.loadBookmarks();
      });
    }
  }

  applyFilters(): void {
    this.loadData();
  }

  resetFilters(): void {
    this.filterForm.reset({
      state: '',
      district: '',
      category: ''
    });
    this.loadData();
  }

  onMapMarkerClick(e: any): void {
    // Navigate to property detail or open card
  }

  // ==========================================
  // AI CHATBOT HANDLERS
  // ==========================================
  loadConversations(): void {
    this.propertyService.getAiConversations().subscribe(res => {
      this.conversations = res;
      if (res.length > 0 && !this.selectedConvoId) {
        this.selectConversation(res[0].id);
      }
    });
  }

  selectConversation(id: string): void {
    this.selectedConvoId = id;
    this.propertyService.getAiMessages(id).subscribe(res => {
      this.messages = res;
    });
  }

  createNewChat(): void {
    const title = prompt('Enter chat topic:', 'Land Document Query');
    if (!title) return;

    this.propertyService.startAiConversation(title).subscribe(res => {
      this.loadConversations();
      this.selectConversation(res.id);
    });
  }

  sendMessage(): void {
    if (!this.chatInput.trim() || !this.selectedConvoId) return;

    const text = this.chatInput;
    this.chatInput = '';

    // Append user message mock optimistically
    this.messages.push({
      id: Math.random().toString(),
      conversationId: this.selectedConvoId,
      senderRole: 'USER',
      content: text,
      timestamp: new Date().toISOString()
    });

    this.propertyService.sendAiMessage(this.selectedConvoId, text).subscribe(() => {
      // Reload messages list which will contain user + AI response
      this.selectConversation(this.selectedConvoId!);
    });
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
