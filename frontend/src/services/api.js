const API_BASE_URL = 'http://127.0.0.1:8000';

// Simple cache for API responses
const cache = new Map();
const CACHE_DURATION = 1000; // 1 second cache

class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}

function getCachedResponse(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    return null;
}

function setCachedResponse(key, data) {
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
}

async function handleResponse(response) {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
            errorData.message || 'An error occurred',
            response.status
        );
    }
    return response.json();
}

export const apiService = {
    async getConversationHistory() {
        const cacheKey = 'conversation-history';
        const cached = getCachedResponse(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/get-conversation-history`);
            const data = await handleResponse(res);
            setCachedResponse(cacheKey, data);
            return data;
        } catch (error) {
            throw new ApiError(
                'Failed to fetch conversation history',
                error.status || 500
            );
        }
    },

    async sendMessage(message) {
        if (!message?.trim()) {
            throw new ApiError('Message cannot be empty', 400);
        }

        try {
            const res = await fetch(
                `${API_BASE_URL}/send-prompt?prompt=${encodeURIComponent(message)}`,
                { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            return handleResponse(res);
        } catch (error) {
            throw new ApiError(
                'Failed to send message',
                error.status || 500
            );
        }
    },

    async startWorkflow() {
        try {
            const res = await fetch(
                `${API_BASE_URL}/start-workflow`,
                { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            return handleResponse(res);
        } catch (error) {
            throw new ApiError(
                'Failed to start workflow',
                error.status || 500
            );
        }
    },

    async confirm() {
        try {
            const res = await fetch(`${API_BASE_URL}/confirm`, { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return handleResponse(res);
        } catch (error) {
            throw new ApiError(
                'Failed to confirm action',
                error.status || 500
            );
        }
    }
}; 