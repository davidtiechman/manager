import { useRef, useState, useEffect } from 'react';

interface RosterFacetProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}

// Compact multi-select dropdown for one facet (Unit or Platform).
export default function RosterFacet({ label, options, selected, onChange }: RosterFacetProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);

  return (
    <div className="rstr-facet" ref={ref}>
      <button
        type="button"
        className="rstr-ctl"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {label}
        {selected.length > 0 && <span className="rstr-facet-badge">{selected.length}</span>}
        <svg className="rstr-facet-caret" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="rstr-facet-panel" role="listbox">
          {options.map((opt) => (
            <label key={opt} className="rstr-facet-option">
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
