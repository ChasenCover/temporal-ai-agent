const API_BASE_URL = 'http://127.0.0.1:8000';

class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
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

// Request cache for conversation history to reduce redundant API calls
let conversationCache = {
    data: null,
    timestamp: 0,
    ttl: 500 // 500ms cache
};

export const apiService = {
    async getConversationHistory() {
        // Check cache first to reduce API calls
        const now = Date.now();
        if (conversationCache.data && (now - conversationCache.timestamp) < conversationCache.ttl) {
            return conversationCache.data;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/get-conversation-history`, {
                // Add cache headers for better performance
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            const data = await handleResponse(res);
            
            // Update cache
            conversationCache = {
                data,
                timestamp: now,
                ttl: 500
            };
            
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