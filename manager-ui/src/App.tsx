import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Preview from './components/realTimeView/Preview';
import AgentSyncsList from './components/historyView/AgentSyncsList';
import SyncDetails from './components/historyView/SyncDetails';
import AgentHistoryList from './components/historyView/AgentHistoryList';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Preview />} />

        <Route path="/history" element={<AgentHistoryList />} />
        <Route path="/history/:agentId" element={<AgentHistoryList />} />
        <Route path="/agents/:agentId/history" element={<AgentSyncsList />} />

        <Route path="/agents/:agentId/history/:syncId" element={<SyncDetails />} />
      </Routes>
    </BrowserRouter>
  );
}
