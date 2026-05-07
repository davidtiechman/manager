import type { AgentStatus } from '../../types';
import {useEffect, useState } from 'react';
import { formatOptionalDate } from './dateFormat';

const MANAGER_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000';

export default function ConfigurationTable({ agent }: { agent: AgentStatus }) {
  const [configuration, setConfiguration] = useState(agent);
  const [isEdit, setIsEdit] = useState(false);
  const [message, setMessage] = useState('');
  // const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    setConfiguration(agent);
  }, [agent]);

  const updateConfig = (
  field: keyof AgentStatus, 
  value: any
  ) => {
  setConfiguration((prev) => ({
    ...prev,
    [field]: value,
  }));
  setIsEdit(true);
  };

  const handleSave = async () => {
  try {
    const response = await fetch(`${MANAGER_URL}/${agent.id}/config`, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          created_min: configuration.created_min,
          scheduler_type: configuration.scheduler_type,
          interval_ms: configuration.interval_ms,
          max_retries: configuration.max_retries,
          sync_tries_on: configuration.sync_tries_on,
          base_url: configuration.base_url,
          batch_size: configuration.batch_size,
          is_manual_mode: configuration.is_manual_mode,
        }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to save configuration');
    }

    const updatedConfig = await response.json();

    setConfiguration(updatedConfig);
    setIsEdit(false);
      setMessage('Configuration saved successfully');
  }
  catch (error) {
      console.error('Error saving configuration:', error);
      setMessage('Failed to save configuration');
  }
  };
  return (
    <section className="details-section">
      <h3>Configuration</h3>
      <table className="details-table">
      <tbody>
      <tr><td>created min</td><td><input
      value={configuration.created_min || ''}
        onChange={(e) => {return updateConfig('created_min', e.target.value)}}
      /></td></tr>
        </tbody>
       </table>
       <button onClick={handleSave} disabled={!isEdit}>Save</button>
       <p>{message}</p>
    </section>
  );
}