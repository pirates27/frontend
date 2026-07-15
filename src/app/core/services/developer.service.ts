import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiKey {
  id?: string;
  apiKeyId?: string; // mapping to DB id
  name: string;
  prefix: string;
  status: 'ACTIVE' | 'REVOKED';
  rawApiKey?: string;
  createdAt?: string;
  expiryDate?: string;
}

export interface ApiLog {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  ipAddress: string;
  requestTimestamp: string;
  responseTimeMs: number;
}

@Injectable({
  providedIn: 'root',
})
export class DeveloperService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  createApiKey(name: string): Observable<ApiKey> {
    return this.http.post<ApiKey>(`${this.baseUrl}/api/developer/keys`, null, {
      params: { name },
    });
  }

  getApiKeys(): Observable<ApiKey[]> {
    return this.http.get<ApiKey[]>(`${this.baseUrl}/api/developer/keys`);
  }

  getApiKeyLogs(keyId: string): Observable<ApiLog[]> {
    return this.http.get<ApiLog[]>(`${this.baseUrl}/api/developer/keys/${keyId}/logs`);
  }

  revokeApiKey(keyId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/developer/keys/${keyId}`);
  }

  verifyPropertyExternally(code: string, apiKey: string): Observable<any> {
    const headers = new HttpHeaders().set('x-api-key', apiKey);
    return this.http.get(`${this.baseUrl}/api/v1/external/properties/${code}/verify`, { headers });
  }
}
