import api from './api';
import type { User, RoleType } from '../models/property.models';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: RoleType;
  email: string;
}

export const authService = {
  register: async (userData: any): Promise<string> => {
    const response = await api.post('/api/auth/register', userData, {
      responseType: 'text'
    });
    return response.data;
  },

  login: async (credentials: any): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login', credentials);
    const res = response.data;
    
    localStorage.setItem('access_token', res.accessToken);
    localStorage.setItem('refresh_token', res.refreshToken);
    localStorage.setItem('user_role', res.role);

    return res;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/api/users/me');
    const user = response.data;
    
    localStorage.setItem('user_role', user.role);
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('user_profile', JSON.stringify(user));
    
    return user;
  },

  logout: async (): Promise<void> => {
    const token = localStorage.getItem('refresh_token');
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_profile');

    if (token) {
      try {
        await api.post('/api/auth/logout', { refreshToken: token }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Logout failed on server', err);
      }
    }
    
    window.location.href = '/auth/login';
  },

  refreshAccessToken: async (): Promise<any> => {
    const token = localStorage.getItem('refresh_token');
    if (!token) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/api/auth/refresh', { refreshToken: token });
    const res = response.data;

    const newAccessToken = res.accessToken || res.token;
    if (newAccessToken) {
      localStorage.setItem('access_token', newAccessToken);
      if (res.refreshToken) {
        localStorage.setItem('refresh_token', res.refreshToken);
      }
    }

    return res;
  },

  isLoggedIn: (): boolean => {
    return Boolean(localStorage.getItem('access_token') || localStorage.getItem('refresh_token') || localStorage.getItem('user_role'));
  },

  getUserRole: (): RoleType | null => {
    return localStorage.getItem('user_role') as RoleType | null;
  },

  currentUser: (): User | null => {
    const role = localStorage.getItem('user_role') as RoleType;
    if (!role) return null;
    
    const profileStr = localStorage.getItem('user_profile');
    if (profileStr) {
      try {
        return JSON.parse(profileStr);
      } catch (e) {}
    }
    
    return {
      id: localStorage.getItem('user_id') || 'u-123',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: role,
      isActive: true
    };
  }
};
