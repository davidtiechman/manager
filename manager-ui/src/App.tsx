import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Preview from './components/realTimeView/Preview';
import AgentSyncsList from './components/historyView/AgentSyncsList';
import AgentRosterList from './components/rosterView/AgentRosterList';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default view */}
        <Route path="/" element={<Preview />} />
        <Route path="/agents/:agentId" element={<Preview />} />

        <Route path="/history" element={<AgentRosterList />} />
        <Route path="/history/:agentId" element={<AgentSyncsList />} />
      </Routes>
    </BrowserRouter>
  );
}
