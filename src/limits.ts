/** The device facts the size guidance depends on. */
export interface Device {
  coarsePointer: boolean;
  shortSide: number;
  /** navigator.deviceMemory in GB, only reported by Chromium browsers. */
  memoryGb?: number;
}

export interface Limit {
  device: "phone" | "computer";
  /** Files above this get a warning first. Soft: people can still go ahead. */
  warnAbove: number;
}

const MB = 1e6;

export function limitFor(device: Device): Limit {
  const phone = device.coarsePointer && device.shortSide < 900;
  const lowMemory = device.memoryGb !== undefined && device.memoryGb <= 4;
  if (phone || lowMemory) return { device: "phone", warnAbove: 200 * MB };
  return { device: "computer", warnAbove: 1000 * MB };
}

export function currentDevice(): Device {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    coarsePointer: matchMedia("(pointer: coarse)").matches,
    shortSide: Math.min(screen.width, screen.height),
    memoryGb: nav.deviceMemory,
  };
}

/** Remembers a running job in this tab, so a reload mid-job can be explained. */
const KEY = "compress:running";

export function markRunning(name: string, size: number): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ name, size }));
  } catch {
    // Storage can be unavailable (private mode); the reload message is a nicety.
  }
}

export function clearRunning(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // See markRunning.
  }
}

export function takeInterrupted(): { name: string; size: number } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
