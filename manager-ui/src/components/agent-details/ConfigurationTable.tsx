import type { AgentStatus } from '../../types';
import { formatOptionalDate } from './dateFormat';

interface Props {
  agent: AgentStatus;
}

export default function ConfigurationTable({ agent }: Props) {
  return (
    <section className="details-section">
      <h3>Configuration</h3>
      <table className="details-table">
        <tbody>
          <tr><td>created min</td><td>{agent.created_min}</td></tr>
          <tr><td>scheduler type</td><td>{agent.scheduler_type}</td></tr>
          <tr><td>scheduler mode</td><td>{agent.scheduler_mode}</td></tr>
          <tr><td>interval ms</td><td>{agent.interval_ms}</td></tr>
          <tr><td>max retries</td><td>{agent.max_retries}</td></tr>
          <tr><td>sync tries on</td><td>{String(agent.sync_tries_on ?? '')}</td></tr>
          <tr><td>base url</td><td>{agent.base_url}</td></tr>
          <tr><td>batch size</td><td>{agent.batch_size}</td></tr>
          <tr><td>is manual mode</td><td>{String(agent.is_manual_mode ?? '')}</td></tr>
          <tr><td>created id</td><td>{formatOptionalDate(agent.created_at)}</td></tr>
        </tbody>
      </table>
    </section>
  );
}
