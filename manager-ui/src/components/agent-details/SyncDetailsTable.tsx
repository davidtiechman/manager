import type { AgentResponse } from '../../types/agentResponse';
import { toSyncDetailsTable } from '../../types/adapter';
import { formatOptionalDate } from './dateFormat';

interface Props {
  agent: AgentResponse;
}

export default function SyncDetailsTable({ agent }: Props) {
  const sync = toSyncDetailsTable(agent);

  return (
    <section className="details-section">
      <h3>Sync Details</h3>

      <table className="details-table">
        <tbody>
          <tr><td>status</td><td>{sync.status}</td></tr>
          <tr><td>scheduler mode</td><td>{sync.schedulerMode}</td></tr>
          <tr><td>selected link</td><td>{sync.selectedLink}</td></tr>
          <tr><td>messages in queue</td><td>{sync.messagesInQueue}</td></tr>
          <tr><td>next delivery time</td><td>{formatOptionalDate(sync.nextDeliveryTime)}</td></tr>
          <tr><td>server lut</td><td>{formatOptionalDate(sync.serverLut)}</td></tr>
          <tr><td>last seen</td><td>{formatOptionalDate(sync.lastSeen)}</td></tr>
        </tbody>
      </table>
    </section>
  );
}