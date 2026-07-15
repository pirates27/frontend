import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NotificationAlert {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  receiverId: string;
  createdTime?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getNotifications(): Observable<NotificationAlert[]> {
    return this.http.get<NotificationAlert[]>(`${this.baseUrl}/api/notifications`);
  }

  markAsRead(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/notifications/${id}/read`, null);
  }
}
