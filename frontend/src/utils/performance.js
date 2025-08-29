// Performance monitoring utilities

export class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    
    // Monitor Core Web Vitals
    this.observeWebVitals();
    
    // Monitor API performance
    this.observeApiCalls();
    
    // Monitor React render performance
    this.observeReactPerformance();
    
    this.initialized = true;
  }

  observeWebVitals() {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
        console.log('LCP:', lastEntry.startTime);
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // First Input Delay
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
          console.log('FID:', this.metrics.fid);
        });
      });
      
      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        this.metrics.cls = clsValue;
        console.log('CLS:', clsValue);
      });
      
      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }
  }

  observeApiCalls() {
    // Track API call performance
    this.metrics.apiCalls = [];
    
    // Override fetch to track API performance
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const url = args[0];
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        
        this.metrics.apiCalls.push({
          url,
          duration,
          status: response.status,
          timestamp: Date.now()
        });
        
        // Log slow API calls
        if (duration > 1000) {
          console.warn(`Slow API call: ${url} took ${duration.toFixed(2)}ms`);
        }
        
        return response;
      } catch (error) {
        const duration = performance.now() - start;
        this.metrics.apiCalls.push({
          url,
          duration,
          error: error.message,
          timestamp: Date.now()
        });
        throw error;
      }
    };
  }

  observeReactPerformance() {
    // Monitor React component render times
    if (window.React && window.React.Profiler) {
      this.metrics.reactRenders = [];
    }
  }

  // Mark custom performance events
  mark(name) {
    if (performance.mark) {
      performance.mark(name);
    }
  }

  // Measure between two marks
  measure(name, startMark, endMark) {
    if (performance.measure) {
      performance.measure(name, startMark, endMark);
      const measures = performance.getEntriesByName(name);
      const lastMeasure = measures[measures.length - 1];
      console.log(`${name}: ${lastMeasure.duration.toFixed(2)}ms`);
      return lastMeasure.duration;
    }
  }

  // Get performance summary
  getSummary() {
    return {
      ...this.metrics,
      navigation: performance.getEntriesByType('navigation')[0],
      resources: performance.getEntriesByType('resource').length
    };
  }

  // Clean up observers
  cleanup() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (e) {
        console.warn('Failed to disconnect observer:', e);
      }
    });
    this.observers = [];
    this.initialized = false;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      performanceMonitor.init();
    });
  } else {
    performanceMonitor.init();
  }
}

// React Profiler component for measuring render performance
export const ProfiledComponent = ({ name, children, onRender }) => {
  const handleRender = (id, phase, actualDuration, baseDuration, startTime, commitTime, interactions) => {
    performanceMonitor.metrics.reactRenders = performanceMonitor.metrics.reactRenders || [];
    performanceMonitor.metrics.reactRenders.push({
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      timestamp: Date.now()
    });

    if (actualDuration > 16) { // More than one frame
      console.warn(`Slow render: ${id} took ${actualDuration.toFixed(2)}ms`);
    }

    if (onRender) {
      onRender(id, phase, actualDuration, baseDuration, startTime, commitTime, interactions);
    }
  };

  return React.createElement(React.Profiler, {
    id: name,
    onRender: handleRender
  }, children);
};