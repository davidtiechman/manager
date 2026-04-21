import { useEffect, useState } from 'react';
import { ApiService } from '../api';
import type { AgentConfig, AgentStatus } from '../types';

interface Props {
    agent: AgentStatus;
    onClose: () => void;
}

const emptyConfig: AgentConfig = {
    schedulerMode: 'auto',
    selectedLink: 'satcom',
    intervalMs: 15000,
    maxRetries: 3,
    sparkProxyUrl: '',
    token: '',
    batchSize: 10,
    isManualMode: false,
};

function formatDate(value: Date | string) {
    return new Date(value).toLocaleString('he-IL');
}

function boolLabel(value: boolean) {
    return value ? 'TRUE' : 'FALSE';
}

export default function Details({ agent, onClose }: Props) {
    const [config, setConfig] = useState<AgentConfig>(emptyConfig);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [savingConfig, setSavingConfig] = useState(false);
    const [configMessage, setConfigMessage] = useState('');

    useEffect(() => {
        let active = true;

        async function loadConfig() {
            setLoadingConfig(true);
            setConfigMessage('');

            try {
                const data = await ApiService.getAgentConfig(agent.id);
                if (active) {
                    setConfig(data);
                }
            } catch (error) {
                if (active) {
                    setConfigMessage('Failed to load configuration');
                }
            } finally {
                if (active) {
                    setLoadingConfig(false);
                }
            }
        }

        loadConfig();
        return () => {
            active = false;
        };
    }, [agent.id]);

    function updateConfig<K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) {
        setConfig((current) => ({
            ...current,
            [key]: value,
        }));
    }

    async function saveConfig() {
        setSavingConfig(true);
        setConfigMessage('');

        try {
            const saved = await ApiService.updateAgentConfig(agent.id, config);
            setConfig(saved);
            setConfigMessage('Configuration saved');
        } catch (error) {
            setConfigMessage('Failed to save configuration');
        } finally {
            setSavingConfig(false);
        }
    }

    return (
        <div className="details-panel">
            <div className="details-header">
                <h2>Agent Details</h2>
                <button onClick={onClose}>Close</button>
            </div>

            <table className="details-table">
                <tbody>
                    <tr><td>ID</td><td>{agent.id}</td></tr>
                    <tr><td>lastSeen</td><td>{formatDate(agent.lastSeen)}</td></tr>
                    <tr><td>status</td><td>{agent.status}</td></tr>
                    <tr><td>schedulerMode</td><td>{agent.schedulerMode}</td></tr>
                    <tr><td>messagesInQueue</td><td>{agent.messagesInQueue}</td></tr>
                    <tr><td>selectedLink</td><td>{agent.selectedLink}</td></tr>
                    <tr><td>nextDeliveryTime</td><td>{formatDate(agent.nextDeliveryTime)}</td></tr>
                    <tr><td>serverLut</td><td>{formatDate(agent.serverLut)}</td></tr>
                    <tr><td>linkType</td><td>{agent.linkType}</td></tr>
                    <tr><td>linkAvailable</td><td>{boolLabel(agent.linkAvailable)}</td></tr>
                    <tr><td>linkQuality</td><td>{agent.linkQuality}</td></tr>
                    <tr><td>latency</td><td>{agent.latency}</td></tr>
                    <tr><td>reliability</td><td>{agent.reliability}</td></tr>
                    <tr><td>linkTimestamp</td><td>{formatDate(agent.linkTimestamp)}</td></tr>
                    <tr><td>unit</td><td>{agent.unit}</td></tr>
                    <tr><td>unit_code</td><td>{agent.unit_code}</td></tr>
                    <tr><td>zayad_id</td><td>{agent.zayad_id}</td></tr>
                    <tr><td>platformId</td><td>{agent.platformId}</td></tr>
                    <tr><td>platformName</td><td>{agent.platformName}</td></tr>
                </tbody>
            </table>

            <div className="config-panel">
                <h3>Configuration</h3>

                {loadingConfig ? (
                    <p className="muted">Loading configuration...</p>
                ) : (
                    <div className="config-form">
                        <label>
                            Scheduler Mode
                            <select
                                value={config.schedulerMode}
                                onChange={(event) => updateConfig('schedulerMode', event.target.value)}
                            >
                                <option value="auto">auto</option>
                                <option value="manual">manual</option>
                            </select>
                        </label>

                        <label>
                            Selected Link
                            <select
                                value={config.selectedLink}
                                onChange={(event) => updateConfig('selectedLink', event.target.value)}
                            >
                                <option value="satcom">satcom</option>
                                <option value="lte">lte</option>
                                <option value="rf">rf</option>
                            </select>
                        </label>

                        <label>
                            Interval MS
                            <input
                                type="number"
                                min="1000"
                                value={config.intervalMs}
                                onChange={(event) => updateConfig('intervalMs', Number(event.target.value))}
                            />
                        </label>

                        <label>
                            Max Retries
                            <input
                                type="number"
                                min="0"
                                value={config.maxRetries}
                                onChange={(event) => updateConfig('maxRetries', Number(event.target.value))}
                            />
                        </label>

                        <label>
                            Batch Size
                            <input
                                type="number"
                                min="1"
                                value={config.batchSize}
                                onChange={(event) => updateConfig('batchSize', Number(event.target.value))}
                            />
                        </label>

                        <label>
                            Spark Proxy URL
                            <input
                                value={config.sparkProxyUrl}
                                onChange={(event) => updateConfig('sparkProxyUrl', event.target.value)}
                            />
                        </label>

                        <label>
                            Token
                            <input
                                value={config.token}
                                onChange={(event) => updateConfig('token', event.target.value)}
                            />
                        </label>

                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={config.isManualMode}
                                onChange={(event) => updateConfig('isManualMode', event.target.checked)}
                            />
                            Manual Mode
                        </label>

                        <button onClick={saveConfig} disabled={savingConfig}>
                            {savingConfig ? 'Saving...' : 'Save Configuration'}
                        </button>

                        {configMessage && <p className="config-message">{configMessage}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
