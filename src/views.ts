import type { ErrorCode } from "./engine/protocol";
import type { Level } from "./engine/types";
import { formatBytes, percentSmaller } from "./format";
import { icons } from "./icons";
import type { Job } from "./jobs";
import type { Limit } from "./limits";

export const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: "smaller", label: "Smaller", hint: "Smallest file. Fine for screens and email." },
  { id: "balanced", label: "Balanced", hint: "Much smaller, still looks good. Right for most files." },
  { id: "best", label: "Best quality", hint: "Barely any visible change. Saves a bit less." },
];

const levelLabel = (level: Level) => LEVELS.find((l) => l.id === level)!.label;

export function escape(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const PRIVACY_NOTE = `<p class="small muted center-text">Nothing was uploaded. Closing this tab clears everything.</p>`;

export function emptyView(level: Level, limit: Limit): string {
  const buttons = LEVELS.map(
    (l) => `<button type="button" data-level="${l.id}" aria-pressed="${l.id === level}">${l.label}</button>`,
  ).join("");
  return `
    <div class="screen-body">
      <div class="stack intro">
        <h1 tabindex="-1" data-focus>Make PDFs and JPGs smaller.</h1>
        <p class="lead desktop-only">Right here in your browser. Nothing is uploaded.</p>
      </div>
      <div class="drop" data-drop>
        <span class="drop-icon">${icons.upload}</span>
        <span class="drop-title">Drop files here</span>
        <button type="button" class="btn btn-primary" data-action="pick">Choose files</button>
        <span class="small muted">PDF or JPG. Pick as many as you like.</span>
      </div>
      <div class="quality">
        <span class="label" id="quality-label">Quality</span>
        <div class="segmented" role="group" aria-labelledby="quality-label">${buttons}</div>
        <span class="small muted" aria-live="polite">${LEVELS.find((l) => l.id === level)!.hint}</span>
      </div>
    </div>
    <footer class="footnote">
      <strong>${icons.lock} Your files never leave this device.</strong>
      <span>Works best with files under ${formatBytes(limit.warnAbove)} on a ${limit.device}. <a href="/how-it-works.html#limits">Limits</a></span>
    </footer>`;
}

export function warningView(file: { name: string; size: number }, others: number, limit: Limit): string {
  const phone = limit.device === "phone";
  return `
    <div class="screen-body">
      ${fileCard(file.name, `${formatBytes(file.size)}${others ? ` · and ${others} more file${others > 1 ? "s" : ""}` : ""}`)}
      <div class="stack">
        <h1 class="title" tabindex="-1" data-focus>This is a big file for a ${limit.device}.</h1>
        <p class="muted">Compress runs on your device, so nothing is uploaded. The trade-off is that very large files can be slow${phone ? " on a phone" : ""}, or stop part way.</p>
        ${phone ? `<p class="muted">A computer usually handles them fine.</p>` : ""}
      </div>
    </div>
    <div class="actions">
      <button type="button" class="btn btn-primary btn-block" data-action="continue">Try anyway</button>
      <button type="button" class="btn btn-secondary btn-block" data-action="reset">Choose another file</button>
      <a class="btn-link center-text" href="/how-it-works.html#limits">About limits</a>
    </div>`;
}

export function workingView(job: Job, level: Level): string {
  return `
    <div class="screen-body center">
      <div class="stack">
        <span class="muted" data-focus tabindex="-1">Compressing</span>
        <span class="file-title truncate">${escape(job.name)}</span>
        <span class="mono small muted">${formatBytes(job.size)} · ${levelLabel(level)}</span>
      </div>
      ${progressBlock(job)}
      <p class="small muted">Running on this device. Keep this tab open until it's done.</p>
    </div>
    <div class="actions">
      <button type="button" class="btn btn-secondary btn-block" data-action="reset">Cancel</button>
    </div>`;
}

function progressBlock(job: Job): string {
  const known = job.pages !== undefined && job.pages > 0 && job.page !== undefined;
  const pct = known ? Math.round((job.page! / job.pages!) * 100) : 0;
  return `
    <div class="stack" data-progress-for="${job.id}">
      <div class="progress${known ? "" : " is-indeterminate"}" role="progressbar" aria-label="Compressing ${escape(job.name)}" aria-valuemin="0" aria-valuemax="100"${known ? ` aria-valuenow="${pct}"` : ""}>
        <span data-width="${pct}"></span>
      </div>
      <div class="progress-meta">
        <span>${known ? `Page ${job.page} of ${job.pages}` : job.kind === "jpg" || /\.jpe?g$/i.test(job.name) ? "Working on the photo" : "Getting started"}</span>
        <span>${known ? `${pct}%` : ""}</span>
      </div>
    </div>`;
}

export interface ResultUrls {
  original?: string;
  result?: string;
}

export function resultView(job: Job, urls: ResultUrls, inList: boolean): string {
  const after = job.result!.size;
  const back = inList
    ? `<button type="button" class="btn btn-secondary btn-block" data-action="list">Back to all files</button>`
    : `<button type="button" class="btn btn-secondary btn-block" data-action="reset">Compress another</button>`;

  if (job.kept) {
    return `
      <div class="screen-body center">
        <div class="stack">
          <span class="round-icon">${icons.check}</span>
          <h1 class="title" tabindex="-1" data-focus>Already well compressed.</h1>
          <p class="muted">We couldn't make ${escape(job.name)} (${formatBytes(job.size)}) any smaller, so you can keep the original as it is.</p>
        </div>
      </div>
      <div class="actions">${back}</div>
      ${PRIVACY_NOTE}`;
  }

  const pct = percentSmaller(job.size, after);
  const visual =
    job.kind === "jpg" && urls.original && urls.result
      ? compareBlock(urls.original, urls.result)
      : `<div aria-hidden="true"><div class="bar"><span data-width="${Math.max(2, 100 - pct)}"></span></div><div class="bar-legend"><span>New</span><span>Original</span></div></div>`;
  return `
    <div class="screen-body center">
      <div class="stack">
        <span class="muted with-icon">${icons.check}<span class="truncate">${escape(job.name)}</span></span>
        <h1 class="big-number" tabindex="-1" data-focus><span class="sr-only">Now </span>${sizeWithUnit(after)}</h1>
        <p class="muted result-line">from ${formatBytes(job.size)} · <span class="accent">${pct}% smaller</span></p>
        ${job.kind === "jpg" ? `<p class="small muted">Hidden photo details, like location and camera, were removed.</p>` : ""}
      </div>
      ${visual}
    </div>
    <div class="actions">
      <button type="button" class="btn btn-primary btn-block" data-action="download" data-id="${job.id}">${icons.download} Download</button>
      ${back}
    </div>
    ${PRIVACY_NOTE}`;
}

/** "273 KB" as a number with a smaller unit beside it. */
function sizeWithUnit(bytes: number): string {
  const [number, unit] = formatBytes(bytes).split(" ");
  return `${number}<span class="unit">${unit}</span>`;
}

function compareBlock(original: string, result: string): string {
  return `
    <div class="compare" data-compare>
      <img src="${original}" alt="Original photo">
      <img class="after" src="${result}" alt="Compressed photo">
      <span class="compare-tag tag-left">Original</span>
      <span class="compare-tag tag-right">Compressed</span>
      <span class="compare-line"></span>
      <span class="compare-knob">${icons.arrows}</span>
      <input type="range" min="0" max="100" value="50" aria-label="Compare original and compressed: drag or use arrow keys" data-split>
    </div>`;
}

export function listView(jobs: Job[]): string {
  const done = jobs.filter((j) => j.status === "done");
  const busy = jobs.filter((j) => j.status === "working" || j.status === "queued").length;
  const before = done.reduce((n, j) => n + j.size, 0);
  const after = done.reduce((n, j) => n + j.result!.size, 0);
  const summary = done.length
    ? `<span class="mid-number">${sizeWithUnit(before)} → ${sizeWithUnit(after)}</span>
       <span class="accent">${percentSmaller(before, after)}% smaller</span>`
    : `<span class="mid-number">Working…</span>`;
  const kept = done.filter((j) => j.kept);
  const failed = jobs.filter((j) => j.status === "error");

  return `
    <div class="screen-body">
      <div class="stack">
        <span class="muted" tabindex="-1" data-focus>${jobs.length} files${busy ? ` · ${busy} still to go` : ""}</span>
        ${summary}
      </div>
      <ul class="list" aria-label="Files">${jobs.map(listRow).join("")}</ul>
      ${kept.length ? `<p class="small muted">${kept.map((j) => escape(j.name)).join(", ")} ${kept.length > 1 ? "were" : "was"} already well compressed, so we kept the original.</p>` : ""}
      ${failed.length ? `<p class="small muted">Tap a failed file to see what went wrong.</p>` : ""}
    </div>
    <div class="actions">
      ${!busy && done.length > 1 ? `<button type="button" class="btn btn-primary btn-block" data-action="download-all">${icons.download} Download all</button>` : ""}
      <button type="button" class="btn btn-secondary btn-block" data-action="pick">Add more files</button>
      <button type="button" class="btn-link" data-action="reset">Start over</button>
    </div>`;
}

function listRow(job: Job): string {
  let meta = "Waiting";
  let tag = "";
  if (job.status === "working") {
    meta = job.pages ? `Page ${job.page} of ${job.pages}` : "Compressing…";
  } else if (job.status === "done" && job.kept) {
    meta = `${formatBytes(job.size)} · kept original`;
    tag = `<span class="row-tag is-flat">0%</span>`;
  } else if (job.status === "done") {
    meta = `${formatBytes(job.size)} → ${formatBytes(job.result!.size)}`;
    tag = `<span class="row-tag">−${percentSmaller(job.size, job.result!.size)}%</span>`;
  } else if (job.status === "error") {
    meta = ERRORS[job.error ?? "unreadable"].short;
    tag = `<span class="row-tag is-flat">Failed</span>`;
  }
  const main = `
    <span class="row-main">
      <span class="row-name truncate">${escape(job.name)}</span>
      <span class="row-meta" data-meta-for="${job.id}">${meta}</span>
    </span>${tag}`;
  const openable = job.status === "done" || job.status === "error";
  return `
    <li class="row">
      ${openable ? `<button type="button" class="row-open" data-action="open" data-id="${job.id}">${main}</button>` : `<span class="row-open">${main}</span>`}
      ${job.status === "done" ? `<button type="button" class="icon-btn" data-action="download" data-id="${job.id}" aria-label="Download ${escape(job.name)}">${icons.download}</button>` : ""}
    </li>`;
}

interface ErrorCopy {
  title: (device: string) => string;
  body: (name: string, size: string, device: string) => string;
  next: (device: string) => string;
  retry: boolean;
  short: string;
}

const ERRORS: Record<ErrorCode | "reloaded", ErrorCopy> = {
  memory: {
    title: (device) => `Your ${device} ran out of room for this one.`,
    body: (name, size, device) => `${name} (${size}) was too big to finish on this ${device}.`,
    next: (device) =>
      device === "phone" ? "Try it on a computer, or split the PDF into smaller parts first." : "Try Smaller quality, or split the PDF into smaller parts first.",
    retry: true,
    short: "Ran out of memory",
  },
  locked: {
    title: () => "This PDF is locked.",
    body: (name) => `${name} has a password, so we can't open it.`,
    next: () => "Remove the password in your PDF app, then try again.",
    retry: false,
    short: "Needs a password",
  },
  unreadable: {
    title: () => "We couldn't read this file.",
    body: (name) => `${name} looks damaged, or isn't a standard PDF or JPG.`,
    next: () => "Try opening it and saving a fresh copy in another app, then try again.",
    retry: false,
    short: "Couldn't read it",
  },
  unsupported: {
    title: () => "Only PDFs and JPGs for now.",
    body: (name) => `${name} isn't a PDF or JPG.`,
    next: () => "Save it as a PDF or JPG first, then try again.",
    retry: false,
    short: "Not a PDF or JPG",
  },
  reloaded: {
    title: () => "Your last file didn't finish.",
    body: (name, _size, device) => `The page reloaded while compressing ${name}. This usually means the ${device} ran low on memory.`,
    next: () => "Try again, or use a computer for files this big.",
    retry: false,
    short: "Page reloaded",
  },
};

export function failedView(
  code: ErrorCode | "reloaded",
  file: { name: string; size: number },
  limit: Limit,
  options: { inList?: boolean; jobId?: number } = {},
): string {
  const copy = ERRORS[code];
  const name = escape(file.name);
  const retry =
    copy.retry && options.jobId !== undefined
      ? `<button type="button" class="btn btn-primary btn-block" data-action="retry" data-id="${options.jobId}">Try again</button>`
      : "";
  const choose =
    code === "reloaded"
      ? `<button type="button" class="btn btn-primary btn-block" data-action="pick-fresh">Choose the file again</button>`
      : `<button type="button" class="btn btn-secondary btn-block" data-action="pick-fresh">Choose another file</button>`;
  return `
    <div class="screen-body center">
      <span class="round-icon">${icons.alert}</span>
      <h1 class="title" tabindex="-1" data-focus>${copy.title(limit.device)}</h1>
      <p class="muted">${copy.body(name, formatBytes(file.size), limit.device)}</p>
      <p>${copy.next(limit.device)}</p>
      <p class="small muted with-icon">${icons.lock} Nothing was uploaded or saved.</p>
    </div>
    <div class="actions">
      ${retry}
      ${options.inList ? `<button type="button" class="btn btn-secondary btn-block" data-action="list">Back to all files</button>` : choose}
    </div>`;
}

function fileCard(name: string, meta: string): string {
  return `
    <div class="card">
      <span class="file-icon">${icons.file}</span>
      <div class="stack">
        <span class="file-name truncate">${escape(name)}</span>
        <span class="mono small muted">${meta}</span>
      </div>
    </div>`;
}
