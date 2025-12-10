import { api } from '@/lib/axios';

export interface User {
    id: number;
    email: string;
    role: string;
}

export interface AuthResponse {
    access_token: string;
    // refresh_token is handled via HTTPOnly cookie
}

export const authApi = {
    login: async (data: any) => {
        const response = await api.post<AuthResponse>('/auth/login', data);
        return response.data;
    },
    
    register: async (data: any) => {
        const response = await api.post<AuthResponse>('/users', data); // Assuming simple register for now
        return response.data;
    },

    getProfile: async () => {
        return api.get<User>('/auth/profile');
    },

    logout: async () => {
        return api.post('/auth/logout');
    },

    generateMfa: async () => {
        const response = await api.post<{ secret: string; qrCode: string }>('/auth/mfa/generate');
        return response.data;
    },

    enableMfa: async (code: string) => {
        const response = await api.post<{ message: string }>('/auth/mfa/enable', { code });
        return response.data;
    },

    disableMfa: async () => {
        const response = await api.post<{ message: string }>('/auth/mfa/disable');
        return response.data;
    },

    verifyMfaLogin: async (data: { mfa_session_id: string; code: string }) => {
        const response = await api.post<AuthResponse>('/auth/mfa/verify', data);
        return response.data;
    }
};
