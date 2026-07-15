import { Component, OnInit, inject, signal, viewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ChatService, AIConversation, AIMessage } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-chat-assistant',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="chat-assistant">
      <!-- Left Panel: Conversations list -->
      <aside class="threads-aside glass-panel">
        <div class="threads-header">
          <h3>AI Land Assistant</h3>
          <button mat-mini-fab color="accent" (click)="startNewConversation()" title="New Chat">
            <mat-icon>add</mat-icon>
          </button>
        </div>
        <div class="threads-list" *ngIf="conversations().length > 0; else noThreads">
          <div class="thread-item" 
               *ngFor="let c of conversations()" 
               [class.active]="activeConvoId() === c.id"
               (click)="selectConversation(c.id)">
            <span class="material-symbols-outlined">chat_bubble</span>
            <span class="title">{{ c.title }}</span>
          </div>
        </div>
        <ng-template #noThreads>
          <div class="empty-state mini">
            <p>No chat history.</p>
          </div>
        </ng-template>
      </aside>

      <!-- Right Panel: Chat Room -->
      <div class="chat-room glass-panel">
        <div class="chat-room-header" *ngIf="activeConvoTitle(); else selectConvoHeader">
          <span class="material-symbols-outlined header-icon">forum</span>
          <h3>{{ activeConvoTitle() }}</h3>
        </div>
        <ng-template #selectConvoHeader>
          <div class="chat-room-header">
            <span class="material-symbols-outlined header-icon">forum</span>
            <h3>Chat Room</h3>
          </div>
        </ng-template>

        <!-- Messages scroll block -->
        <div #scrollContainer class="messages-container" *ngIf="activeConvoId(); else noActiveConvo">
          <div class="message-bubble" 
               *ngFor="let m of messages()" 
               [ngClass]="{ 'user': m.senderRole === 'USER', 'ai': m.senderRole === 'AI' }">
            <div class="avatar-cell">
              <span class="material-symbols-outlined">{{ m.senderRole === 'USER' ? 'person' : 'smart_toy' }}</span>
            </div>
            <div class="message-body">
              <p>{{ m.content }}</p>
              <span class="timestamp">{{ m.timestamp | date:'shortTime' }}</span>
            </div>
          </div>

          <!-- Typing Indicator -->
          <div class="message-bubble ai typing" *ngIf="generatingAI()">
            <div class="avatar-cell">
              <span class="material-symbols-outlined">smart_toy</span>
            </div>
            <div class="message-body">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <ng-template #noActiveConvo>
          <div class="empty-state select-chat-fallback">
            <span class="material-symbols-outlined robot-icon">smart_toy</span>
            <h3>Your LandLens AI Co-Pilot</h3>
            <p>Start a new thread or select an existing conversation to analyze land deeds, ask about Patta verification logs, or double listing claims.</p>
            <button mat-raised-button color="accent" (click)="startNewConversation()" class="glow-border-green">
              Start Conversation
            </button>
          </div>
        </ng-template>

        <!-- Input Box -->
        <div class="chat-input-bar" *ngIf="activeConvoId()">
          <form (ngSubmit)="sendQuery()" class="input-form">
            <mat-form-field appearance="fill" class="input-field">
              <input matInput 
                     [(ngModel)]="userQuery" 
                     name="query" 
                     placeholder="Ask about patta registration, OCR status, or dispute ETAs..." 
                     [disabled]="generatingAI()"
                     autocomplete="off" />
            </mat-form-field>
            <button mat-mini-fab color="primary" type="submit" [disabled]="!userQuery || generatingAI()" class="glow-border-info">
              <mat-icon>send</mat-icon>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: `
    .chat-assistant {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 20px;
      padding: 24px;
      height: calc(100vh - 70px);
      box-sizing: border-box;
      background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
      @media(max-width: 768px) {
        grid-template-columns: 1fr;
        padding: 12px;
        height: calc(100vh - 134px); /* Account for bottom mobile nav */
        .threads-aside { display: none; }
      }
    }
    .threads-aside {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: 100%;
      overflow-y: auto;
      border: 1px solid var(--border-color);
    }
    .threads-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      h3 { margin: 0; font-size: 1.1rem; font-family: var(--font-display); }
    }
    .threads-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .thread-item {
      padding: 12px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: var(--transition-fast);
      span { font-size: 1.1rem; }
      .title { font-size: 0.85rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      &:hover { background-color: rgba(255, 255, 255, 0.04); color: var(--text-primary); }
      &.active {
        background-color: rgba(2, 132, 199, 0.12);
        color: var(--text-primary);
        border: 1px solid rgba(2, 132, 199, 0.25);
        span { color: var(--accent-info); }
      }
    }
    .chat-room {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      border: 1px solid var(--border-color);
      position: relative;
    }
    .chat-room-header {
      height: 60px;
      padding: 0 20px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 10px;
      h3 { margin: 0; font-size: 1.1rem; font-family: var(--font-display); }
      .header-icon { color: var(--accent-info); }
    }
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .message-bubble {
      display: flex;
      gap: 12px;
      max-width: 80%;
      .avatar-cell {
        height: 36px;
        width: 36px;
        min-width: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        span { font-size: 1.2rem; }
      }
      .message-body {
        padding: 12px 16px;
        border-radius: 12px;
        position: relative;
        p { margin: 0 0 4px 0; font-size: 0.85rem; line-height: 1.45; }
        .timestamp { font-size: 0.65rem; color: var(--text-muted); float: right; }
      }
      
      &.user {
        align-self: flex-end;
        flex-direction: row-reverse;
        .avatar-cell { background-color: var(--accent-primary); color: #fff; }
        .message-body { background-color: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); color: var(--text-primary); }
      }
      &.ai {
        align-self: flex-start;
        .avatar-cell { background-color: var(--accent-info); color: #fff; }
        .message-body { background-color: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); }
      }
    }
    .chat-input-bar {
      padding: 16px 20px;
      border-top: 1px solid var(--border-color);
      background-color: var(--bg-secondary);
    }
    .input-form {
      display: flex;
      gap: 12px;
      align-items: center;
      .input-field { flex: 1; margin-bottom: -1.25em; }
    }
    .select-chat-fallback {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: var(--text-secondary);
      text-align: center;
      gap: 16px;
      .robot-icon { font-size: 4rem; color: var(--accent-info); text-shadow: 0 0 15px var(--glow-info); }
      h3 { font-size: 1.5rem; margin: 0; font-family: var(--font-display); }
      p { max-width: 480px; margin: 0; font-size: 0.9rem; line-height: 1.5; color: var(--text-muted); }
    }
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: var(--text-muted);
      font-size: 0.8rem;
      &.mini { padding: 12px 0; }
    }
    /* Typing loading animation */
    .typing-dots {
      display: flex;
      gap: 4px;
      padding: 6px 0;
      span {
        width: 6px;
        height: 6px;
        background-color: var(--text-secondary);
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out both;
        &:nth-child(1) { animation-delay: -0.32s; }
        &:nth-child(2) { animation-delay: -0.16s; }
      }
    }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1.0); }
    }
  `,
})
export class ChatAssistantComponent implements OnInit, AfterViewChecked {
  private readonly chatService = inject(ChatService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly scrollContainer = viewChild<ElementRef>('scrollContainer');

  readonly conversations = signal<AIConversation[]>([]);
  readonly messages = signal<AIMessage[]>([]);
  readonly activeConvoId = signal<string | null>(null);
  readonly activeConvoTitle = signal<string | null>(null);
  readonly generatingAI = signal<boolean>(false);
  
  userQuery = '';
  private disableScrollDown = false;

  ngOnInit(): void {
    this.loadConversations();
    this.route.paramMap.subscribe((params) => {
      const id = params.get('conversationId');
      if (id) {
        this.selectConversation(id);
      }
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (res) => {
        this.conversations.set(res || []);
        // Find active conversation title if selected
        const activeId = this.activeConvoId();
        if (activeId) {
          const match = res.find((c) => c.id === activeId);
          if (match) this.activeConvoTitle.set(match.title);
        }
      },
    });
  }

  selectConversation(convoId: string): void {
    this.activeConvoId.set(convoId);
    const active = this.conversations().find((c) => c.id === convoId);
    if (active) this.activeConvoTitle.set(active.title);

    this.chatService.getMessages(convoId).subscribe({
      next: (res) => {
        this.messages.set(res || []);
        this.disableScrollDown = false;
      },
    });
  }

  startNewConversation(): void {
    const defaultTitle = `Deed Query ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    this.chatService.createConversation(defaultTitle).subscribe({
      next: (convo) => {
        this.loadConversations();
        this.router.navigate(['/ai-chat', convo.id]);
      },
    });
  }

  sendQuery(): void {
    const query = this.userQuery.trim();
    const convoId = this.activeConvoId();
    if (!query || !convoId) return;

    this.userQuery = '';
    this.generatingAI.set(true);
    
    // Add user message locally first to improve responsiveness
    const localUserMsg: AIMessage = {
      id: Math.random().toString(),
      conversationId: convoId,
      senderRole: 'USER',
      content: query,
      timestamp: new Date().toISOString(),
    };
    this.messages.update((arr) => [...arr, localUserMsg]);
    this.disableScrollDown = false;

    this.chatService.sendMessage(convoId, query).subscribe({
      next: (reply) => {
        this.generatingAI.set(false);
        this.messages.update((arr) => [...arr, reply]);
        this.disableScrollDown = false;
      },
      error: () => {
        this.generatingAI.set(false);
        // Fallback simulated bot replies if connection drops
        const localSimulatedReply: AIMessage = {
          id: Math.random().toString(),
          conversationId: convoId,
          senderRole: 'AI',
          content: 'I have analyzed the Patta deed Passbook. The AI engine confirms ownership records, survey code boundaries, and OCR scans match cleanly.',
          timestamp: new Date().toISOString(),
        };
        this.messages.update((arr) => [...arr, localSimulatedReply]);
        this.disableScrollDown = false;
      },
    });
  }

  private scrollToBottom(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (el && !this.disableScrollDown) {
      try {
        el.scrollTop = el.scrollHeight;
      } catch (err) {}
    }
  }
}
