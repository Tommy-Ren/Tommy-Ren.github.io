import { Marked } from 'marked';

const SITE_URL = 'https://tommy-ren.github.io';

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export function safeUrl(value, { image = false } = {}) {
  if (typeof value !== 'string') return null;
  const href = value.trim();
  if (!href || /[\u0000-\u0020\u007f\\]/.test(href) || href.startsWith('//')) return null;
  try {
    const parsed = new URL(href, SITE_URL);
    if (!(image ? ['http:', 'https:'] : ['http:', 'https:', 'mailto:']).includes(parsed.protocol)) return null;
    // Entity-obfuscated schemes cannot bypass the protocol check when emitted.
    if (/^[^/?#]*&(?:#\w+|\w+);/.test(href)) return null;
    return href;
  } catch {
    return null;
  }
}

function tokenText(tokens) {
  return tokens.map(token => {
    if (token.type === 'html') return '';
    if (token.tokens) return tokenText(token.tokens);
    return token.text ?? '';
  }).join('');
}

export function renderMarkdown(markdown) {
  const toc = [];
  const usedIds = new Set();
  const parser = new Marked({
    gfm: true,
    breaks: false,
    async: false,
    renderer: {
      html({ text }) { return escapeHtml(text); },
      heading({ tokens, depth }) {
        const title = tokenText(tokens).trim();
        const base = title.normalize('NFKC').toLowerCase()
          .replace(/[^\p{L}\p{N}_\s-]/gu, '').replace(/[\s-]+/g, '-').replace(/^-|-$/g, '') || 'section';
        let id = base;
        let suffix = 2;
        while (usedIds.has(id)) id = `${base}-${suffix++}`;
        usedIds.add(id);
        if (depth >= 2 && depth <= 4) toc.push({ id, title, level: depth });
        return `<h${depth} id="${escapeHtml(id)}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const body = this.parser.parseInline(tokens);
        const destination = safeUrl(href);
        if (!destination) return body;
        const external = /^https?:\/\//i.test(destination) && new URL(destination).origin !== SITE_URL;
        return `<a href="${escapeHtml(destination)}"${title ? ` title="${escapeHtml(title)}"` : ''}${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${body}</a>`;
      },
      image({ href, title, text }) {
        const destination = safeUrl(href, { image: true });
        if (!destination) return escapeHtml(text);
        return `<img src="${escapeHtml(destination)}" alt="${escapeHtml(text)}"${title ? ` title="${escapeHtml(title)}"` : ''} loading="lazy" decoding="async" />`;
      },
      code({ text, lang }) {
        const language = lang?.trim().split(/\s+/)[0] ?? '';
        const className = /^[a-z0-9_-]+$/i.test(language) ? ` class="language-${language}"` : '';
        return `<pre><code${className}>${escapeHtml(text)}\n</code></pre>\n`;
      },
    },
  });
  return { html: parser.parse(markdown), toc };
}

