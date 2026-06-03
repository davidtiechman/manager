// Stable, muted accent color for a unit value (hue from a hash) — scales to any number of units.
export function unitDotColor(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 52%, 50%)`;
}
