import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CloudinaryUploadResponse {
  secure_url: string;
  url: string;
  resource_type: string;
  format: string;
  duration?: number; // for videos
  public_id: string;
}

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private http = inject(HttpClient);

  // Upload any file (image, video, document)
  uploadFile(file: File): Observable<CloudinaryUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', environment.cloudinary.uploadPreset);

    const url = `https://api.cloudinary.com/v1_1/${environment.cloudinary.cloudName}/auto/upload`;

    return this.http.post<CloudinaryUploadResponse>(url, formData);
  }

  // Helper to generate a thumbnail URL for images or videos
  getThumbnailUrl(uploadRes: CloudinaryUploadResponse): string {
    const url = uploadRes.secure_url;
    if (uploadRes.resource_type === 'video') {
      // Create a JPG thumbnail for a video at second 1 of playback
      return url.replace(/\.[^/.]+$/, '.jpg').replace('/upload/', '/upload/so_1/');
    }
    if (uploadRes.resource_type === 'image') {
      // Resize the image to a thumbnail dimensions
      return url.replace('/upload/', '/upload/c_scale,w_300/');
    }
    // For PDFs/documents, return a default document icon
    return 'assets/images/document-icon.png';
  }
}
