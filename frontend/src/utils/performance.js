// Performance monitoring utilities

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.isEnabled = process.env.NODE_ENV === 'production';
    }

    // Track component render times
    trackComponentRender(componentName, renderTime) {
        if (!this.isEnabled) return;
        
        if (!this.metrics.has('componentRenders')) {
            this.metrics.set('componentRenders', new Map());
        }
        
        const componentMetrics = this.metrics.get('componentRenders');
        if (!componentMetrics.has(componentName)) {
            componentMetrics.set(componentName, []);
        }
        
        componentMetrics.get(componentName).push(renderTime);
        
        // Keep only last 100 measurements
        if (componentMetrics.get(componentName).length > 100) {
            componentMetrics.get(componentName).shift();
        }
    }

    // Track API call performance
    trackApiCall(endpoint, duration, success) {
        if (!this.isEnabled) return;
        
        if (!this.metrics.has('apiCalls')) {
            this.metrics.set('apiCalls', new Map());
        }
        
        const apiMetrics = this.metrics.get('apiCalls');
        if (!apiMetrics.has(endpoint)) {
            apiMetrics.set(endpoint, { calls: 0, totalTime: 0, errors: 0 });
        }
        
        const metric = apiMetrics.get(endpoint);
        metric.calls++;
        metric.totalTime += duration;
        
        if (!success) {
            metric.errors++;
        }
    }

    // Track memory usage
    trackMemoryUsage() {
        if (!this.isEnabled || !performance.memory) return;
        
        const memory = performance.memory;
        this.metrics.set('memory', {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            timestamp: Date.now()
        });
    }

    // Track bundle size
    trackBundleSize() {
        if (!this.isEnabled) return;
        
        // This would be set during build time
        const bundleSize = window.__BUNDLE_SIZE__ || {};
        this.metrics.set('bundleSize', bundleSize);
    }

    // Get performance report
    getReport() {
        const report = {
            timestamp: Date.now(),
            metrics: {}
        };

        // Component render metrics
        if (this.metrics.has('componentRenders')) {
            const componentRenders = this.metrics.get('componentRenders');
            report.metrics.componentRenders = {};
            
            for (const [component, times] of componentRenders) {
                const avg = times.reduce((a, b) => a + b, 0) / times.length;
                const max = Math.max(...times);
                const min = Math.min(...times);
                
                report.metrics.componentRenders[component] = {
                    average: avg.toFixed(2),
                    max: max.toFixed(2),
                    min: min.toFixed(2),
                    count: times.length
                };
            }
        }

        // API call metrics
        if (this.metrics.has('apiCalls')) {
            const apiCalls = this.metrics.get('apiCalls');
            report.metrics.apiCalls = {};
            
            for (const [endpoint, metric] of apiCalls) {
                report.metrics.apiCalls[endpoint] = {
                    calls: metric.calls,
                    averageTime: (metric.totalTime / metric.calls).toFixed(2),
                    errorRate: ((metric.errors / metric.calls) * 100).toFixed(2) + '%'
                };
            }
        }

        // Memory metrics
        if (this.metrics.has('memory')) {
            const memory = this.metrics.get('memory');
            report.metrics.memory = {
                used: this.formatBytes(memory.used),
                total: this.formatBytes(memory.total),
                limit: this.formatBytes(memory.limit),
                usage: ((memory.used / memory.total) * 100).toFixed(2) + '%'
            };
        }

        return report;
    }

    // Format bytes to human readable format
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Start monitoring
    start() {
        if (!this.isEnabled) return;
        
        // Track memory usage every 30 seconds
        this.memoryInterval = setInterval(() => {
            this.trackMemoryUsage();
        }, 30000);
        
        // Track bundle size on load
        this.trackBundleSize();
        
        console.log('Performance monitoring started');
    }

    // Stop monitoring
    stop() {
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
        }
        
        console.log('Performance monitoring stopped');
    }

    // Log performance report
    logReport() {
        const report = this.getReport();
        console.log('Performance Report:', report);
        return report;
    }
}

// Higher-order component for tracking render performance
export function withPerformanceTracking(WrappedComponent, componentName) {
    return function PerformanceTrackedComponent(props) {
        const startTime = performance.now();
        
        const result = <WrappedComponent {...props} />;
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        // Track render time
        if (window.performanceMonitor) {
            window.performanceMonitor.trackComponentRender(componentName, renderTime);
        }
        
        return result;
    };
}

// Hook for tracking API calls
export function useApiPerformance() {
    return {
        trackApiCall: (endpoint, duration, success) => {
            if (window.performanceMonitor) {
                window.performanceMonitor.trackApiCall(endpoint, duration, success);
            }
        }
    };
}

// Initialize performance monitor
const performanceMonitor = new PerformanceMonitor();

// Make it globally available
if (typeof window !== 'undefined') {
    window.performanceMonitor = performanceMonitor;
    window.performanceMonitor.start();
}

export default performanceMonitor;