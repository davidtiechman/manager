import type { AgentStatus ,AgentConfig} from '../types';
import ConfigurationTable from './agent-details/ConfigurationTable';
import LinkQualityTable from './agent-details/LinkQualityTable';
import PlatformTable from './agent-details/PlatformTable';
import SyncDetailsTable from './agent-details/SyncDetailsTable';


interface Props {
  agent: AgentStatus;
  onClose: () => void;
}

export default function Details({ agent, onClose }: Props) {
  return (
    <div className="details-panel">
      <div className="details-header">
        <h2>Agent Details</h2>
        <button onClick={onClose}>Close</button>
      </div>
      <div className="details-tables-grid">
        <LinkQualityTable agent={agent} />
        <SyncDetailsTable agent={agent} />
        <PlatformTable agent={agent} />
        <ConfigurationTable agent={agent} />
      </div>
    </div>
  );
}
