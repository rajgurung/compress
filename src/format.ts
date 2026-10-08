/** "24.6 MB", "812 KB", "640 B". Decimal units, as file managers show them. */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1e6) return `${Math.round(bytes / 1e3)} KB`;
  if (bytes < 1e9) return `${trim((bytes / 1e6).toFixed(1))} MB`;
  return `${trim((bytes / 1e9).toFixed(2))} GB`;
}

/** Whole-number percentage saved, never negative. */
export function percentSmaller(before: number, after: number): number {
  if (before <= 0 || after >= before) return 0;
  return Math.round((1 - after / before) * 100);
}

/** "200.0" -> "200", "1.50" -> "1.5" */
function trim(number: string): string {
  return number.replace(/\.?0+$/, "");
}
