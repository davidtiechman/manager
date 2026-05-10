import type { AgentStatus } from '../../types';

interface Props {
  agentID: AgentStatus;
  // agent: PlatformTableData;
}

export default function PlatformTable({ agentID }: Props) {
  return (
    <section className="details-section">
      <h3>Platform</h3>
      <table className="details-table">
        <tbody>
          <tr><td>platform id unit code</td><td>{agentID.platform_id_unit_code}</td></tr>
          <tr><td>unit code</td><td>{agentID.unit_code}</td></tr>
          <tr><td>unit</td><td>{agentID.unit}</td></tr>
          <tr><td>zaiyad id</td><td>{agentID.zayad_id}</td></tr>
          <tr><td>platform id</td><td>{agentID.platform_id}</td></tr>
          <tr><td>platform name</td><td>{agentID.platform}</td></tr>
          <tr><td>created id</td><td>{agentID.created_id}</td></tr>
        </tbody>
      </table>
    </section>
  );
}
