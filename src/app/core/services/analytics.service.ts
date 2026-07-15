import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AnalyticsDashboard {
  id?: string;
  analyticsDate: string;
  propertyViews: number;
  searchCount: number;
  verificationCount: number;
  fraudCount: number;
  apiCalls: number;
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getAnalyticsDashboard(): Observable<AnalyticsDashboard> {
    return this.http.get<AnalyticsDashboard>(`${this.baseUrl}/api/analytics/dashboard`);
  }
}
