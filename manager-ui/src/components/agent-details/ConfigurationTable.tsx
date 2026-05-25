import { useEffect, useRef, useState } from 'react';
import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import type {
  ConfigurationPayload,
  ConfigurationTableData,
  TableField,
} from '../../types/realTimeAgents/tables';
import { ApiService } from '../../api';
import {
  getFieldValue,
  toConfigurationTable,
} from '../../types/realTimeAgents/adapter';

type FieldType = 'text' | 'number' | 'checkbox';

const fieldTypes: Record<string, FieldType> = {
  selectedLink: 'text',
  schedulerMode: 'text',
  intervalMs: 'number',
  maxRetries: 'number',
  sparkProxyUrl: 'text',
  token: 'text',
  batchSize: 'number',
  isManualMode: 'checkbox',
};

interface Props {
  agent: AgentResponse;
  onEditChange: (isEditing: boolean) => void;
  onConfigSaved: (
    agentId: string,
    configuration: ConfigurationTableData
  ) => void;
  message: string;
  onMessageChange: (message: string) => void;
}

function isSameConfiguration(
  left: ConfigurationTableData,
  right: ConfigurationTableData
) {
  return left.every((leftField) => {
    const rightValue = getFieldValue<unknown>(right, leftField.key);
    return leftField.value === rightValue;
  });
}

function updateFieldValue(
  fields: ConfigurationTableData,
  key: string,
  value: unknown
): ConfigurationTableData {
  return fields.map((field) =>
    field.key === key
      ? {
          ...field,
          value,
        }
      : field
  );
}

function toApiConfiguration(
  configuration: ConfigurationTableData
): ConfigurationPayload {
  return {
    schedulerMode: getFieldValue<string>(configuration, 'schedulerMode'),
    selectedLink: getFieldValue<string>(configuration, 'selectedLink'),
    intervalMs: getFieldValue<number>(configuration, 'intervalMs'),
    maxRetries: getFieldValue<number>(configuration, 'maxRetries'),
    sparkProxyUrl: getFieldValue<string>(configuration, 'sparkProxyUrl'),
    token: getFieldValue<string>(configuration, 'token'),
    batchSize: getFieldValue<number>(configuration, 'batchSize'),
    isManualMode: getFieldValue<boolean>(configuration, 'isManualMode'),
  };
}

export default function ConfigurationTable({
  agent,
  onEditChange,
  onConfigSaved,
  message,
  onMessageChange,
}: Props) {
  const [configuration, setConfiguration] = useState<ConfigurationTableData>(
    toConfigurationTable(agent)
  );
  const [isEdit, setIsEdit] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const lastSavedConfigRef = useRef<ConfigurationTableData | null>(null);

  useEffect(() => {
    onEditChange(isEdit);

    return () => {
      onEditChange(false);
    };
  }, [isEdit, onEditChange]);

  useEffect(() => {
    if (isEdit || isDirty) {
      return;
    }

    const agentConfiguration = toConfigurationTable(agent);
    const lastSavedConfig = lastSavedConfigRef.current;

    if (
      lastSavedConfig &&
      !isSameConfiguration(agentConfiguration, lastSavedConfig)
    ) {
      return;
    }

    lastSavedConfigRef.current = null;
    setConfiguration(agentConfiguration);
    setIsMenuOpen(false);
  }, [agent, isEdit, isDirty]);

  const updateConfig = (key: string, value: unknown) => {
    setConfiguration((prev) => updateFieldValue(prev, key, value));
    setIsDirty(true);
  };

  const openEdit = () => {
    lastSavedConfigRef.current = null;
    setIsEdit(true);
    setIsMenuOpen(false);
    onMessageChange('');
  };

  const cancelEdit = () => {
    lastSavedConfigRef.current = null;
    setConfiguration(toConfigurationTable(agent));
    setIsEdit(false);
    setIsDirty(false);
    onMessageChange('');
  };

  const handleSave = async () => {
    try {
      const apiConfiguration = toApiConfiguration(configuration);

      const updatedConfig = await ApiService.updateAgentConfig(
        agent.id,
        apiConfiguration
      );

      const updatedTableConfig = toConfigurationTable({
        ...agent,
        configuration: updatedConfig,
      });

      lastSavedConfigRef.current = updatedTableConfig;
      setConfiguration(updatedTableConfig);
      onConfigSaved(agent.id, updatedTableConfig);
      setIsDirty(false);
      setIsEdit(false);
      setIsMenuOpen(false);
      onMessageChange('Configuration saved successfully');

      setTimeout(() => {
        onMessageChange('');
      }, 2000);
    } catch (error) {
      console.error('Error saving configuration:', error);
      onMessageChange('Failed to save configuration');

      setTimeout(() => {
        onMessageChange('');
      }, 2000);
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
          {configuration.map((field: TableField) => {
            const type = fieldTypes[field.key] ?? 'text';
            const value = field.value;

            return (
              <tr key={field.key}>
                <td>{field.label}</td>
                <td>
                  {isEdit ? (
                    <input
                      className="input-fields"
                      type={type}
                      checked={type === 'checkbox' ? Boolean(value) : undefined}
                      value={
                        type !== 'checkbox' ? String(value ?? '') : undefined
                      }
                      onChange={(e) => {
                        const newValue =
                          type === 'checkbox'
                            ? e.target.checked
                            : type === 'number'
                              ? Number(e.target.value)
                              : e.target.value;

                        updateConfig(field.key, newValue);
                      }}
                    />
                  ) : (
                    <span>
                      {type === 'checkbox'
                        ? String(value)
                        : String(value ?? '')}
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
