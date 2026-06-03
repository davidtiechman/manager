import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import type { ConfigurationTableData } from '../../types/realTimeAgents/tables';
import ConfigurationTable from '../agent-details/ConfigurationTable';
import LinkQualityTable from '../agent-details/LinkQualityTable';
import PlatformTable from '../agent-details/PlatformTable';
import SyncDetailsTable from '../agent-details/SyncDetailsTable';
import { Link } from 'react-router-dom';

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

export default function AgentDetails({
  agent,
  onClose,
  onConfigurationEditChange,
  onConfigurationSaved,
  configurationMessage,
  onConfigurationMessageChange,
}: Props) {
  const unitCode = agent.status.details.agentData.unit_code;

  return (
    <div className="details-panel">
      <div className="details-header">
        <div className="details-title-block">
          <h2>Agent Details</h2>
        </div>
        <div className="details-header-actions details-header-actions-left">
          <Link to={`/history/${agent.id}`}
            state={{backTo: `/agents/${agent.id}`}}
           className="details-history-button">
            History
          </Link>
          <div className="details-agent-badges">
            <p className="details-agent-id">Agent ID: {agent.id}</p>
            <p className="details-agent-id">Unit Code: {unitCode}</p>
          </div>
        </div>
        <div className="details-header-actions details-header-actions-right">
          <button type="button" className="details-close-button" onClick={onClose}>
            Close
          </button>
        </div>
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
