/** Tells the site one file was compressed, sending only its kind. Never throws; offline it is simply lost. */
export function countUse(kind: "pdf" | "jpg"): void {
  try {
    navigator.sendBeacon("/api/used", kind);
  } catch {
    // Counting must never get in the way of compressing.
  }
}
