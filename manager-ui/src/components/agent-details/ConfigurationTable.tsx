import type { AgentStatus, ConfigurationTableData } from '../../types';
import {useEffect, useState } from 'react';
import { ApiService } from '../../api';

interface Props {
  agentID: AgentStatus;
}

export default function ConfigurationTable({ agentID }: Props) {
  const [configuration, setConfiguration] = useState<ConfigurationTableData>(agentID);
  const [isEdit, setIsEdit] = useState(false);
  const [message, setMessage] = useState('');
  const agentId = agentID.agent_id || agentID.id;
  
  useEffect(() => {
    let isActive = true;

    const loadConfig = async () => {
      try {
        const config = await ApiService.getAgentConfig(agentId);
        if (isActive) {
          setConfiguration(config);
          setIsEdit(false);
          setMessage('');
        }
      } catch (error) {
        console.error('Error loading configuration:', error);
        if (isActive) {
          setConfiguration(agentID);
          setMessage('Failed to load configuration');
        }
      }
    };

    loadConfig();

    return () => {
      isActive = false;
    };
  }, [agentId]);

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
    const updatedConfig = await ApiService.updateAgentConfig(agentId, {
      ...configuration,
      selected_link: configuration.selected_link,
    });

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
      <tr><td>selected link</td><td><input
      value={configuration.selected_link ?? ''}
        onChange={(e) => {return updateConfig('selected_link', Number(e.target.value))}}
      /></td></tr>
      <tr><td>scheduler link</td><td><input
      value={configuration.scheduler_link ?? ''}
        onChange={(e) => {return updateConfig('scheduler_link', Number(e.target.value))}}
      /></td></tr>
      <tr><td>scheduler type</td><td><input
      value={configuration.scheduler_type ?? ''}
        onChange={(e) => {return updateConfig('scheduler_type', e.target.value)}}
      /></td></tr>
      <tr><td>scheduler mode</td><td><input
      value={configuration.scheduler_mode ?? ''}
        onChange={(e) => {return updateConfig('scheduler_mode', e.target.value)}}
      /></td></tr>
      <tr><td>interval ms</td><td><input
      value={configuration.interval_ms ?? ''}
        onChange={(e) => {return updateConfig('interval_ms', Number(e.target.value))}}
      /></td></tr>
      <tr><td>max retries</td><td><input
      value={configuration.max_retries ?? ''}
        onChange={(e) => {return updateConfig('max_retries', Number(e.target.value))}}
      /></td></tr>
      <tr><td>spark proxy url</td><td><input
      value={configuration.spark_proxy_url ?? ''}
        onChange={(e) => {return updateConfig('spark_proxy_url', e.target.value)}}
      /></td></tr>
      <tr><td>base url</td><td><input
      value={configuration.base_url ?? ''}
        onChange={(e) => {return updateConfig('base_url', e.target.value)}}
      /></td></tr>
      <tr><td>token</td><td><input
      value={configuration.token ?? ''}
        onChange={(e) => {return updateConfig('token', e.target.value)}}
      /></td></tr>
      <tr><td>batch size</td><td><input
      value={configuration.batch_size ?? ''}
        onChange={(e) => {return updateConfig('batch_size', Number(e.target.value))}}
      /></td></tr>
      <tr><td>is manual mode</td><td><input
      type="checkbox"
      checked={configuration.is_manual_mode ?? false}
        onChange={(e) => {return updateConfig('is_manual_mode', e.target.checked)}}
      /></td></tr>
      <tr><td>sync tries on</td><td><input
      type="checkbox"
      checked={configuration.sync_tries_on ?? false}
        onChange={(e) => {return updateConfig('sync_tries_on', e.target.checked)}}
      /></td></tr>
        </tbody>
       </table>
       <button onClick={handleSave} disabled={!isEdit}>Save</button>
       <p>{message}</p>
    </section>
  );
}
