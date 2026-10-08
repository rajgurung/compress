/// <reference lib="webworker" />
import { compress, UnsupportedFileError } from "./index";
import { browserGs } from "./gs-browser";
import { isOutOfMemory, PdfError } from "./pdf";
import type { FromWorker, ToWorker } from "./protocol";

declare const self: DedicatedWorkerGlobalScope;

const send = (message: FromWorker, transfer: Transferable[] = []) => self.postMessage(message, transfer);

self.onmessage = async ({ data }: MessageEvent<ToWorker>) => {
  const { id, bytes, level } = data;
  try {
    const outcome = await compress(bytes, level, browserGs, (page, pages) => send({ type: "progress", id, page, pages }));
    const result = outcome.kept ? outcome.bytes.slice() : outcome.bytes;
    send({ type: "done", id, kind: outcome.kind, bytes: result, kept: outcome.kept }, [result.buffer]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof PdfError) send({ type: "error", id, code: error.code, message });
    else if (error instanceof UnsupportedFileError) send({ type: "error", id, code: "unsupported", message });
    else if (isOutOfMemory(error)) send({ type: "error", id, code: "memory", message });
    else send({ type: "error", id, code: "unreadable", message });
  }
};
