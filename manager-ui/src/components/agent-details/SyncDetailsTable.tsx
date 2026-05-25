import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import { toSyncDetailsTable } from '../../types/realTimeAgents/adapter';
import { formatOptionalDate } from './dateFormat';

interface Props {
  agent: AgentResponse;
}

export default function SyncDetailsTable({ agent }: Props) {
  const fields = toSyncDetailsTable(agent);

  function renderValue(key: string, value: unknown) {
    if (
      (key === 'nextDeliveryTime' || key === 'serverLut' || key === 'lastSeen') &&
      value
    ) {
      return formatOptionalDate(value as string | number | Date);
    }

    return String(value ?? '');
  }

  return (
    <section className="details-section">
      <h3>Sync Details</h3>

      <table className="details-table">
        <tbody>
          {fields.map((field) => (
            <tr key={field.key}>
              <td>{field.label}</td>
              <td>{renderValue(field.key, field.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
