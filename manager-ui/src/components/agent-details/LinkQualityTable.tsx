import { useTranslation } from 'react-i18next';
import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import { toLinkQualityTable } from '../../types/realTimeAgents/adapter';
import { formatDate } from './dateFormat';

interface Props {
  agent: AgentResponse;
  // table: LinkQualityTableData;
}

export default function LinkQualityTable({ agent }: Props) {
  const { t } = useTranslation('realtime');
  const link = toLinkQualityTable(agent);
  return (
    <section className="details-section">
      <h3>{t('tables.linkQuality.title')}</h3>
      <table className="details-table">
        <tbody>
          <tr><td>{t('tables.linkQuality.link_type')}</td><td>{link.linkType}</td></tr>
          <tr><td>{t('tables.linkQuality.available')}</td><td>{String(link.linkAvailable)}</td></tr>
          <tr><td>{t('tables.linkQuality.quality')}</td><td>{link.linkQuality}</td></tr>
          <tr><td>{t('tables.linkQuality.latency')}</td><td>{link.latency}</td></tr>
          <tr><td>{t('tables.linkQuality.reliability')}</td><td>{link.reliability}</td></tr>
          <tr><td>{t('tables.linkQuality.timestamp')}</td><td>{formatDate(link.linkTimestamp)}</td></tr>
        </tbody>
      </table>
    </section>
  );
}
