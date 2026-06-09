import { useTranslation } from 'react-i18next';
import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import { toSyncDetailsTable } from '../../types/realTimeAgents/adapter';
import { formatOptionalDate } from './dateFormat';

interface Props {
  agent: AgentResponse;
}

export default function SyncDetailsTable({ agent }: Props) {
  const { t } = useTranslation('realtime');
  const sync = toSyncDetailsTable(agent);

  return (
    <section className="details-section">
      <h3>{t('tables.syncDetails.title')}</h3>

      <table className="details-table">
        <tbody>
          <tr><td>{t('tables.syncDetails.status')}</td><td>{sync.status}</td></tr>
          <tr><td>{t('tables.syncDetails.scheduler_mode')}</td><td>{sync.schedulerMode}</td></tr>
          <tr><td>{t('tables.syncDetails.selected_link')}</td><td>{sync.selectedLink}</td></tr>
          <tr><td>{t('tables.syncDetails.messages_in_queue')}</td><td>{sync.messagesInQueue}</td></tr>
          <tr><td>{t('tables.syncDetails.next_delivery_time')}</td><td>{formatOptionalDate(sync.nextDeliveryTime)}</td></tr>
          <tr><td>{t('tables.syncDetails.server_lut')}</td><td>{formatOptionalDate(sync.serverLut)}</td></tr>
          <tr><td>{t('tables.syncDetails.last_seen')}</td><td>{formatOptionalDate(sync.lastSeen)}</td></tr>
        </tbody>
      </table>
    </section>
  );
}