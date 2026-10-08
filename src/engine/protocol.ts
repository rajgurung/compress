import type { Kind, Level } from "./types";

export type ErrorCode = "locked" | "memory" | "unreadable" | "unsupported";

export type ToWorker = { type: "compress"; id: number; bytes: Uint8Array; level: Level };

export type FromWorker =
  | { type: "progress"; id: number; page: number; pages: number }
  | { type: "done"; id: number; kind: Kind; bytes: Uint8Array; kept: boolean }
  | { type: "error"; id: number; code: ErrorCode; message: string };
