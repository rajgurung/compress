import type { Level } from "./types";

/** The parts of the Emscripten Ghostscript module we use. */
export interface GsModule {
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
  };
  callMain(args: string[]): number | undefined;
}

/** Output arrives one character code at a time (null flushes), as this Emscripten build delivers it. */
export type GsFactory = (options: { stdout: (code: number | null) => void; stderr: (code: number | null) => void }) => Promise<GsModule>;

export type PdfErrorCode = "locked" | "memory" | "unreadable";

export class PdfError extends Error {
  constructor(
    readonly code: PdfErrorCode,
    message: string,
  ) {
    super(message);
  }
}

// Ghostscript's automatic filter choice sometimes saves downsampled photos losslessly
// (bigger than the original), so photos are always JPEG-encoded.
const JPEG_ONLY = [
  "-dAutoFilterColorImages=false",
  "-dColorImageFilter=/DCTEncode",
  "-dAutoFilterGrayImages=false",
  "-dGrayImageFilter=/DCTEncode",
];

// /printer keeps 300 DPI scans as they are, so Best sets its own resolution and
// forces images to be re-encoded.
const LEVEL_ARGS: Record<Level, string[]> = {
  smaller: ["-dPDFSETTINGS=/screen"],
  balanced: ["-dPDFSETTINGS=/ebook"],
  best: [
    "-dPDFSETTINGS=/printer",
    "-dPassThroughJPEGImages=false",
    "-dDownsampleColorImages=true",
    "-dColorImageResolution=200",
    "-dColorImageDownsampleThreshold=1.0",
    "-dDownsampleGrayImages=true",
    "-dGrayImageResolution=200",
    "-dGrayImageDownsampleThreshold=1.0",
  ],
};

/**
 * Rewrites a PDF with Ghostscript. Reports progress per page. A fresh module is
 * created per file: Ghostscript exits when done and cannot be reused.
 */
export async function compressPdf(
  input: Uint8Array,
  level: Level,
  createGs: GsFactory,
  onProgress: (page: number, pages: number) => void = () => {},
): Promise<Uint8Array> {
  const log: string[] = [];
  let pages = 0;
  const gs = await createGs({
    stdout: lines((line) => {
      log.push(line);
      const total = /^Processing pages \d+ through (\d+)\./.exec(line);
      if (total) pages = Number(total[1]);
      const page = /^Page (\d+)$/.exec(line);
      if (page) onProgress(Number(page[1]), pages);
    }),
    stderr: lines((line) => log.push(line)),
  });

  gs.FS.writeFile("/in.pdf", input);
  let exitCode: number | undefined;
  try {
    exitCode = gs.callMain([
      "-sDEVICE=pdfwrite",
      ...LEVEL_ARGS[level],
      ...JPEG_ONLY,
      "-dCompatibilityLevel=1.5",
      "-dNOPAUSE",
      "-dBATCH",
      "-dSAFER",
      "-sOutputFile=/out.pdf",
      "/in.pdf",
    ]);
  } catch (error) {
    if (isOutOfMemory(error)) throw new PdfError("memory", "Ran out of memory");
    throw error;
  }

  const output = log.join("\n");
  if (/password/i.test(output)) throw new PdfError("locked", "This PDF needs a password");
  if (pages === 0) throw new PdfError("unreadable", lastLines(output));
  let result: Uint8Array;
  try {
    result = gs.FS.readFile("/out.pdf");
  } catch {
    throw new PdfError("unreadable", lastLines(output));
  }
  if ((exitCode ?? 0) !== 0 || result.length === 0) throw new PdfError("unreadable", lastLines(output));
  return result;
}

/** Turns a stream of character codes into whole lines. */
function lines(onLine: (line: string) => void): (code: number | null) => void {
  let buffer: number[] = [];
  return (code) => {
    if (code === null || code === 10) {
      if (buffer.length) onLine(new TextDecoder().decode(new Uint8Array(buffer)));
      buffer = [];
    } else {
      buffer.push(code);
    }
  };
}

export function isOutOfMemory(error: unknown): boolean {
  const text = String(error instanceof Error ? error.message : error);
  return /OOM|out of memory|enlarge memory|Cannot allocate/i.test(text);
}

function lastLines(text: string): string {
  return text.split("\n").slice(-5).join("\n");
}
