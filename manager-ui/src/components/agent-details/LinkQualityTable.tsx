import type { AgentStatus } from '../../types';
import { formatDate } from './dateFormat';

interface Props {
  agentID: AgentStatus;
  // table: LinkQualityTableData;
}

export default function LinkQualityTable({ agentID }: Props) {
  return (
    <section className="details-section">
      <h3>Link Quality</h3>
      <table className="details-table">
        <tbody>
          <tr><td>link type</td><td>{agentID.linkType}</td></tr>
          <tr><td>available</td><td>{String(agentID.linkAvailable)}</td></tr>
          <tr><td>quality</td><td>{agentID.linkQuality}</td></tr>
          <tr><td>latency</td><td>{agentID.latency}</td></tr>
          <tr><td>reliability</td><td>{agentID.reliability}</td></tr>
          <tr><td>timestamp</td><td>{formatDate(agentID.linkTimestamp)}</td></tr>
        </tbody>
      </table>
    </section>
  );
}
