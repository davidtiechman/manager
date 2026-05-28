import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import { toLinkQualityTable } from '../../types/realTimeAgents/adapter';
import { formatDate } from './dateFormat';

interface Props {
  agent: AgentResponse;
  // table: LinkQualityTableData;
}

export default function LinkQualityTable({ agent }: Props) {
  const link = toLinkQualityTable(agent);
  return (
    <section className="details-section">
      <h3>Link Quality</h3>
      <table className="details-table">
        <tbody>
          <tr><td>link type</td><td>{link.linkType}</td></tr>
          <tr><td>available</td><td>{String(link.linkAvailable)}</td></tr>
          <tr><td>quality</td><td>{link.linkQuality}</td></tr>
          <tr><td>latency</td><td>{link.latency}</td></tr>
          <tr><td>reliability</td><td>{link.reliability}</td></tr>
          <tr><td>timestamp</td><td>{formatDate(link.linkTimestamp)}</td></tr>
        </tbody>
      </table>
    </section>
  );
}
