import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Preview from './components/realTimeView/Preview';
import AgentHistoryList from './components/historyView/AgentHistoryList';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default view */}
        <Route path="/" element={<Preview />} />
        <Route path="/agents/:agentId" element={<Preview />} />

        <Route path="/history" element={<AgentHistoryList />} />
        <Route path="/history/:agentId" element={<AgentHistoryList />} />
      </Routes>
    </BrowserRouter>
  );
}
