import type { AgentResponse } from '../../types/agentResponse';
import type { ConfigurationTableData } from '../../types/tables';
import { useEffect, useState } from 'react';
import { ApiService } from '../../api';
import { toConfigurationTable } from '../../types/adapter';

interface Props {
  agent: AgentResponse;
}

const fields = [
  ['selectedLink', 'selected link', 'text'],
  ['schedulerMode', 'scheduler mode', 'text'],
  ['intervalMs', 'interval ms', 'number'],
  ['maxRetries', 'max retries', 'number'],
  ['sparkProxyUrl', 'spark proxy url', 'text'],
  ['token', 'token', 'text'],
  ['batchSize', 'batch size', 'number'],
  ['isManualMode', 'is manual mode', 'checkbox'],
] as const;

export default function ConfigurationTable({ agent }: Props) {
  const [configuration, setConfiguration] = useState<ConfigurationTableData>(
    toConfigurationTable(agent)
  );

  const [isEdit, setIsEdit] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setConfiguration(toConfigurationTable(agent));
    setIsEdit(false);
    setMessage('');
  }, [agent]);

  const updateConfig = (
    field: keyof ConfigurationTableData,
    value: ConfigurationTableData[keyof ConfigurationTableData]
  ) => {
    setConfiguration((prev) => ({
      ...prev,
      [field]: value,
    }));

    setIsEdit(true);
  };

  const handleSave = async () => {
    try {
      const updatedConfig = await ApiService.updateAgentConfig(
        agent.id,
        configuration
      );

      setConfiguration(updatedConfig);
      setIsEdit(false);
      setMessage('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
      setMessage('Failed to save configuration');
    }
  };

  return (
    <section className="details-section">
      <h3>Configuration</h3>

      <table className="details-table">
        <tbody>
          {fields.map(([field, label, type]) => {
            const value = configuration[field];

            return (
              <tr key={field}>
                <td>{label}</td>

                <td>
                  <input
                    type={type}
                    checked={type === 'checkbox' ? Boolean(value) : undefined}
                    value={type !== 'checkbox' ? String(value ?? '') : undefined}
                    onChange={(e) => {
                      const newValue =
                        type === 'checkbox'
                          ? e.target.checked
                          : type === 'number'
                            ? Number(e.target.value)
                            : e.target.value;

                      updateConfig(field, newValue);
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button onClick={handleSave} disabled={!isEdit}>
        Save
      </button>

      <p>{message}</p>
    </section>
  );
}