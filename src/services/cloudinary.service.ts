import axios from 'axios';
// We'll replace this with Vite's env vars later, but let's mock it for now
// import { environment } from '../../environments/environment';

export interface CloudinaryUploadResponse {
  secure_url: string;
  url: string;
  resource_type: string;
  format: string;
  duration?: number;
  public_id: string;
}

const getCloudinaryConfig = () => {
  // Use Vite env variables
  return {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dc1q2h4tc',
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'landlense',
  };
}

export const cloudinaryService = {
  uploadFile: async (file: File): Promise<CloudinaryUploadResponse> => {
    const config = getCloudinaryConfig();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', config.uploadPreset);

    const url = `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`;

    const response = await axios.post<CloudinaryUploadResponse>(url, formData);
    return response.data;
  },

  getThumbnailUrl: (uploadRes: CloudinaryUploadResponse): string => {
    const url = uploadRes.secure_url;
    if (uploadRes.resource_type === 'video') {
      return url.replace(/\.[^/.]+$/, '.jpg').replace('/upload/', '/upload/so_1/');
    }
    if (uploadRes.resource_type === 'image') {
      return url.replace('/upload/', '/upload/c_scale,w_300/');
    }
    return '/assets/images/document-icon.png';
  }
};
