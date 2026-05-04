import type { AgentStatus } from '../../types';

interface Props {
  agent: AgentStatus;
}

export default function PlatformTable({ agent }: Props) {
  return (
    <section className="details-section">
      <h3>Platform</h3>
      <table className="details-table">
        <tbody>
          <tr><td>platform id unit code</td><td>{agent.platform_id_unit_code}</td></tr>
          <tr><td>unit code</td><td>{agent.unit_code}</td></tr>
          <tr><td>unit</td><td>{agent.unit}</td></tr>
          <tr><td>zaiyad id</td><td>{agent.zayad_id}</td></tr>
          <tr><td>platform id</td><td>{agent.platform_id}</td></tr>
          <tr><td>platform name</td><td>{agent.platform}</td></tr>
          <tr><td>created id</td><td>{agent.created_id}</td></tr>
        </tbody>
      </table>
    </section>
  );
}
