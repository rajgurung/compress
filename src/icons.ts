const svg = (size: number, width: number, body: string) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  upload: svg(22, 1.75, '<path d="M12 15V4"/><path d="M7 9l5-5 5 5"/><path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/>'),
  lock: svg(16, 2, '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  file: svg(20, 1.75, '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
  check: svg(18, 2, '<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  download: svg(18, 2, '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>'),
  alert: svg(22, 1.75, '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/>'),
  back: svg(20, 2, '<path d="M15 6l-6 6 6 6"/>'),
  arrows: svg(18, 2, '<path d="M9 7l-5 5 5 5"/><path d="M15 7l5 5-5 5"/>'),
};
