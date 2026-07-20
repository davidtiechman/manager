// Generic detail drawer (sections of label/value rows).

import { useEffect, useState, type ReactNode } from 'react';
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
  content?: ReactNode; // custom block rendered after the rows
}

interface RecordDetailPanelProps {
  open: boolean;
  eyebrow: string;
  title: string;
  ariaLabel: string;
  closeLabel: string;
  sections: DetailSection[];
  onClose: () => void;
  expandable?: boolean;
  expandLabel?: string;
  collapseLabel?: string;
}

export function RecordDetailPanel({
  open, eyebrow, title, ariaLabel, closeLabel, sections, onClose,
  expandable = false, expandLabel, collapseLabel,
}: RecordDetailPanelProps) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    if (!open) setWide(false);
  }, [open]);

  const visibleSections = sections.filter((s) => s.rows.length > 0 || s.content != null);

  return (
    <>
      <div
        className={`snc-dp-backdrop${open ? ' snc-dp-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`snc-dp${open ? ' snc-dp--open' : ''}${wide ? ' snc-dp--wide' : ''}`}
        role="dialog"
        aria-label={ariaLabel}
        aria-hidden={!open}
      >
        <header className="snc-dp-header">
          <div>
            <span className="snc-dp-eyebrow">{eyebrow}</span>
            <h3 className="snc-dp-title">{title}</h3>
          </div>
          <div className="snc-dp-actions">
            {expandable && (
              <button
                type="button"
                className="snc-dp-close snc-dp-expand"
                onClick={() => setWide((w) => !w)}
                aria-pressed={wide}
                aria-label={wide ? collapseLabel : expandLabel}
                title={wide ? collapseLabel : expandLabel}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  {wide ? (
                    <path d="M6.5 2v4a.5.5 0 0 1-.5.5H2M9.5 14v-4a.5.5 0 0 1 .5-.5h4M6 6 2 2m8 8 4 4"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M9.5 2H13a1 1 0 0 1 1 1v3.5M6.5 14H3a1 1 0 0 1-1-1V9.5M14 2 9.5 6.5M2 14l4.5-4.5"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
              </button>
            )}
            <button
              type="button"
              className="snc-dp-close"
              onClick={onClose}
              aria-label={closeLabel}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor"
                  strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        <div className="snc-dp-body">
          {visibleSections.map((section) => (
            <section key={section.slug} className="snc-dp-section">
              <div className={`snc-dp-section-title snc-tp-group--${section.slug}`}>
                {section.title}
              </div>
              {section.rows.length > 0 && (
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
              )}
              {section.content}
            </section>
          ))}
        </div>
      </aside>
    </>
  );
}
