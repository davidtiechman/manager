import type { AgentStatus } from '../../types';
import { formatOptionalDate } from './dateFormat';

interface Props {
  agentID: AgentStatus;
  // agent: SyncDetailsTableData;
}

export default function SyncDetailsTable({ agentID }: Props) {
  return (
    <section className="details-section">
      <h3>Sync Details</h3>
      <table className="details-table">
        <tbody>
          <tr><td>session</td><td>{agentID.session_time}</td></tr>
          <tr><td>scheduler</td><td>{agentID.scheduler_mode}</td></tr>
          <tr><td>messages in queue</td><td>{agentID.messages_in_queue}</td></tr>
          <tr><td>last delivery time</td><td>{formatOptionalDate(agentID.last_delivery_time)}</td></tr>
          <tr><td>geo data</td><td>{agentID.geo_data}</td></tr>
          <tr><td>server id</td><td>{agentID.server_id}</td></tr>
        </tbody>
      </table>
    </section>
  );
}
