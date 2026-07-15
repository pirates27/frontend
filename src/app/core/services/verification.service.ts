import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AIVerificationReport {
  id?: string;
  aiTrustScore: number;
  forgeryScore: number;
  duplicateScore: number;
  ownershipMatch: boolean;
  riskScore: number;
  confidence: number;
  summary: string;
  generatedDate?: string;
}

export interface GovernmentVerification {
  id?: string;
  propertyId: string;
  officerId: string;
  remarks: string;
  status: 'APPROVED' | 'REJECTED';
  verifiedDate?: string;
}

export interface TimelineEntry {
  id: string;
  propertyId: string;
  timestamp: string;
  action: string;
  remarks: string;
  userId: string;
}

@Injectable({
  providedIn: 'root',
})
export class VerificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  triggerAIVerify(propertyId: string): Observable<AIVerificationReport> {
    return this.http.post<AIVerificationReport>(`${this.baseUrl}/api/properties/${propertyId}/ai-verify`, {});
  }

  getAIVerification(propertyId: string): Observable<AIVerificationReport> {
    return this.http.get<AIVerificationReport>(`${this.baseUrl}/api/properties/${propertyId}/ai-verification`);
  }

  submitGovernmentVerify(
    propertyId: string,
    payload: { status: 'APPROVED' | 'REJECTED'; remarks: string }
  ): Observable<GovernmentVerification> {
    return this.http.post<GovernmentVerification>(
      `${this.baseUrl}/api/properties/${propertyId}/government-verify`,
      payload
    );
  }

  getTimeline(propertyId: string): Observable<TimelineEntry[]> {
    return this.http.get<TimelineEntry[]>(`${this.baseUrl}/api/properties/${propertyId}/timeline`);
  }
}
