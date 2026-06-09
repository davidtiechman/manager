import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Preview from './components/realTimeView/Preview';
import AgentHistoryPage from './components/historyView/AgentHistoryPage';
import AgentRosterList from './components/rosterView/AgentRosterList';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './components/NotFound';
import AuthGate from './auth/AuthGate';

export default function App() {
  return (
    <AuthGate>
      <BrowserRouter>
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
