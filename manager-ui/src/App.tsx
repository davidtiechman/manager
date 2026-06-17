import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import Preview from './components/realTimeView/Preview';
import AgentHistoryPage from './components/historyView/AgentHistoryPage';
import AgentRosterList from './components/rosterView/AgentRosterList';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './components/NotFound';
import AuthGate from './auth/AuthGate';
import { takeReturnPath } from './auth/refreshSession';

// After SSO returns to /, jump back to where the user was.
function RestoreLocation() {
  const navigate = useNavigate();
  useEffect(() => {
    const path = takeReturnPath();
    if (path && path !== window.location.pathname + window.location.search) {
      navigate(path, { replace: true });
    }
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <AuthGate>
      <BrowserRouter>
        <RestoreLocation />
        <ErrorBoundary>
          <Routes>
          {/* Default view */}
          <Route path="/" element={<Preview />} />
          <Route path="/agents/:agentId" element={<Preview />} />

          <Route path="/history" element={<AgentRosterList />} />
          <Route path="/history/:agentId" element={<AgentHistoryPage />} />

          {/* Unknown routes */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthGate>
  );
}
