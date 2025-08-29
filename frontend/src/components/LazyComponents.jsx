import React, { Suspense } from 'react';

// Lazy load components that are not immediately needed
const ConfirmInline = React.lazy(() => import('./ConfirmInline'));
const LLMResponse = React.lazy(() => import('./LLMResponse'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded p-4">
    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
  </div>
);

// Wrapper components with Suspense
export const LazyConfirmInline = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <ConfirmInline {...props} />
  </Suspense>
);

export const LazyLLMResponse = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LLMResponse {...props} />
  </Suspense>
);