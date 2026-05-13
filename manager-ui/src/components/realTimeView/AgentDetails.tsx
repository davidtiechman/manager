import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import type { ConfigurationTableData } from '../../types/realTimeAgents/tables';
import ConfigurationTable from '../agent-details/ConfigurationTable';
import LinkQualityTable from '../agent-details/LinkQualityTable';
import PlatformTable from '../agent-details/PlatformTable';
import SyncDetailsTable from '../agent-details/SyncDetailsTable';

interface Props {
  agent: AgentResponse;
  onClose: () => void;
  onConfigurationEditChange: (isEditing: boolean) => void;
  onConfigurationSaved: (
    agentId: string,
    configuration: ConfigurationTableData
  ) => void;
  configurationMessage: string;
  onConfigurationMessageChange: (message: string) => void;
}

export default function Details({
  agent,
  onClose,
  onConfigurationEditChange,
  onConfigurationSaved,
  configurationMessage,
  onConfigurationMessageChange,
}: Props) {
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
        <ConfigurationTable
          key={agent.id}
          agent={agent}
          onEditChange={onConfigurationEditChange}
          onConfigSaved={onConfigurationSaved}
          message={configurationMessage}
          onMessageChange={onConfigurationMessageChange}
        />
      </div>
    </div>
  );
}
