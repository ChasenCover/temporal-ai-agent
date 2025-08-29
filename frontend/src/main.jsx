import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
const App = React.lazy(() => import("./pages/App"));
import "./index.css"; // Tailwind imports

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <Suspense fallback={<div className="p-4 text-gray-600">Loading…</div>}>
    <App />
  </Suspense>
);
