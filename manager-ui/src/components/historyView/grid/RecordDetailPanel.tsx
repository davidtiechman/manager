// Generic detail drawer (sections of label/value rows).

import '../SyncDetailPanel.css';

export interface DetailField {
  label: string;
  value: string;
  className?: string;
}

export interface DetailSection {
  title: string;
  slug: string;
  rows: DetailField[];
}

interface RecordDetailPanelProps {
  open: boolean;
  eyebrow: string;
  title: string;
  ariaLabel: string;
  sections: DetailSection[];
  onClose: () => void;
}

export function RecordDetailPanel({
  open, eyebrow, title, ariaLabel, sections, onClose,
}: RecordDetailPanelProps) {
  const visibleSections = sections.filter((s) => s.rows.length > 0);

  return (
    <>
      <div
        className={`snc-dp-backdrop${open ? ' snc-dp-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`snc-dp${open ? ' snc-dp--open' : ''}`}
        role="dialog"
        aria-label={ariaLabel}
        aria-hidden={!open}
      >
        <header className="snc-dp-header">
          <div>
            <span className="snc-dp-eyebrow">{eyebrow}</span>
            <h3 className="snc-dp-title">{title}</h3>
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
          {visibleSections.map((section) => (
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
