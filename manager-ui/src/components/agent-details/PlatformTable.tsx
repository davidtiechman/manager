import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import { toPlatformTable } from '../../types/realTimeAgents/adapter';

interface Props {
  agent: AgentResponse;
}

export default function PlatformTable({ agent }: Props) {
  const platform = toPlatformTable(agent);

  return (
    <section className="details-section">
      <h3>Platform</h3>

      <table className="details-table">
        <tbody>
          <tr><td>unit code</td><td>{platform.unit_code}</td></tr>
          <tr><td>unit</td><td>{platform.unit}</td></tr>
          <tr><td>zayad id</td><td>{platform.zayad_id}</td></tr>
          <tr><td>call sign</td><td>{platform.call_sign}</td></tr>
          <tr><td>platform id</td><td>{platform.platformId}</td></tr>
          <tr><td>platform name</td><td>{platform.platformName}</td></tr>
        </tbody>
      </table>
    </section>
  );
}