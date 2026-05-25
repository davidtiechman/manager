import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import { toLinkQualityTable } from '../../types/realTimeAgents/adapter';
import { formatDate } from './dateFormat';

interface Props {
  agent: AgentResponse;
  // table: LinkQualityTableData;
}

export default function LinkQualityTable({ agent }: Props) {
  const fields = toLinkQualityTable(agent);

  function renderValue(key: string, value: unknown) {
    if (key === 'linkTimestamp' && value) {
      return formatDate(value as string | number | Date);
    }

    if (typeof value === 'boolean') {
      return String(value);
    }

    return String(value ?? '');
  }

  return (
    <section className="details-section">
      <h3>Link Quality</h3>
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
