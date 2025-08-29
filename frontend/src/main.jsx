import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css"; // Tailwind imports
import { performanceMonitor } from "./utils/performance";

// Lazy load the App component for better initial load performance
const App = lazy(() => import("./pages/App"));

const container = document.getElementById("root");
const root = createRoot(container);

// Add a loading fallback for the lazy-loaded component
root.render(
  <Suspense fallback={
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading Temporal AI Agent...</p>
      </div>
    </div>
  }>
    <App />
  </Suspense>
);
