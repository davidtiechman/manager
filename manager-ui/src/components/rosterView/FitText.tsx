import { useLayoutEffect, useRef, type ReactNode } from 'react';

interface FitTextProps {
  children: ReactNode;
  max?: number;   // preferred font-size (px)
  min?: number;   // smallest allowed font-size (px)
}

// Shrinks the font-size so single-line text always fits its column width.
// Content-aware (measures the text), unlike container-query/cqi scaling.
export default function FitText({ children, max = 13, min = 9 }: FitTextProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    const fit = () => {
      el.style.fontSize = `${max}px`;
      const avail = parent.clientWidth;
      const needed = el.scrollWidth;
      if (avail > 0 && needed > avail) {
        el.style.fontSize = `${Math.max(min, Math.floor((max * avail) / needed))}px`;
      }
    };

    fit();
    // Re-fit only when the column WIDTH changes (ignore height-only changes,
    // which our own font-size tweak would otherwise trigger → no loop).
    let lastWidth = parent.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = parent.clientWidth;
      if (w === lastWidth) return;
      lastWidth = w;
      fit();
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, [children, max, min]);

  return <span ref={ref} className="rstr-fit">{children}</span>;
}
