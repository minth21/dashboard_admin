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
        const response = await api.get('/users/me');
        return response.data;
    },
};

export const dashboardApi = {
    getStats: async (): Promise<{ success: boolean; data: { users: number; tests: number; questions: number } }> => {
        const response = await api.get('/dashboard/stats');
        return response.data;
    },
};

/**
 * Upload image file to server
 * Uses axios with proper FormData configuration
 */
export const uploadApi = {
    image: async (file: File | Blob): Promise<{ success: boolean; url: string; publicId: string; message?: string }> => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await api.post('/upload/image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    },

    audio: async (file: File | Blob): Promise<{ success: boolean; url: string; publicId: string; message?: string }> => {
        const formData = new FormData();
        formData.append('audio', file);

        const response = await api.post('/upload/audio', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    }
};

/**
 * Part API helpers
 */
export const partApi = {
    getDetails: async (partId: string): Promise<{ success: boolean; part: any }> => {
        const response = await api.get(`/parts/${partId}`);
        return response.data;
    },
    update: async (partId: string, data: any): Promise<{ success: boolean; part: any; message?: string }> => {
        const response = await api.patch(`/parts/${partId}`, data);
        return response.data;
    },
    getQuestions: async (partId: string): Promise<{ success: boolean; questions: any[] }> => {
        const response = await api.get(`/parts/${partId}/questions`);
        return response.data;
    },
    importQuestions: async (partId: string, formData: FormData): Promise<{ success: boolean; data: { count: number }; message?: string }> => {
        const response = await api.post(`/parts/${partId}/questions/import`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    deleteAllQuestions: async (partId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete(`/parts/${partId}/questions`);
        return response.data;
    },
    create: async (testId: string, data: any): Promise<{ success: boolean; part: any; message?: string }> => {
        const response = await api.post(`/tests/${testId}/parts`, data);
        return response.data;
    },
    delete: async (partId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete(`/parts/${partId}`);
        return response.data;
    }
};

/**
 * Test API helpers
 */
export const testApi = {
    list: async (page: number, limit: number, difficulty?: string, status?: string, search?: string): Promise<{ success: boolean; tests: any[]; pagination: any }> => {
        const difficultyParam = difficulty && difficulty !== 'ALL' ? `&difficulty=${difficulty}` : '';
        const statusParam = status && status !== 'ALL' ? `&status=${status}` : '';
        const searchParam = search ? `&search=${search}` : '';
        const response = await api.get(`/tests?page=${page}&limit=${limit}${difficultyParam}${statusParam}${searchParam}`);
        return response.data;
    },
    getDetails: async (testId: string): Promise<{ success: boolean; test: any }> => {
        const response = await api.get(`/tests/${testId}`);
        return response.data;
    },
    getParts: async (testId: string): Promise<{ success: boolean; parts: any[] }> => {
        const response = await api.get(`/tests/${testId}/parts`);
        return response.data;
    },
    create: async (data: any): Promise<{ success: boolean; test: any; message?: string }> => {
        const response = await api.post('/tests', data);
        return response.data;
    },
    update: async (testId: string, data: any): Promise<{ success: boolean; test: any; message?: string }> => {
        const response = await api.patch(`/tests/${testId}`, data);
        return response.data;
    },
    delete: async (testId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete(`/tests/${testId}`);
        return response.data;
    }
};

/**
 * Question API helpers
 */
export const questionApi = {
    create: async (partId: string, data: any): Promise<{ success: boolean; question: any; message?: string }> => {
        const response = await api.post(`/parts/${partId}/questions`, data);
        return response.data;
    },
    update: async (id: string, data: any): Promise<{ success: boolean; question: any; message?: string }> => {
        const response = await api.patch(`/questions/${id}`, data);
        return response.data;
    },
    deleteBulk: async (questionIds: string[]): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete('/questions/bulk', {
            data: { questionIds }
        });
        return response.data;
    },
    /**
     * Generate AI explanations for multiple questions in a part
     */
    generateBatchExplanations: async (partId: string, questionIds: number[]): Promise<{ success: boolean; message: string; count: number }> => {
        const response = await api.post(`/parts/${partId}/questions/generate-explanations`, {
            questionIds
        });
        return response.data;
    }
};

/**
 * User API helpers
 */
export const userApi = {
    list: async (page: number, limit: number, role?: string, search?: string): Promise<{ success: boolean; users: any[]; pagination: any }> => {
        const roleParam = role && role !== 'ALL' ? `&role=${role}` : '';
        const searchParam = search ? `&search=${search}` : '';
        const response = await api.get(`/users?page=${page}&limit=${limit}${roleParam}${searchParam}`);
        return response.data;
    },
    create: async (data: any): Promise<{ success: boolean; user: any; message?: string }> => {
        const response = await api.post('/users', data);
        return response.data;
    },
    update: async (userId: string, data: any): Promise<{ success: boolean; user: any; message?: string }> => {
        const response = await api.patch(`/users/${userId}`, data);
        return response.data;
    },
    updateAvatar: async (formData: FormData): Promise<{ success: boolean; user: any; message?: string }> => {
        const response = await api.post('/users/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    getCurrentUser: async (): Promise<{ success: boolean; data: { user: User } }> => {
        const response = await api.get('/users/me');
        return response.data;
    }
};

/**
 * AI API helpers
 */
export const aiApi = {
    generateExplanation: async (data: any): Promise<{ success: boolean; explanation: string; message?: string }> => {
        const response = await api.post('/ai/generate-explanation', data);
        return response.data;
    }
};

export default api;
