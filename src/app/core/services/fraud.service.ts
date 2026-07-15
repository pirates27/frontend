import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Property } from './property.service';

export interface FraudReport {
  id: string;
  reporterId: string;
  propertyId: string;
  reason: string;
  description: string;
  status: 'PENDING' | 'UNDER_INVESTIGATION' | 'RESOLVED_FRAUDULENT' | 'RESOLVED_DISMISSED';
  officerId?: string;
  createdAt?: string;
  updatedAt?: string;
  property?: Property;
  reporterEmail?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FraudService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  reportFraud(propertyId: string, payload: { reason: string; description: string }): Observable<FraudReport> {
    return this.http.post<FraudReport>(`${this.baseUrl}/api/properties/${propertyId}/fraud-reports`, payload);
  }

  getAllFraudReports(): Observable<FraudReport[]> {
    return this.http.get<FraudReport[]>(`${this.baseUrl}/api/fraud-reports`);
  }

  getFraudReportsForProperty(propertyId: string): Observable<FraudReport[]> {
    return this.http.get<FraudReport[]>(`${this.baseUrl}/api/properties/${propertyId}/fraud-reports`);
  }

  assignFraudReport(reportId: string, officerId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/fraud-reports/${reportId}/assign`, null, {
      params: new HttpParams().set('officerId', officerId),
    });
  }

  resolveFraudReport(
    reportId: string,
    status: 'RESOLVED_FRAUDULENT' | 'RESOLVED_DISMISSED' | 'RESOLVED'
  ): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/fraud-reports/${reportId}/resolve`, null, {
      params: new HttpParams().set('status', status),
    });
  }
}
