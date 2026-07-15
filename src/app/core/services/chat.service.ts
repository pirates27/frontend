import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AIConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  senderRole: 'USER' | 'AI';
  content: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  createConversation(title: string): Observable<AIConversation> {
    return this.http.post<AIConversation>(`${this.baseUrl}/api/ai/conversations`, null, {
      params: new HttpParams().set('title', title),
    });
  }

  getConversations(): Observable<AIConversation[]> {
    return this.http.get<AIConversation[]>(`${this.baseUrl}/api/ai/conversations`);
  }

  sendMessage(conversationId: string, content: string): Observable<AIMessage> {
    return this.http.post<AIMessage>(
      `${this.baseUrl}/api/ai/conversations/${conversationId}/messages`,
      content,
      {
        headers: { 'Content-Type': 'text/plain' },
      }
    );
  }

  getMessages(conversationId: string): Observable<AIMessage[]> {
    return this.http.get<AIMessage[]>(`${this.baseUrl}/api/ai/conversations/${conversationId}/messages`);
  }
}
