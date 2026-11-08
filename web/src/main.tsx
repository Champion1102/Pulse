import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { ToastProvider } from './components/Toast';
import './index.css';

// Each screen is its own chunk: students on phones only download the play screen.
const Home = lazy(() => import('./pages/Home'));
const Play = lazy(() => import('./pages/Play'));
const Host = lazy(() => import('./pages/Host'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AppShell = lazy(() => import('./pages/app/AppShell'));
const Quizzes = lazy(() => import('./pages/app/Quizzes'));
const Library = lazy(() => import('./pages/app/Library'));
const Drafts = lazy(() => import('./pages/app/Drafts'));
const ImportPage = lazy(() => import('./pages/app/Import'));
const Reports = lazy(() => import('./pages/app/Reports'));
const Report = lazy(() => import('./pages/app/Report'));
const Settings = lazy(() => import('./pages/app/Settings'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-[100dvh]" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/play" element={<Play />} />
            <Route path="/play/:code" element={<Play />} />
            <Route path="/host/:code" element={<Host />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Quizzes />} />
              <Route path="library" element={<Library />} />
              <Route path="drafts" element={<Drafts />} />
              <Route path="import" element={<ImportPage />} />
              <Route path="reports" element={<Reports />} />
              <Route path="reports/:sessionId" element={<Report />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>,
);
