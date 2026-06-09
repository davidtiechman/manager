import { useTranslation } from 'react-i18next';
import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import { toPlatformTable } from '../../types/realTimeAgents/adapter';

interface Props {
  agent: AgentResponse;
}

export default function PlatformTable({ agent }: Props) {
  const { t } = useTranslation('realtime');
  const platform = toPlatformTable(agent);

  return (
    <section className="details-section">
      <h3>{t('tables.platform.title')}</h3>

      <table className="details-table">
        <tbody>
          <tr><td>{t('tables.platform.unit_code')}</td><td>{platform.unit_code}</td></tr>
          <tr><td>{t('tables.platform.unit')}</td><td>{platform.unit}</td></tr>
          <tr><td>{t('tables.platform.zayad_id')}</td><td>{platform.zayad_id}</td></tr>
          <tr><td>{t('tables.platform.call_sign')}</td><td>{platform.call_sign}</td></tr>
          <tr><td>{t('tables.platform.platform_id')}</td><td>{platform.platformId}</td></tr>
          <tr><td>{t('tables.platform.platform_name')}</td><td>{platform.platformName}</td></tr>
        </tbody>
      </table>
    </section>
  );
}