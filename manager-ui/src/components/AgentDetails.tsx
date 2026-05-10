import type { AgentStatus } from '../types';
import ConfigurationTable from './agent-details/ConfigurationTable';
import LinkQualityTable from './agent-details/LinkQualityTable';
import PlatformTable from './agent-details/PlatformTable';
import SyncDetailsTable from './agent-details/SyncDetailsTable';


interface Props {
  agentID: AgentStatus;
  onClose: () => void;
}

export default function Details({ agentID, onClose }: Props) {
  return (
    <div className="details-panel">
      <div className="details-header">
        <h2>Agent Details</h2>
        <button onClick={onClose}>Close</button>
      </div>
      <div className="details-tables-grid">
        <LinkQualityTable agentID={agentID} />
        <SyncDetailsTable agentID={agentID} />
        <PlatformTable agentID={agentID} />
        <ConfigurationTable agentID={agentID} />
      </div>
    </div>
  );
}
