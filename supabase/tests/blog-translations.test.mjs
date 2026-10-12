import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import { XMLParser } from 'fast-xml-parser';
import { createTranslationEngine } from '../functions/blog-translate/translate.mjs';
import { selectTranslation } from '../../src/blog/translations.mjs';
const options = { fromMarkdown, toMarkdown, XMLParser, extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()], markdownExtensions: [gfmToMarkdown()] };
const post = { title: '中文标题', summary: '摘要', category: '学习', tags: ['编程'], source_language: 'zh', markdown: '## 章节\n\n**重点**与 `const 中文 = 1`。\n\n[链接](https://example.com/中文?q=x)\n\n```js\nconst 中文 = "原样保留";\n```\n\n| 列名 | 值 |\n| --- | --- |\n| 内容 | 数据 |\n\n![图片说明](/images/中文.webp)\n' };
test('DeepL translates both directions without touching code, URLs or Markdown structure', async () => {
  const calls = [];
  const engine = createTranslationEngine({ ...options, fetch: async (url, init) => {
    const body = JSON.parse(init.body); calls.push({ url, body });
    assert.ok(body.text.every(value => !value.includes('原样保留') && !value.includes('example.com')));
    assert.deepEqual(body.ignore_tags, ['x']);
    return Response.json({ translations: body.text.map(text => ({ text: text.replace('<p>', '<p>Translated ') })) });
  } });
  const output = await engine(post, 'test:fx');
  assert.equal(output.title, 'Translated 中文标题');
  assert.match(output.markdown, /const 中文 = "原样保留";/);
  assert.match(output.markdown, /`const 中文 = 1`/);
  assert.match(output.markdown, /https:\/\/example.com\/中文\?q=x/);
  assert.match(output.markdown, /\/images\/中文.webp/);
  assert.equal(calls[0].url, 'https://api-free.deepl.com/v2/translate');
  assert.equal(calls[0].body.target_lang, 'EN-US');
  await engine({ ...post, source_language: 'en' }, 'test-pro');
  assert.equal(calls.at(-1).body.target_lang, 'ZH-HANS');
  assert.equal(calls.at(-1).url, 'https://api.deepl.com/v2/translate');
});
test('Long articles are batched within the count and byte budget', async () => {
  let calls = 0;
  const engine = createTranslationEngine({ ...options, fetch: async (_, init) => {
    calls++;
    assert.ok(new TextEncoder().encode(init.body).length < 128 * 1024);
    const body = JSON.parse(init.body); assert.ok(body.text.length <= 50);
    return Response.json({ translations: body.text.map(text => ({ text })) });
  } });
  await engine({ ...post, markdown: Array(150).fill('中文'.repeat(500)).join('\n\n') }, 'test:fx');
  assert.ok(calls > 2);
});
test('Quota and malformed responses fail without inventing or partially returning a translation', async () => {
  for (const response of [new Response('', { status: 456 }), Response.json({ translations: [] })]) {
    const engine = createTranslationEngine({ ...options, fetch: async () => response });
    await assert.rejects(engine(post, 'test:fx'), /额度|不完整/);
  }
});
test('Only the requested language and exact source revision can be displayed', () => {
  const source = { id: '1', content_version: 'v2', source_language: 'zh' };
  const entries = [{ post_id: '1', locale: 'en', source_version: 'v1', title: 'stale' }, { post_id: '1', locale: 'en', source_version: 'v2', title: 'current' }];
  assert.equal(selectTranslation(source, entries, 'en').title, 'current');
  assert.equal(selectTranslation(source, entries, 'zh'), null);
  assert.equal(selectTranslation({ ...source, content_version: 'v3' }, entries, 'en'), null);
});
test('Sentences stay together across inline code and emphasis; missing placeholders fail closed', async () => {
  const source = { ...post, markdown: '使用 `slug` **生成**文章链接。' };
  const engine = createTranslationEngine({ ...options, fetch: async (_, init) => {
    const body = JSON.parse(init.body);
    assert.ok(body.text.some(text => text.includes('使用') && text.includes('slug') && text.includes('生成') && text.includes('文章链接')));
    return Response.json({ translations: body.text.map(text => ({ text: text.replace(/<x id="\d+">.*?<\/x>/g, '') })) });
  } });
  await assert.rejects(engine(source, 'test:fx'), /缺少代码/);
});
