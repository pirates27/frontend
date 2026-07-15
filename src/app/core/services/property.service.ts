import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Property {
  id: string;
  propertyCode: string;
  title: string;
  category: 'AGRICULTURAL' | 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL';
  area: number;
  price: number;
  description: string;
  surveyNumber: string;
  address: string;
  latitude: number;
  longitude: number;
  district: string;
  village: string;
  state: string;
  pincode: string;
  threeSixtyImageUrl?: string;
  status: 'PENDING_AI' | 'PENDING_GOVT' | 'APPROVED' | 'REJECTED';
  providerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PropertyImage {
  id?: string;
  imageUrl: string;
  thumbnailUrl: string;
  displayOrder: number;
}

export interface PropertyVideo {
  id?: string;
  videoUrl: string;
  duration?: number;
  thumbnailUrl?: string;
}

export interface PropertyDocument {
  id: string;
  documentType: 'PATTA' | 'SALE_DEED' | 'TAX_RECEIPT' | 'ENCUMBRANCE_CERTIFICATE';
  fileUrl: string;
  ocrStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';
  rawText?: string;
}

export interface Visit {
  id: string;
  buyerId: string;
  propertyId: string;
  visitDate: string;
  visitTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED';
  property?: Property;
  buyerName?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PropertyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  createProperty(property: Partial<Property>): Observable<Property> {
    return this.http.post<Property>(`${this.baseUrl}/api/properties`, property);
  }

  getProperties(filters?: {
    district?: string;
    state?: string;
    category?: string;
    maxPrice?: number;
  }): Observable<Property[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.district) params = params.set('district', filters.district);
      if (filters.state) params = params.set('state', filters.state);
      if (filters.category) params = params.set('category', filters.category);
      if (filters.maxPrice) params = params.set('maxPrice', filters.maxPrice.toString());
    }
    return this.http.get<Property[]>(`${this.baseUrl}/api/properties`, { params });
  }

  getPropertyById(id: string): Observable<Property> {
    return this.http.get<Property>(`${this.baseUrl}/api/properties/${id}`);
  }

  updateProperty(id: string, property: Partial<Property>): Observable<Property> {
    return this.http.put<Property>(`${this.baseUrl}/api/properties/${id}`, property);
  }

  deleteProperty(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/properties/${id}`);
  }

  // Media Management
  uploadImage(propertyId: string, image: PropertyImage): Observable<PropertyImage> {
    return this.http.post<PropertyImage>(`${this.baseUrl}/api/properties/${propertyId}/images`, image);
  }

  getImages(propertyId: string): Observable<PropertyImage[]> {
    return this.http.get<PropertyImage[]>(`${this.baseUrl}/api/properties/${propertyId}/images`);
  }

  uploadVideo(propertyId: string, video: PropertyVideo): Observable<PropertyVideo> {
    return this.http.post<PropertyVideo>(`${this.baseUrl}/api/properties/${propertyId}/videos`, video);
  }

  getVideos(propertyId: string): Observable<PropertyVideo[]> {
    return this.http.get<PropertyVideo[]>(`${this.baseUrl}/api/properties/${propertyId}/videos`);
  }

  // Bookmarks / Saved Watchlist
  saveProperty(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/properties/${id}/save`, {});
  }

  unsaveProperty(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/properties/${id}/save`);
  }

  getSavedProperties(): Observable<Property[]> {
    return this.http.get<Property[]>(`${this.baseUrl}/api/properties/saved`);
  }

  // Visits Scheduling
  scheduleVisit(propertyId: string, payload: { visitDate: string; visitTime: string }): Observable<Visit> {
    return this.http.post<Visit>(`${this.baseUrl}/api/properties/${propertyId}/visit`, payload);
  }

  getVisits(): Observable<Visit[]> {
    return this.http.get<Visit[]>(`${this.baseUrl}/api/properties/visits`);
  }

  updateVisitStatus(visitId: string, status: 'CONFIRMED' | 'REJECTED'): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/properties/visits/${visitId}`, null, {
      params: new HttpParams().set('status', status),
    });
  }

  // Land Documents & OCR
  uploadDocument(propertyId: string, payload: { documentType: string; fileUrl: string }): Observable<PropertyDocument> {
    return this.http.post<PropertyDocument>(`${this.baseUrl}/api/properties/${propertyId}/documents`, payload);
  }

  getDocuments(propertyId: string): Observable<PropertyDocument[]> {
    return this.http.get<PropertyDocument[]>(`${this.baseUrl}/api/properties/${propertyId}/documents`);
  }

  triggerOCR(docId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/documents/${docId}/ocr`, null);
  }
}
