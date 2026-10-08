export type Level = "smaller" | "balanced" | "best";
export type Kind = "pdf" | "jpg";

/** Identifies a file by its first bytes, not its name. */
export function detectKind(bytes: Uint8Array): Kind | null {
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf"; // %PDF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  return null;
}
