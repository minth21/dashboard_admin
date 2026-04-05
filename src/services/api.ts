import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 600000, // 10 minutes for long AI tasks
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
    username: string;
    password: string;
}

export interface User {
    id: string;
    username: string;
    name: string;
    email?: string;
    role: 'STUDENT' | 'TEACHER' | 'SPECIALIST' | 'ADMIN';
    avatarUrl?: string;
    status: 'ACTIVE' | 'LOCKED';
    isFirstLogin: boolean;
    averageScore?: number;
    totalAttempts?: number;
    highestScore?: number;
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
        const response = await api.get(`/users/me?t=${Date.now()}`);
        return response.data;
    },

    updatePassword: async (data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/auth/update-password', data);
        return response.data;
    },

    changeFirstPassword: async (data: { newPassword: string }): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/auth/change-first-password', data);
        return response.data;
    },
};

export const dashboardApi = {
    getStats: async (): Promise<{
        success: boolean;
        data: {
            users: number;
            tests: number;
            questions: number;
            averageScore: number;
            totalSubmissions: number;
            topStudents: any[];
            recentSubmissions: any[];
        }
    }> => {
        const response = await api.get(`/dashboard/stats?t=${Date.now()}`);
        return response.data;
    },

    getSubmissionDetail: async (id: string): Promise<{ success: boolean; data: any }> => {
        const response = await api.get(`/practice/attempt/${id}?t=${Date.now()}`);
        return response.data;
    }
};

export interface Test {
    id: string;
    title: string;
    testType: 'LISTENING' | 'READING';
    difficulty: 'A1_A2' | 'B1_B2' | 'C1';
    status: 'PENDING' | 'ACTIVE' | 'LOCKED' | 'REJECTED';
    rejectReason?: string;
    duration: number;
    totalQuestions: number;
    createdAt: string;
    updatedAt: string;
}

export interface Part {
    id: string;
    testId: string;
    partNumber: number;
    partName: string;
    totalQuestions: number;
    instructions?: string;
    instructionImgUrl?: string;
    status: 'PENDING' | 'ACTIVE' | 'LOCKED' | 'REJECTED';
    rejectReason?: string;
    orderIndex: number;
    completedQuestions: number;
    createdAt: string;
    updatedAt: string;
    timeLimit?: number; // in seconds
    audioUrl?: string;
}

export interface Notification {
    id: string;
    userId: string;
    title: string;
    content: string;
    type: 'TEST_SUBMITTED' | 'TEST_PENDING' | 'TEST_APPROVED' | 'TEST_REJECTED' | 'SYSTEM' | 'TEST_COMPLAINT' | 'COMPLAINT_RESOLVED' | 'STUDENT_FEEDBACK' | 'FEEDBACK_RESOLVED';
    isRead: boolean;
    relatedId?: string;
    createdAt: string;
}

export interface StudentFeedback {
    id: string;
    content: string;
    imageUrl?: string;
    status: 'PENDING' | 'RESOLVED';
    userId: string;
    user?: { name: string; avatarUrl?: string };
    teacherId: string;
    teacher?: { name: string };
    classId: string;
    class?: { className: string; classCode?: string };
    createdAt: string;
}

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
    getDetails: async (partId: string): Promise<{ success: boolean; part: Part }> => {
        const response = await api.get(`/parts/${partId}?isAdmin=true&t=${Date.now()}`);
        return response.data;
    },
    update: async (partId: string, data: Partial<Part>): Promise<{ success: boolean; part: Part; message?: string }> => {
        const response = await api.patch(`/parts/${partId}`, data);
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
    create: async (testId: string, data: Partial<Part>): Promise<{ success: boolean; part: Part; message?: string }> => {
        const response = await api.post(`/tests/${testId}/parts`, data);
        return response.data;
    },
    delete: async (partId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete(`/parts/${partId}`);
        return response.data;
    },
    toggleLock: async (partId: string): Promise<{ success: boolean; message: string; part: any }> => {
        const response = await api.patch(`/parts/${partId}/toggle-lock`);
        return response.data;
    },
    approve: async (partId: string): Promise<{ success: boolean; part: Part; message?: string }> => {
        const response = await api.patch(`/parts/${partId}/approve`);
        return response.data;
    },
    reject: async (partId: string, reason: string): Promise<{ success: boolean; part: Part; message?: string }> => {
        const response = await api.patch(`/parts/${partId}/reject`, { reason });
        return response.data;
    },
    getQuestions: async (partId: string, status?: string, level?: string): Promise<{ success: boolean; questions: any[] }> => {
        const statusParam = status && status !== 'ALL' ? `&status=${status}` : '';
        const levelParam = level && level !== 'ALL' ? `&level=${level}` : '';
        const response = await api.get(`/parts/${partId}/questions?isAdmin=true${statusParam}${levelParam}&t=${Date.now()}`);
        return response.data;
    },
    toggleAllQuestionsStatus: async (partId: string, status: string = 'LOCKED'): Promise<{ success: boolean; message: string }> => {
        const response = await api.patch(`/parts/${partId}/questions/toggle-status`, { status });
        return response.data;
    }
};

/**
 * Test API helpers
 */
export const testApi = {
    list: async (page: number, limit: number, difficulty?: string, status?: string, search?: string): Promise<{ success: boolean; data: any[]; meta: { pagination: any; stats: any } }> => {
        const difficultyParam = difficulty && difficulty !== 'ALL' ? `&difficulty=${difficulty}` : '';
        const statusParam = status && status !== 'ALL' ? `&status=${status}` : '';
        const searchParam = search ? `&search=${search}` : '';
        const response = await api.get(`/tests?page=${page}&limit=${limit}${difficultyParam}${statusParam}${searchParam}&isAdmin=true&t=${Date.now()}`);
        return response.data;
    },
    getDetails: async (testId: string): Promise<{ success: boolean; test: Test }> => {
        const response = await api.get(`/tests/${testId}?isAdmin=true&t=${Date.now()}`);
        return response.data;
    },
    getParts: async (testId: string, status?: string): Promise<{ success: boolean; parts: Part[] }> => {
        const statusParam = status && status !== 'ALL' ? `&status=${status}` : '';
        const response = await api.get(`/tests/${testId}/parts?isAdmin=true${statusParam}&t=${Date.now()}`);
        return response.data;
    },
    create: async (data: any): Promise<{ success: boolean; test: any; message?: string }> => {
        const response = await api.post('/tests', data);
        return response.data;
    },
    update: async (testId: string, data: Partial<Test>): Promise<{ success: boolean; test: Test; message?: string }> => {
        const response = await api.patch(`/tests/${testId}`, data);
        return response.data;
    },
    delete: async (testId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete(`/tests/${testId}`);
        return response.data;
    },
    toggleLock: async (testId: string): Promise<{ success: boolean; message: string; test: any }> => {
        const response = await api.patch(`/tests/${testId}/toggle-lock`);
        return response.data;
    },
    approve: async (testId: string): Promise<{ success: boolean; test: any; message?: string }> => {
        const response = await api.patch(`/tests/${testId}/approve`);
        return response.data;
    },
    approveFull: async (testId: string): Promise<{ success: boolean; message?: string }> => {
        const response = await api.patch(`/tests/${testId}/approve-full`);
        return response.data;
    },
    reject: async (testId: string, rejectReason: string): Promise<{ success: boolean; test: Test; message?: string }> => {
        const response = await api.patch(`/tests/${testId}/reject`, { rejectReason });
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
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete(`/questions/${id}`);
        return response.data;
    },
    approve: async (id: string): Promise<{ success: boolean; question: any; message?: string }> => {
        const response = await api.patch(`/questions/${id}/approve`);
        return response.data;
    },
    toggleLock: async (id: string): Promise<{ success: boolean; message: string; question: any }> => {
        const response = await api.patch(`/questions/${id}/toggle-lock`);
        return response.data;
    },
    toggleBulkStatus: async (questionIds: string[], status: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.patch('/questions/bulk-status', { questionIds, status });
        return response.data;
    },
};

/**
 * User API helpers
 */
export const userApi = {
    list: async (page: number, limit: number, role?: string, search?: string): Promise<{ success: boolean; users: any[]; pagination: any }> => {
        const roleParam = role && role !== 'ALL' ? `&role=${role}` : '';
        const searchParam = search ? `&search=${search}` : '';
        const response = await api.get(`/users?page=${page}&limit=${limit}${roleParam}${searchParam}&t=${Date.now()}`);
        return response.data;
    },
    getUserById: async (userId: string): Promise<{ success: boolean; user: any }> => {
        const response = await api.get(`/users/${userId}?t=${Date.now()}`);
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
    createUserAuto: async (data: any): Promise<{ success: boolean; data: { user: any; defaultPassword: string }; message?: string }> => {
        const response = await api.post('/admin/users/auto', data);
        return response.data;
    },
    updateAvatar: async (formData: FormData): Promise<{ success: boolean; user: any; message?: string }> => {
        const response = await api.post('/users/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    getCurrentUser: async (): Promise<{ success: boolean; data: { user: User } }> => {
        const response = await api.get(`/users/me?t=${Date.now()}`);
        return response.data;
    },
    updateProfile: async (data: any): Promise<{ success: boolean; user: any; message?: string }> => {
        const response = await api.patch('/users/me', data);
        return response.data;
    },
    toggleStatus: async (userId: string, status: 'ACTIVE' | 'LOCKED'): Promise<{ success: boolean; message: string }> => {
        const response = await api.patch(`/users/${userId}/status`, { status });
        return response.data;
    },
    getLeaderboard: async (): Promise<{ success: boolean; data: any[] }> => {
        const response = await api.get(`/users/leaderboard?t=${Date.now()}`);
        return response.data;
    }
};

/**
 * Teacher API helpers
 */
export const teacherApi = {
    getStudentProgress: async (studentId: string): Promise<{ success: boolean; data: any[] }> => {
        const response = await api.get(`/teacher/students/${studentId}/progress?t=${Date.now()}`);
        return response.data;
    },
    exportStudentHistoryExcel: async (studentId: string): Promise<Blob> => {
        const response = await api.get(`/teacher/students/${studentId}/export-excel`, {
            responseType: 'blob'
        });
        return response.data;
    },
    exportStudentHistoryPdf: async (studentId: string): Promise<Blob> => {
        const response = await api.get(`/teacher/students/${studentId}/export-pdf`, {
            responseType: 'blob'
        });
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
    },
    enrichPart5Question: async (data: any): Promise<{ success: boolean; data: any; message?: string }> => {
        const response = await api.post('/ai/enrich-part5', data);
        return response.data;
    },
    enrichPart5Batch: async (data: any): Promise<{ success: boolean; data: any; message?: string }> => {
        const response = await api.post('/ai/enrich-part5-batch', data);
        return response.data;
    },
    generateReadingExplanation: async (data: any, partNumber: number = 7): Promise<{ success: boolean; data: any; message?: string }> => {
        const formData = new FormData();
        if (data.passageText) formData.append('passageText', data.passageText);
        if (data.images && data.images.length > 0) {
            data.images.forEach((img: any) => formData.append('images', img));
        }
        formData.append('questions', JSON.stringify(data.questions));

        const endpoint = partNumber === 6 ? '/ai/generate-part6' : '/ai/generate-part7';
        const response = await api.post(endpoint, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    magicScanPart7: async (formData: FormData): Promise<{ success: boolean; data: any; message?: string }> => {
        const response = await api.post('/ai/magic-scan-part7', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    getAiTimeline: async (userId: string, page: number = 1): Promise<{ 
        success: boolean; 
        data: any[]; 
        meta: { total: number; page: number; lastPage: number } 
    }> => {
        const response = await api.get(`/ai/timeline/${userId}?page=${page}&t=${Date.now()}`);
        return response.data;
    }
};

/**
 * Class API helpers
 */
export interface Class {
    id: string;
    classCode: string | null;
    className: string;
    description?: string;
    teacherId: string;
    teacher?: {
        id: string;
        name: string;
        username: string;
        avatarUrl?: string;
    };
    studentCount?: number;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
}

export const classApi = {
    list: async (): Promise<{ success: boolean; data: Class[] }> => {
        const response = await api.get(`/classes?t=${Date.now()}`);
        return response.data;
    },
    create: async (data: any): Promise<{ success: boolean; data: Class; message?: string }> => {
        const response = await api.post('/classes', data);
        return response.data;
    },
    update: async (classId: string, data: any): Promise<{ success: boolean; data: Class; message?: string }> => {
        const response = await api.put(`/classes/${classId}`, data);
        return response.data;
    },
    delete: async (classId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete(`/classes/${classId}`);
        return response.data;
    },
    getStudents: async (classId: string): Promise<{ success: boolean; data: any[] }> => {
        const response = await api.get(`/classes/${classId}/students?t=${Date.now()}`);
        return response.data;
    },
    getMyClasses: async (): Promise<{ success: boolean; data: Class[] }> => {
        const response = await api.get(`/classes/my-classes?t=${Date.now()}`);
        return response.data;
    },
    exportClassPerformance: async (classId: string): Promise<Blob> => {
        const response = await api.get(`/classes/${classId}/export`, {
            responseType: 'blob'
        });
        return response.data;
    },
    toggleStatus: async (classId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<{ success: boolean; message: string }> => {
        const response = await api.patch(`/classes/${classId}/status`, { status });
        return response.data;
    },

    // --- LMS: MATERIALS ---
    getMaterials: async (classId: string): Promise<{ success: boolean; data: any[] }> => {
        const response = await api.get(`/classes/${classId}/materials?t=${Date.now()}`);
        return response.data;
    },
    addMaterial: async (classId: string, data: any, file?: File): Promise<{ success: boolean; data: any; message?: string }> => {
        const formData = new FormData();
        Object.keys(data).forEach(key => formData.append(key, data[key]));
        if (file) formData.append('file', file);

        const response = await api.post(`/classes/${classId}/materials`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    deleteMaterial: async (materialId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete(`/classes/materials/${materialId}`);
        return response.data;
    }
};

/**
 * Notification API helpers
 */
export const notificationApi = {
    list: async (): Promise<{ success: boolean; data: { notifications: Notification[]; unreadCount: number } }> => {
        const response = await api.get(`/notifications?t=${Date.now()}`);
        return response.data;
    },
    markRead: async (id: string | 'all'): Promise<{ success: boolean; message: string }> => {
        const response = await api.patch(`/notifications/${id}/read`);
        return response.data;
    },
};

/**
 * Complaint API helpers
 */
export interface Complaint {
    id: string;
    testId: string;
    test?: { title: string };
    userId: string;
    user?: { name: string; role: string };
    content: string;
    status: 'PENDING' | 'RESOLVED';
    createdAt: string;
}

export const complaintApi = {
    send: async (data: { testId: string; content: string }): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/complaints', data);
        return response.data;
    },
    list: async (): Promise<{ success: boolean; data: Complaint[] }> => {
        const response = await api.get(`/complaints?t=${Date.now()}`);
        return response.data;
    },
    resolve: async (id: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.patch(`/complaints/${id}/resolve`);
        return response.data;
    }
};

export const feedbackApi = {
    send: async (data: { classId: string; content: string; imageUrl?: string }): Promise<{ success: boolean; data: StudentFeedback; message?: string }> => {
        const response = await api.post('/feedbacks', data);
        return response.data;
    },
    list: async (): Promise<{ success: boolean; data: StudentFeedback[] }> => {
        const response = await api.get(`/feedbacks?t=${Date.now()}`);
        return response.data;
    },
    resolve: async (id: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.patch(`/feedbacks/${id}/resolve`);
        return response.data;
    }
};

export default api;
