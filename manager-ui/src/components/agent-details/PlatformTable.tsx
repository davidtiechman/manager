import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import { toPlatformTable } from '../../types/realTimeAgents/adapter';

interface Props {
  agent: AgentResponse;
}

export default function PlatformTable({ agent }: Props) {
  const fields = toPlatformTable(agent);

  return (
    <section className="details-section">
      <h3>Platform</h3>

      <table className="details-table">
        <tbody>
          {fields.map((field) => (
            <tr key={field.key}>
              <td>{field.label}</td>
              <td>{String(field.value ?? '')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
