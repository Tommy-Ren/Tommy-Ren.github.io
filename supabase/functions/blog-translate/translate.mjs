// Translate complete Markdown paragraphs as XML, retaining inline context.
// Code blocks and URLs stay local; inline code is protected by DeepL ignore_tags.
export function createTranslationEngine({ fromMarkdown, toMarkdown, XMLParser, extensions, mdastExtensions, markdownExtensions, fetch: request = fetch }) {
  const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: '', trimValues: false, parseTagValue: false });
  const contentOf = xml => {
    const root = parser.parse(xml);
    if (root.length !== 1 || !Array.isArray(root[0].p)) throw new Error('DeepL 返回的段落结构不完整，请重试。');
    return root[0].p;
  };
  return async function translate(post, apiKey, signal) {
    const tree = fromMarkdown(post.markdown, { extensions, mdastExtensions });
    const segments = [], setters = [];
    const add = (xml, set) => { segments.push(xml); setters.push(set); };
    const plain = (value, set) => {
      if (!value?.trim()) return;
      add(`<p>${escape(value)}</p>`, xml => {
        const nodes = contentOf(xml);
        if (nodes.some(node => typeof node['#text'] !== 'string')) throw new Error('DeepL 返回了意外的文本格式。');
        set(nodes.map(node => node['#text']).join(''));
      });
    };
    const output = { title: post.title, summary: post.summary, category: post.category, tags: [...post.tags], markdown: '' };
    for (const key of ['title', 'summary', 'category']) plain(post[key], value => { output[key] = value; });
    output.tags.forEach((tag, index) => plain(tag, value => { output.tags[index] = value; }));
    const visit = node => {
      if (['code', 'inlineCode', 'html', 'definition'].includes(node.type)) return;
      if (['paragraph', 'heading', 'tableCell'].includes(node.type)) {
        const originals = [], protectedIds = [];
        const encode = child => {
          if (child.type === 'text') return escape(child.value);
          const id = originals.push(child) - 1;
          if (child.children) return `<n id="${id}">${child.children.map(encode).join('')}</n>`;
          protectedIds.push(id);
          if (child.type === 'image' || child.type === 'imageReference') plain(child.alt, value => { child.alt = value; });
          return `<x id="${id}">${escape(child.type === 'inlineCode' ? child.value : '')}</x>`;
        };
        const xml = `<p>${node.children.map(encode).join('')}</p>`;
        // Avoid splitting tags or charging for a truncated paragraph.
        if (new TextEncoder().encode(JSON.stringify(xml)).length > 80000) throw new Error('单个段落过长，请分成较短的段落后重新翻译。');
        add(xml, translated => {
          const seenProtected = [];
          const decode = items => items.map(item => {
            if (typeof item['#text'] === 'string') return { type: 'text', value: item['#text'] };
            const kind = item.n ? 'n' : item.x ? 'x' : null;
            const id = Number(item[':@']?.id);
            if (!kind || !Number.isInteger(id) || !originals[id]) throw new Error('译文格式校验失败，请重新生成。');
            if (kind === 'x') { seenProtected.push(id); return originals[id]; }
            if (!originals[id].children) throw new Error('译文代码保护校验失败。');
            return { ...originals[id], children: decode(item.n) };
          });
          const children = decode(contentOf(translated));
          if (protectedIds.length !== seenProtected.length || protectedIds.some(id => seenProtected.filter(value => value === id).length !== 1)) throw new Error('译文缺少代码或图片标记，请重试。');
          node.children = children;
        });
      } else node.children?.forEach(visit);
    };
    visit(tree);
    const endpoint = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
    for (let start = 0; start < segments.length;) {
      const batch = [], indices = [];
      let bytes = 0;
      while (start < segments.length && batch.length < 50) {
        const nextBytes = new TextEncoder().encode(JSON.stringify(segments[start])).length;
        if (batch.length && bytes + nextBytes > 80000) break;
        indices.push(start); batch.push(segments[start++]); bytes += nextBytes;
      }
      const response = await request(endpoint, {
        method: 'POST', signal,
        headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: batch, source_lang: post.source_language === 'zh' ? 'ZH' : 'EN',
          target_lang: post.source_language === 'zh' ? 'EN-US' : 'ZH-HANS',
          preserve_formatting: true, tag_handling: 'xml', tag_handling_version: 'v2',
          split_sentences: 'nonewlines', ignore_tags: ['x'], non_splitting_tags: ['n', 'x'],
          context: `${post.title}\n${post.summary}` }),
      });
      if (!response.ok) {
        const reasons = { 403: 'DeepL API key 无效，请检查服务端配置。', 429: 'DeepL 请求过于频繁，请稍后重试。', 456: 'DeepL 翻译额度已用完，请检查 DeepL 账户。' };
        throw new Error(reasons[response.status] || `DeepL 暂时不可用（${response.status}），原文已保留。`);
      }
      const result = await response.json();
      if (!Array.isArray(result.translations) || result.translations.length !== batch.length ||
        result.translations.some(item => typeof item.text !== 'string' || !item.text.trim())) throw new Error('DeepL 返回了不完整的译文，请重试。');
      result.translations.forEach((item, index) => setters[indices[index]](item.text));
    }
    output.markdown = toMarkdown(tree, { extensions: markdownExtensions, fences: true });
    if (output.title.length > 500 || output.summary.length > 2000 || output.category.length > 160 ||
      output.markdown.length > 400000 || output.tags.some(tag => tag.length > 128)) throw new Error('译文超过长度限制，请精简原文后重试。');
    return output;
  };
}
