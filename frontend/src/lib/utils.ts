// ============================================
// mixFlow — Utility functions
// ============================================

export function cn(...args: (string | undefined | false | null)[]) {
  return args.filter(Boolean).join(' ');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function estimateDuration(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, words / 3.5); // ~3.5 words/sec for Indonesian
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
