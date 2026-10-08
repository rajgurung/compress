import "./styles.css";
import { zipSync } from "fflate";
import type { Level } from "./engine/types";
import { downloadName, JobRunner, type Job } from "./jobs";
import { currentDevice, limitFor, takeInterrupted } from "./limits";
import { registerServiceWorker } from "./register-sw";
import { emptyView, failedView, listView, resultView, warningView, workingView, type ResultUrls } from "./views";

const app = document.querySelector<HTMLElement>("#app")!;
const picker = document.querySelector<HTMLInputElement>("#file-input")!;
const limit = limitFor(currentDevice());

const state: {
  level: Level;
  pending: File[] | null;
  openId: number | null;
  interrupted: { name: string; size: number } | null;
} = {
  level: "balanced",
  pending: null,
  openId: null,
  interrupted: takeInterrupted(),
};

const runner = new JobRunner(() => state.level, render);
const urls = new Map<number, ResultUrls>();

function urlsFor(job: Job): ResultUrls {
  let entry = urls.get(job.id);
  if (!entry) {
    entry = {
      original: job.original ? URL.createObjectURL(job.original) : undefined,
      result: job.result ? URL.createObjectURL(job.result) : undefined,
    };
    urls.set(job.id, entry);
  }
  return entry;
}

function forgetUrls(): void {
  for (const entry of urls.values()) {
    if (entry.original) URL.revokeObjectURL(entry.original);
    if (entry.result) URL.revokeObjectURL(entry.result);
  }
  urls.clear();
}

/** Which screen to show, plus enough detail to know when it must be redrawn. */
function screen(): { key: string; html: string; className: string } {
  const jobs = runner.jobs;
  if (state.pending) {
    const biggest = state.pending.reduce((a, b) => (b.size > a.size ? b : a));
    return { key: "warning", html: warningView(biggest, state.pending.length - 1, limit), className: "" };
  }
  if (state.interrupted && jobs.length === 0) {
    return { key: "interrupted", html: failedView("reloaded", state.interrupted, limit), className: "" };
  }
  if (jobs.length === 0) return { key: `empty:${state.level}`, html: emptyView(state.level, limit), className: "screen-empty" };

  const open = state.openId !== null ? jobs.find((j) => j.id === state.openId) : undefined;
  const single = jobs.length === 1 ? jobs[0] : undefined;
  const focus = open ?? single;
  if (focus) {
    const inList = !!open;
    const key = `job:${focus.id}:${focus.status}:${inList}`;
    if (focus.status === "done") return { key, html: resultView(focus, urlsFor(focus), inList), className: "" };
    if (focus.status === "error") {
      return { key, html: failedView(focus.error ?? "unreadable", focus, limit, { inList, jobId: focus.id }), className: "" };
    }
    if (!inList) return { key, html: workingView(focus, state.level), className: "" };
  }
  return { key: `list:${jobs.map((j) => j.status).join(",")}`, html: listView(jobs), className: "" };
}

let shownKey = "";

function render(): void {
  const next = screen();
  if (next.key === shownKey) {
    patchProgress();
    return;
  }
  const keepFocus = shownKey.startsWith("empty") && next.key.startsWith("empty");
  shownKey = next.key;
  app.className = `screen ${next.className}`.trim();
  app.innerHTML = next.html;
  applyWidths(app);
  fitCompare(app);
  if (keepFocus) app.querySelector<HTMLElement>(`[data-level="${state.level}"]`)?.focus();
  else app.querySelector<HTMLElement>("[data-focus]")?.focus({ preventScroll: true });
}

/** Updates progress in place, so focus and screen readers are not disturbed. */
function patchProgress(): void {
  for (const job of runner.jobs) {
    if (job.status !== "working" || !job.pages) continue;
    const pct = Math.round(((job.page ?? 0) / job.pages) * 100);
    const block = app.querySelector(`[data-progress-for="${job.id}"]`);
    if (block) {
      const bar = block.querySelector<HTMLElement>(".progress")!;
      bar.classList.remove("is-indeterminate");
      bar.setAttribute("aria-valuenow", String(pct));
      bar.querySelector<HTMLElement>("span")!.style.width = `${pct}%`;
      const [left, right] = block.querySelectorAll(".progress-meta span");
      left.textContent = `Page ${job.page} of ${job.pages}`;
      right.textContent = `${pct}%`;
    }
    const meta = app.querySelector(`[data-meta-for="${job.id}"]`);
    if (meta) meta.textContent = `Page ${job.page} of ${job.pages}`;
  }
}

/** The security policy forbids inline style attributes, so widths are set here. */
function applyWidths(root: HTMLElement): void {
  for (const el of root.querySelectorAll<HTMLElement>("[data-width]")) el.style.width = `${el.dataset.width}%`;
}

/** Shapes the before/after box to the photo, once its size is known. */
function fitCompare(root: HTMLElement): void {
  const box = root.querySelector<HTMLElement>("[data-compare]");
  const img = box?.querySelector("img");
  if (!box || !img) return;
  const fit = () => img.naturalWidth && box.style.setProperty("--ratio", `${img.naturalWidth} / ${img.naturalHeight}`);
  if (img.complete) fit();
  else img.addEventListener("load", fit, { once: true });
}

function addFiles(files: File[]): void {
  if (files.length === 0) return;
  state.interrupted = null;
  if (files.some((f) => f.size > limit.warnAbove)) {
    state.pending = files;
    render();
  } else {
    runner.add(files);
  }
}

function startOver(): void {
  state.pending = null;
  state.openId = null;
  state.interrupted = null;
  forgetUrls();
  runner.reset();
}

function save(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function saveAll(): Promise<void> {
  const files: Record<string, Uint8Array> = {};
  for (const job of runner.jobs) {
    if (job.status !== "done") continue;
    let name = downloadName(job);
    for (let n = 2; files[name]; n++) name = downloadName(job).replace(/(\.[^.]+)?$/, ` (${n})$1`);
    files[name] = new Uint8Array(await job.result!.arrayBuffer());
  }
  // The files are already compressed, so the zip only stores them.
  save(new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: "application/zip" }), "compressed-files.zip");
}

app.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action], [data-level]");
  if (!target) return;
  if (target.dataset.level) {
    state.level = target.dataset.level as Level;
    render();
    return;
  }
  const id = Number(target.dataset.id);
  const job = runner.jobs.find((j) => j.id === id);
  switch (target.dataset.action) {
    case "pick":
      picker.click();
      break;
    case "pick-fresh":
      startOver();
      picker.click();
      break;
    case "continue": {
      const files = state.pending ?? [];
      state.pending = null;
      runner.add(files);
      break;
    }
    case "reset":
      startOver();
      break;
    case "open":
      state.openId = id;
      render();
      break;
    case "list":
      state.openId = null;
      render();
      break;
    case "retry":
      state.openId = null;
      runner.retry(id);
      break;
    case "download":
      if (job?.result) save(job.result, downloadName(job));
      break;
    case "download-all":
      void saveAll();
      break;
  }
});

app.addEventListener("input", (event) => {
  const slider = event.target as HTMLInputElement;
  if (slider.matches("[data-split]")) slider.closest<HTMLElement>("[data-compare]")!.style.setProperty("--split", `${slider.value}%`);
});

picker.addEventListener("change", () => {
  addFiles([...(picker.files ?? [])]);
  picker.value = "";
});

// Files can be dropped anywhere on the page.
let dragDepth = 0;
const dropZone = () => app.querySelector("[data-drop]");
const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files") ?? false;
document.addEventListener("dragenter", (event) => {
  if (!hasFiles(event)) return;
  dragDepth++;
  dropZone()?.classList.add("is-over");
});
document.addEventListener("dragleave", () => {
  if (--dragDepth <= 0) {
    dragDepth = 0;
    dropZone()?.classList.remove("is-over");
  }
});
document.addEventListener("dragover", (event) => {
  if (hasFiles(event)) event.preventDefault();
});
document.addEventListener("drop", (event) => {
  if (!hasFiles(event)) return;
  event.preventDefault();
  dragDepth = 0;
  dropZone()?.classList.remove("is-over");
  addFiles([...(event.dataTransfer?.files ?? [])]);
});

render();
registerServiceWorker();
