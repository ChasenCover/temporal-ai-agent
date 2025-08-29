const API_BASE_URL = 'http://127.0.0.1:8000';

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 5000; // 5 seconds cache

// Request deduplication
const pendingRequests = new Map();

class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}

// Cache management
function getCacheKey(url, method = 'GET') {
    return `${method}:${url}`;
}

function isCacheValid(timestamp) {
    return Date.now() - timestamp < CACHE_DURATION;
}

function getCachedResponse(key) {
    const cached = cache.get(key);
    if (cached && isCacheValid(cached.timestamp)) {
        return cached.data;
    }
    cache.delete(key);
    return null;
}

function setCachedResponse(key, data) {
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
}

// Request deduplication
function getOrCreateRequest(key, requestFn) {
    if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
    }
    
    const promise = requestFn().finally(() => {
        pendingRequests.delete(key);
    });
    
    pendingRequests.set(key, promise);
    return promise;
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

// Optimized fetch with timeout and performance tracking
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const startTime = performance.now();
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Track API performance
        if (window.performanceMonitor) {
            window.performanceMonitor.trackApiCall(url, duration, response.ok);
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Track API performance for errors
        if (window.performanceMonitor) {
            window.performanceMonitor.trackApiCall(url, duration, false);
        }
        
        if (error.name === 'AbortError') {
            throw new ApiError('Request timeout', 408);
        }
        throw error;
    }
}

export const apiService = {
    async getConversationHistory() {
        const cacheKey = getCacheKey(`${API_BASE_URL}/get-conversation-history`);
        
        // Check cache first
        const cached = getCachedResponse(cacheKey);
        if (cached) {
            return cached;
        }
        
        return getOrCreateRequest(cacheKey, async () => {
            try {
                const res = await fetchWithTimeout(`${API_BASE_URL}/get-conversation-history`);
                const data = await handleResponse(res);
                
                // Cache successful responses
                setCachedResponse(cacheKey, data);
                return data;
            } catch (error) {
                throw new ApiError(
                    'Failed to fetch conversation history',
                    error.status || 500
                );
            }
        });
    },

    async sendMessage(message) {
        if (!message?.trim()) {
            throw new ApiError('Message cannot be empty', 400);
        }

        // Clear conversation cache when sending a new message
        const conversationCacheKey = getCacheKey(`${API_BASE_URL}/get-conversation-history`);
        cache.delete(conversationCacheKey);

        try {
            const res = await fetchWithTimeout(
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
        // Clear all caches when starting a new workflow
        cache.clear();
        
        try {
            const res = await fetchWithTimeout(
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
        // Clear conversation cache when confirming
        const conversationCacheKey = getCacheKey(`${API_BASE_URL}/get-conversation-history`);
        cache.delete(conversationCacheKey);
        
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/confirm`, { 
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
    },

    // Utility method to clear cache
    clearCache() {
        cache.clear();
    },

    // Utility method to get cache stats
    getCacheStats() {
        return {
            size: cache.size,
            keys: Array.from(cache.keys())
        };
    },

    // Get performance metrics
    getPerformanceMetrics() {
        if (window.performanceMonitor) {
            return window.performanceMonitor.getReport();
        }
        return null;
    }
}; 