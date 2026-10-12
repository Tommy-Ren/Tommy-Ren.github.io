export function escapeHtml(value: unknown): string;
export function safeUrl(value: unknown, options?: { image?: boolean }): string | null;
export function renderMarkdown(markdown: string): { html: string; toc: { id: string; title: string; level: number }[] };
