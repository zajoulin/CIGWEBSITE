/* ==========================================================================
   CIG — Entry point for the single-file static build
   Mounts the same React application used by the Next.js app, backed by a
   hash router so the whole platform works from one HTML document.
   ========================================================================== */

import { createRoot } from 'react-dom/client';
import { App } from './src/App';
import { RouterProvider, useHashRouter } from './src/lib/router';

const Root = () => {
  const router = useHashRouter();
  return (
    <RouterProvider value={router}>
      <App />
    </RouterProvider>
  );
};

const mount = () => {
  const el = document.getElementById('cig-root');
  if (!el) return;
  createRoot(el).render(<Root />);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
