import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface LoginRequest {
    email: string;
    password: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'STUDENT' | 'ADMIN';
    avatarUrl?: string;
    createdAt: string;
}

export interface LoginResponse {
    success: boolean;
    message?: string;
    user?: User;
    token?: string;
}

export const authApi = {
    login: async (data: LoginRequest): Promise<LoginResponse> => {
        const response = await api.post('/auth/login', data);
        return response.data;
    },

    getCurrentUser: async (): Promise<{ success: boolean; data: { user: User } }> => {
        const response = await api.get('/auth/me');
        return response.data;
    },
};

export default api;
