// Slide-in drawer showing all fields of one sync, grouped by category.

import type { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';
import './SyncDetailPanel.css';

// ── Shared formatting helpers ───────────────────────────────────────

// Format an epoch (s or ms) or ISO string as a he-IL date-time.
function formatDate(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  const raw =
    typeof value === 'number' && value < 1_000_000_000_000 ? value * 1000 : value;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
}

// Format any scalar for display (booleans → Yes/No, blanks → —).
function formatValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

// ── Detail side panel ───────────────────────────────────────────────

interface SyncDetailPanelProps {
  record: AgentHistoryRecord | null;
  onClose: () => void;
}

interface FieldRow {
  label: string;
  value: string;
  className?: string;
}

// Render the detail drawer for the selected sync record.
export function SyncDetailPanel({ record, onClose }: SyncDetailPanelProps) {
  const open = record != null;

  const general: FieldRow[] = record
    ? [
        { label: 'ID', value: formatValue(record.id) },
        { label: 'Agent ID', value: formatValue(record.agentId) },
        {
          label: 'Status',
          value: formatValue(record.status),
          className: `snc-dp-chip snc-status snc-status--${String(record.status).toLowerCase()}`,
        },
        { label: 'Created At', value: formatDate(record.createdAt) },
      ]
    : [];

  const details: FieldRow[] = record
    ? [
        { label: 'Selected Link', value: formatValue(record.details?.selectedLink) },
        { label: 'Scheduler Mode', value: formatValue(record.details?.schedulerMode) },
        { label: 'Messages In Queue', value: formatValue(record.details?.messagesInQueue) },
        { label: 'Next Delivery', value: formatDate(record.details?.nextDeliveryTime) },
        { label: 'Geo Data', value: formatValue(record.details?.geoData) },
        { label: 'Server LUT', value: formatDate(record.details?.serverLut) },
      ]
    : [];

  const ac = record?.details?.agentConfig;
  const agentConfig: FieldRow[] = ac
    ? [
        { label: 'Scheduler Mode', value: formatValue(ac.schedulerMode) },
        { label: 'Selected Link', value: formatValue(ac.selectedLink) },
        { label: 'Interval (ms)', value: formatValue(ac.intervalMs) },
        { label: 'Max Retries', value: formatValue(ac.maxRetries) },
        { label: 'Batch Size', value: formatValue(ac.batchSize) },
        { label: 'Manual Mode', value: formatValue(ac.isManualMode) },
        { label: 'Spark Proxy URL', value: formatValue(ac.sparkProxyUrl) },
        { label: 'Token', value: formatValue(ac.token) },
        { label: 'Created At', value: formatDate(ac.createdAt) },
      ]
    : [];

  const pd = record?.details?.platfromData;
  const platformData: FieldRow[] = pd
    ? [
        { label: 'Unit', value: formatValue(pd.unit) },
        { label: 'Unit Code', value: formatValue(pd.unitCode) },
        { label: 'Zayad ID', value: formatValue(pd.zayadId) },
        { label: 'Platform', value: formatValue(pd.platform) },
        { label: 'Platform ID', value: formatValue(pd.platformId) },
        { label: 'Created At', value: formatDate(pd.createdAt) },
      ]
    : [];

  const linkQuality: FieldRow[] = record
    ? [
        { label: 'Link Type', value: formatValue(record.link_quality?.type) },
        { label: 'Available', value: formatValue(record.link_quality?.available) },
        { label: 'Quality', value: formatValue(record.link_quality?.quality) },
        { label: 'Latency (ms)', value: formatValue(record.link_quality?.latency) },
        { label: 'Reliability', value: formatValue(record.link_quality?.reliability) },
        { label: 'Timestamp', value: formatDate(record.link_quality?.timestamp) },
      ]
    : [];

  const sections: Array<{ title: string; slug: string; rows: FieldRow[] }> = [
    { title: 'General', slug: 'general', rows: general },
    { title: 'Sync Details', slug: 'sync-details', rows: details },
    { title: 'Agent Config', slug: 'agent-config', rows: agentConfig },
    { title: 'Platform Data', slug: 'platform-data', rows: platformData },
    { title: 'Link Quality', slug: 'link-quality', rows: linkQuality },
  ].filter((s) => s.rows.length > 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`snc-dp-backdrop${open ? ' snc-dp-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />

      {/* Drawer */}
      <aside
        className={`snc-dp${open ? ' snc-dp--open' : ''}`}
        role="dialog"
        aria-label="Sync details"
        aria-hidden={!open}
      >
        <header className="snc-dp-header">
          <div>
            <span className="snc-dp-eyebrow">Sync</span>
            <h3 className="snc-dp-title">#{record?.id ?? ''}</h3>
          </div>
          <button
            type="button"
            className="snc-dp-close"
            onClick={onClose}
            aria-label="Close details"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor"
                strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="snc-dp-body">
          {sections.map((section) => (
            <section key={section.slug} className="snc-dp-section">
              <div className={`snc-dp-section-title snc-tp-group--${section.slug}`}>
                {section.title}
              </div>
              <dl className="snc-dp-list">
                {section.rows.map((row) => (
                  <div key={row.label} className="snc-dp-row">
                    <dt className="snc-dp-label">{row.label}</dt>
                    <dd className="snc-dp-value">
                      {row.className ? (
                        <span className={row.className}>{row.value}</span>
                      ) : (
                        row.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </aside>
    </>
  );
}

