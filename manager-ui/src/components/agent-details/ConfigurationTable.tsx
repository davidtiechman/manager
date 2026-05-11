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
  const [isDirty, setIsDirty] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setConfiguration(toConfigurationTable(agent));
    setIsEdit(false);
    setIsDirty(false);
    setIsMenuOpen(false);
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
    setIsDirty(true);
  };

  const openEdit = () => {
    setIsEdit(true);
    setIsMenuOpen(false);
    setMessage('');
  };

  const cancelEdit = () => {
    setConfiguration(toConfigurationTable(agent));
    setIsEdit(false);
    setIsDirty(false);
    setMessage('');
  };

  const handleSave = async () => {
    try {
      const updatedConfig = await ApiService.updateAgentConfig(
        agent.id,
        configuration
      );

      setConfiguration(updatedConfig);
      setIsDirty(false);
      setIsEdit(false);
      setMessage('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
      setMessage('Failed to save configuration');
    }
  };

  return (
    <section className="details-section">
      <div className="details-section-header">
        <h3>Configuration</h3>
        <div className="table-menu">
          <button
            type="button"
            className="menu-button"
            aria-label="Configuration actions"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            &#8942;
          </button>
          {isMenuOpen && (
            <div className="menu-dropdown" role="menu">
              <button type="button" role="menuitem" onClick={openEdit}>
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      <table className="details-table">
        <tbody>
          {fields.map(([field, label, type]) => {
            const value = configuration[field];

            return (
              <tr key={field}>
                <td>{label}</td>
                <td>
                  {isEdit ? (
                    <input
                      className="input-fields"
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
                  ) : (
                    <span>
                      {type === 'checkbox' ? String(value) : String(value ?? '')}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {isEdit && (
        <div className="edit-actions">
          <button onClick={handleSave} disabled={!isDirty}>
            Save
          </button>
          <button type="button" onClick={cancelEdit}>
            Cancel
          </button>
        </div>
      )}

      {message && <p className="config-message">{message}</p>}
    </section>
  );
}
