import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import * as Models from '../models/property.models';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private http = inject(HttpClient);

  // ==========================================
  // 1. PROPERTY CRUD
  // ==========================================
  createProperty(property: Omit<Models.Property, 'id' | 'propertyCode' | 'status' | 'providerId'>): Observable<Models.Property> {
    return this.http.post<Models.Property>(`${environment.apiBaseUrl}/api/properties`, property);
  }

  getProperties(filters: {
    district?: string;
    state?: string;
    category?: Models.PropertyCategory;
    priceMin?: number;
    priceMax?: number;
    status?: Models.PropertyStatus;
  } = {}): Observable<Models.Property[]> {
    let params = new HttpParams();
    if (filters.district) params = params.set('district', filters.district);
    if (filters.state) params = params.set('state', filters.state);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.priceMin) params = params.set('priceMin', filters.priceMin.toString());
    if (filters.priceMax) params = params.set('priceMax', filters.priceMax.toString());
    if (filters.status) params = params.set('status', filters.status);

    return this.http.get<Models.Property[]>(`${environment.apiBaseUrl}/api/properties`, { params });
  }

  getPropertyById(id: string): Observable<Models.Property> {
    return this.http.get<Models.Property>(`${environment.apiBaseUrl}/api/properties/${id}`);
  }

  updateProperty(id: string, property: Partial<Models.Property>): Observable<Models.Property> {
    return this.http.put<Models.Property>(`${environment.apiBaseUrl}/api/properties/${id}`, property);
  }

  deleteProperty(id: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiBaseUrl}/api/properties/${id}`);
  }

  // ==========================================
  // 2. PROPERTY MEDIA (IMAGES & VIDEOS)
  // ==========================================
  uploadImage(propertyId: string, image: { imageUrl: string; thumbnailUrl: string; displayOrder: number }): Observable<Models.PropertyImage> {
    return this.http.post<Models.PropertyImage>(`${environment.apiBaseUrl}/api/properties/${propertyId}/images`, image);
  }

  getImages(propertyId: string): Observable<Models.PropertyImage[]> {
    return this.http.get<Models.PropertyImage[]>(`${environment.apiBaseUrl}/api/properties/${propertyId}/images`);
  }

  uploadVideo(propertyId: string, video: { videoUrl: string; duration: number; thumbnailUrl: string }): Observable<Models.PropertyVideo> {
    return this.http.post<Models.PropertyVideo>(`${environment.apiBaseUrl}/api/properties/${propertyId}/videos`, video);
  }

  getVideos(propertyId: string): Observable<Models.PropertyVideo[]> {
    return this.http.get<Models.PropertyVideo[]>(`${environment.apiBaseUrl}/api/properties/${propertyId}/videos`);
  }

  // ==========================================
  // 3. DOCUMENTS & OCR
  // ==========================================
  uploadDocument(propertyId: string, doc: { documentType: Models.DocumentType; fileUrl: string }): Observable<Models.PropertyDocument> {
    return this.http.post<Models.PropertyDocument>(`${environment.apiBaseUrl}/api/properties/${propertyId}/documents`, doc);
  }

  getDocuments(propertyId: string): Observable<Models.PropertyDocument[]> {
    return this.http.get<Models.PropertyDocument[]>(`${environment.apiBaseUrl}/api/properties/${propertyId}/documents`);
  }

  runOcr(documentId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiBaseUrl}/api/documents/${documentId}/ocr`, null);
  }

  // ==========================================
  // 4. AI & GOVERNMENT VERIFICATION
  // ==========================================
  triggerAiVerify(propertyId: string): Observable<Models.AiVerification> {
    return this.http.post<Models.AiVerification>(`${environment.apiBaseUrl}/api/properties/${propertyId}/ai-verify`, null);
  }

  getAiVerification(propertyId: string): Observable<Models.AiVerification> {
    return this.http.get<Models.AiVerification>(`${environment.apiBaseUrl}/api/properties/${propertyId}/ai-verification`);
  }

  submitGovernmentVerify(propertyId: string, review: { status: Models.GovtVerificationStatus; remarks: string }): Observable<Models.GovernmentVerification> {
    return this.http.post<Models.GovernmentVerification>(`${environment.apiBaseUrl}/api/properties/${propertyId}/government-verify`, review);
  }

  getTimeline(propertyId: string): Observable<Models.VerificationTimeline[]> {
    return this.http.get<Models.VerificationTimeline[]>(`${environment.apiBaseUrl}/api/properties/${propertyId}/timeline`);
  }

  // ==========================================
  // 5. BOOKMARKS & SAVED PROPERTIES
  // ==========================================
  saveProperty(propertyId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiBaseUrl}/api/properties/${propertyId}/save`, null);
  }

  getSavedProperties(): Observable<Models.Property[]> {
    return this.http.get<Models.Property[]>(`${environment.apiBaseUrl}/api/properties/saved`);
  }

  unsaveProperty(propertyId: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiBaseUrl}/api/properties/${propertyId}/save`);
  }

  // ==========================================
  // 6. PROPERTY VISITS (GUIDED TOURS)
  // ==========================================
  scheduleVisit(propertyId: string, visit: { visitDate: string; visitTime: string }): Observable<Models.PropertyVisit> {
    return this.http.post<Models.PropertyVisit>(`${environment.apiBaseUrl}/api/properties/${propertyId}/visit`, visit);
  }

  getVisits(): Observable<Models.PropertyVisit[]> {
    return this.http.get<Models.PropertyVisit[]>(`${environment.apiBaseUrl}/api/properties/visits`);
  }

  updateVisitStatus(visitId: string, status: 'CONFIRMED' | 'REJECTED'): Observable<Models.PropertyVisit> {
    return this.http.put<Models.PropertyVisit>(`${environment.apiBaseUrl}/api/properties/visits/${visitId}`, null, {
      params: new HttpParams().set('status', status)
    });
  }

  // ==========================================
  // 7. FRAUD & COMPLAINTS
  // ==========================================
  reportFraud(propertyId: string, fraud: { reason: string; description: string }): Observable<Models.FraudReport> {
    return this.http.post<Models.FraudReport>(`${environment.apiBaseUrl}/api/properties/${propertyId}/fraud-reports`, fraud);
  }

  getAllFraudReports(): Observable<Models.FraudReport[]> {
    return this.http.get<Models.FraudReport[]>(`${environment.apiBaseUrl}/api/fraud-reports`);
  }

  getFraudReportsForProperty(propertyId: string): Observable<Models.FraudReport[]> {
    return this.http.get<Models.FraudReport[]>(`${environment.apiBaseUrl}/api/properties/${propertyId}/fraud-reports`);
  }

  assignFraudReport(fraudId: string, officerId: string): Observable<Models.FraudReport> {
    return this.http.put<Models.FraudReport>(`${environment.apiBaseUrl}/api/fraud-reports/${fraudId}/assign`, null, {
      params: new HttpParams().set('officerId', officerId)
    });
  }

  resolveFraudReport(fraudId: string, status: 'RESOLVED_FRAUDULENT' | 'RESOLVED_DISMISSED'): Observable<Models.FraudReport> {
    return this.http.put<Models.FraudReport>(`${environment.apiBaseUrl}/api/fraud-reports/${fraudId}/resolve`, null, {
      params: new HttpParams().set('status', status)
    });
  }

  // ==========================================
  // 8. SYSTEM ALERTS & NOTIFICATIONS
  // ==========================================
  getNotifications(): Observable<Models.Notification[]> {
    return this.http.get<Models.Notification[]>(`${environment.apiBaseUrl}/api/notifications`);
  }

  markNotificationRead(id: string): Observable<any> {
    return this.http.put<any>(`${environment.apiBaseUrl}/api/notifications/${id}/read`, null);
  }

  // ==========================================
  // 9. AI CHAT SUPPORT ASSISTANT
  // ==========================================
  startAiConversation(title: string): Observable<Models.AiConversation> {
    return this.http.post<Models.AiConversation>(`${environment.apiBaseUrl}/api/ai/conversations`, null, {
      params: new HttpParams().set('title', title)
    });
  }

  getAiConversations(): Observable<Models.AiConversation[]> {
    return this.http.get<Models.AiConversation[]>(`${environment.apiBaseUrl}/api/ai/conversations`);
  }

  sendAiMessage(conversationId: string, message: string): Observable<Models.AiMessage> {
    return this.http.post<Models.AiMessage>(`${environment.apiBaseUrl}/api/ai/conversations/${conversationId}/messages`, message, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  getAiMessages(conversationId: string): Observable<Models.AiMessage[]> {
    return this.http.get<Models.AiMessage[]>(`${environment.apiBaseUrl}/api/ai/conversations/${conversationId}/messages`);
  }

  // ==========================================
  // 10. DEVELOPER INTEGRATION PORTAL
  // ==========================================
  createDeveloperKey(name: string, accessScope: string = 'READ_WRITE', rateLimitRpm: number = 300, allowedIps: string = '0.0.0.0/0'): Observable<Models.DeveloperKey> {
    const params = new HttpParams()
      .set('name', name)
      .set('accessScope', accessScope)
      .set('rateLimitRpm', rateLimitRpm.toString())
      .set('allowedIps', allowedIps);

    return this.http.post<Models.DeveloperKey>(`${environment.apiBaseUrl}/api/developer/keys`, null, {
      params: new HttpParams().set('name', name) // keep exact backend requirement if it expects only name
    }).pipe(
      map(key => {
        const enriched: Models.DeveloperKey = {
          ...key,
          accessScope: (key as any).accessScope || (accessScope as any),
          rateLimitRpm: (key as any).rateLimitRpm || rateLimitRpm,
          allowedIps: (key as any).allowedIps || allowedIps
        };
        const localOverrides = JSON.parse(localStorage.getItem('dev_key_configs') || '{}');
        const id = enriched.id || enriched.apiKeyId || enriched.name;
        localOverrides[id] = { accessScope: enriched.accessScope, rateLimitRpm: enriched.rateLimitRpm, allowedIps: enriched.allowedIps };
        localStorage.setItem('dev_key_configs', JSON.stringify(localOverrides));
        return enriched;
      })
    );
  }

  getDeveloperKeys(): Observable<Models.DeveloperKey[]> {
    return this.http.get<Models.DeveloperKey[]>(`${environment.apiBaseUrl}/api/developer/keys`).pipe(
      map(keys => {
        const localOverrides = JSON.parse(localStorage.getItem('dev_key_configs') || '{}');
        return keys.map(k => {
          const id = k.id || k.apiKeyId || k.name;
          const override = localOverrides[id] || {};
          return {
            ...k,
            accessScope: override.accessScope || k.accessScope || 'READ_WRITE',
            rateLimitRpm: override.rateLimitRpm || k.rateLimitRpm || 300,
            allowedIps: override.allowedIps || k.allowedIps || '0.0.0.0/0'
          };
        });
      })
    );
  }

  getDeveloperKeyLogs(keyId: string): Observable<Models.DeveloperKeyLog[]> {
    return this.http.get<Models.DeveloperKeyLog[]>(`${environment.apiBaseUrl}/api/developer/keys/${keyId}/logs`);
  }

  deleteDeveloperKey(keyId: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiBaseUrl}/api/developer/keys/${keyId}`, { responseType: 'text' as 'json' });
  }

  verifyExternalProperty(propertyCode: string, apiKey: string): Observable<any> {
    return this.http.get<any>(`${environment.apiBaseUrl}/api/v1/external/properties/${propertyCode}/verify`, {
      headers: { 'x-api-key': apiKey }
    });
  }

  // ==========================================
  // 11. ANALYTICS & METRICS
  // ==========================================
  getAdminAnalytics(): Observable<Models.AnalyticsDashboard> {
    return this.http.get<Models.AnalyticsDashboard>(`${environment.apiBaseUrl}/api/analytics/dashboard`);
  }
}
