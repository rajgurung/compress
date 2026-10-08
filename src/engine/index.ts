import { compressJpg } from "./jpg";
import { compressPdf, type GsFactory } from "./pdf";
import { detectKind, type Kind, type Level } from "./types";

export interface Outcome {
  kind: Kind;
  bytes: Uint8Array;
  /** True when compression did not help and the original is returned. */
  kept: boolean;
}

export class UnsupportedFileError extends Error {}

/** Compresses a PDF or JPG. Never returns something bigger than the input. */
export async function compress(
  input: Uint8Array,
  level: Level,
  createGs: GsFactory,
  onProgress?: (page: number, pages: number) => void,
): Promise<Outcome> {
  const kind = detectKind(input);
  if (!kind) throw new UnsupportedFileError("Only PDF and JPG files are supported");
  const bytes = kind === "pdf" ? await compressPdf(input, level, createGs, onProgress) : await compressJpg(input, level);
  return bytes.length < input.length ? { kind, bytes, kept: false } : { kind, bytes: input, kept: true };
}
