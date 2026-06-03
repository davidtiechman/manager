import { useRef, useState, useEffect } from 'react';

interface Option { value: string; label: string; }

interface RosterSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  ariaLabel: string;
  triggerClassName?: string;
  align?: 'left' | 'right';
}

// Custom single-select dropdown — a styled replacement for a native <select>.
export default function RosterSelect({
  value, options, onChange, ariaLabel, triggerClassName = 'rstr-ctl', align = 'left',
}: RosterSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);
  const select = (v: string) => { onChange(v); setOpen(false); };

  return (
    <div className="rstr-select" ref={ref}>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="rstr-select-value">{current?.label ?? value}</span>
        <svg className="rstr-select-caret" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className={`rstr-select-panel${align === 'right' ? ' rstr-select-panel--right' : ''}`} role="listbox">
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`rstr-select-option${o.value === value ? ' is-selected' : ''}`}
              onClick={() => select(o.value)}
            >
              <span>{o.label}</span>
              {o.value === value && (
                <svg className="rstr-select-check" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
