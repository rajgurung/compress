import type { ErrorCode, FromWorker, ToWorker } from "./engine/protocol";
import type { Kind, Level } from "./engine/types";
import { clearRunning, markRunning } from "./limits";

export interface Job {
  id: number;
  name: string;
  size: number;
  status: "queued" | "working" | "done" | "error";
  page?: number;
  pages?: number;
  kind?: Kind;
  result?: Blob;
  kept?: boolean;
  error?: ErrorCode;
  /** Kept for JPGs only, for the before/after view. */
  original?: Blob;
}

/**
 * Runs files through one worker, one at a time, to keep memory low. A worker that
 * dies mid-file (usually out of memory) is replaced and the file marked failed.
 */
export class JobRunner {
  readonly jobs: Job[] = [];
  private files = new Map<number, File>();
  private worker: Worker | null = null;
  private nextId = 1;
  private running: Job | null = null;

  constructor(
    private level: () => Level,
    private onChange: () => void,
  ) {}

  add(files: File[]): void {
    for (const file of files) {
      const job: Job = { id: this.nextId++, name: file.name, size: file.size, status: "queued" };
      this.jobs.push(job);
      this.files.set(job.id, file);
    }
    this.onChange();
    void this.pump();
  }

  /** Queues a failed file again. */
  retry(id: number): void {
    const job = this.jobs.find((j) => j.id === id);
    if (!job || job.status !== "error" || !this.files.has(id)) return;
    Object.assign(job, { status: "queued", error: undefined, page: undefined, pages: undefined });
    this.onChange();
    void this.pump();
  }

  /** Stops everything and forgets all files. */
  reset(): void {
    this.stopWorker();
    this.jobs.length = 0;
    this.files.clear();
    this.running = null;
    clearRunning();
    this.onChange();
  }

  private async pump(): Promise<void> {
    if (this.running) return;
    const job = this.jobs.find((j) => j.status === "queued");
    if (!job) return;
    const file = this.files.get(job.id)!;
    this.running = job;
    job.status = "working";
    this.onChange();

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch {
      return this.finish(job, { status: "error", error: "unreadable" });
    }
    if (this.running !== job) return; // reset while reading
    if (looksLikeJpg(file)) job.original = file;
    markRunning(job.name, job.size);

    const worker = this.ensureWorker();
    const message: ToWorker = { type: "compress", id: job.id, bytes, level: this.level() };
    worker.postMessage(message, [bytes.buffer]);
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("./engine/worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }: MessageEvent<FromWorker>) => this.handle(data);
    worker.onerror = (event) => {
      event.preventDefault();
      this.crashed();
    };
    this.worker = worker;
    return worker;
  }

  private handle(message: FromWorker): void {
    const job = this.running;
    if (!job || job.id !== message.id) return;
    if (message.type === "progress") {
      job.page = message.page;
      job.pages = message.pages;
      this.onChange();
    } else if (message.type === "done") {
      const type = message.kind === "pdf" ? "application/pdf" : "image/jpeg";
      this.finish(job, { status: "done", kind: message.kind, kept: message.kept, result: new Blob([message.bytes as BlobPart], { type }) });
    } else {
      this.finish(job, { status: "error", error: message.code });
    }
  }

  private crashed(): void {
    this.stopWorker();
    if (this.running) this.finish(this.running, { status: "error", error: "memory" });
  }

  private finish(job: Job, update: Partial<Job>): void {
    Object.assign(job, update);
    if (job.status === "error") delete job.original;
    // A failed file is kept so it can be retried.
    if (job.status === "done") this.files.delete(job.id);
    this.running = null;
    clearRunning();
    this.onChange();
    void this.pump();
  }

  private stopWorker(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}

function looksLikeJpg(file: File): boolean {
  return file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name);
}

/** "scan.pdf" -> "scan-compressed.pdf" */
export function downloadName(job: Job): string {
  if (job.kept) return job.name;
  const dot = job.name.lastIndexOf(".");
  return dot > 0 ? `${job.name.slice(0, dot)}-compressed${job.name.slice(dot)}` : `${job.name}-compressed`;
}
