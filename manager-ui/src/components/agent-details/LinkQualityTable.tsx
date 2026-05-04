import type { AgentStatus } from '../../types';
import { formatDate } from './dateFormat';

interface Props {
  agent: AgentStatus;
}

export default function LinkQualityTable({ agent }: Props) {
  return (
    <section className="details-section">
      <h3>Link Quality</h3>
      <table className="details-table">
        <tbody>
          <tr><td>link type</td><td>{agent.linkType}</td></tr>
          <tr><td>available</td><td>{String(agent.linkAvailable)}</td></tr>
          <tr><td>quality</td><td>{agent.linkQuality}</td></tr>
          <tr><td>latency</td><td>{agent.latency}</td></tr>
          <tr><td>reliability</td><td>{agent.reliability}</td></tr>
          <tr><td>timestamp</td><td>{formatDate(agent.linkTimestamp)}</td></tr>
        </tbody>
      </table>
    </section>
  );
}
