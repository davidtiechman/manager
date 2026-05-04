import type { AgentStatus } from '../../types';
import { formatOptionalDate } from './dateFormat';

interface Props {
  agent: AgentStatus;
}

export default function SyncDetailsTable({ agent }: Props) {
  return (
    <section className="details-section">
      <h3>Sync Details</h3>
      <table className="details-table">
        <tbody>
          <tr><td>session</td><td>{agent.session_time}</td></tr>
          <tr><td>scheduler</td><td>{agent.scheduler_mode}</td></tr>
          <tr><td>messages in queue</td><td>{agent.messages_in_queue}</td></tr>
          <tr><td>last delivery time</td><td>{formatOptionalDate(agent.last_delivery_time)}</td></tr>
          <tr><td>geo data</td><td>{agent.geo_data}</td></tr>
          <tr><td>server id</td><td>{agent.server_id}</td></tr>
        </tbody>
      </table>
    </section>
  );
}
