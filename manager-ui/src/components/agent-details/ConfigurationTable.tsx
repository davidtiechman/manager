import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import type { ConfigurationTableData } from '../../types/realTimeAgents/tables';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiService } from '../../api';
import { toConfigurationTable } from '../../types/realTimeAgents/adapter';

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

const isSameConfiguration = (
  left: ConfigurationTableData,
  right: ConfigurationTableData
) => fields.every(([field]) => left[field] === right[field]);

export default function ConfigurationTable({
  agent,
  onEditChange,
  onConfigSaved,
  message,
  onMessageChange,
}: Props) {
  const { t } = useTranslation('realtime');
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
    if (lastSavedConfig && !isSameConfiguration(agentConfiguration, lastSavedConfig)) {
      return;
    }

    lastSavedConfigRef.current = null;
    setConfiguration(agentConfiguration);
    setIsMenuOpen(false);
  }, [agent, isEdit, isDirty]);

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
      const updatedConfig = await ApiService.updateAgentConfig(
        agent.id,
        configuration
      );

      lastSavedConfigRef.current = updatedConfig;
      setConfiguration(updatedConfig);
      onConfigSaved(agent.id, updatedConfig);
      setIsDirty(false);
      setIsEdit(false);
      setIsMenuOpen(false);
      onMessageChange(t('tables.configuration.saved'));
      setTimeout(() => {
        onMessageChange('');
      }, 2000);
    } catch (error) {
      console.error('Error saving configuration:', error);
      onMessageChange(t('tables.configuration.saveFailed'));
      setTimeout(() => {

      }, 2000);
    }
  };

  return (
    <section className="details-section">
      <div className="details-section-header">
        <h3>{t('tables.configuration.title')}</h3>
        <div className="table-menu">
          <button
            type="button"
            className="menu-button"
            aria-label={t('tables.configuration.actions')}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            &#8942;
          </button>
          {isMenuOpen && (
            <div className="menu-dropdown" role="menu">
              <button type="button" role="menuitem" onClick={openEdit}>
                {t('tables.configuration.edit')}
              </button>
            </div>
          )}
        </div>
      </div>

      <table className="details-table">
        <tbody>
          {fields.map(([field, , type]) => {
            const value = configuration[field];

            return (
              <tr key={field}>
                <td>{t(`tables.configuration.${field}`)}</td>
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
            {t('tables.configuration.save')}
          </button>
          <button type="button" onClick={cancelEdit}>
            {t('tables.configuration.cancel')}
          </button>
        </div>
      )}

      {message && <p className="config-message">{message}</p>}
    </section>
  );
}
