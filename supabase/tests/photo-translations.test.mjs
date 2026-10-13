import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translatePhotoText } from '../functions/blog-translate/photo.mjs';

const photo = Object.freeze({
  id: '7b55eccc-c446-4af7-899f-dc7789ce0b66', source_language: 'zh',
  title: '雨后的森林', caption: '阳光穿过树梢。\n安静的一刻。',
  image_url: 'https://example.com/private-image-name.webp',
  source_url: 'https://example.com/photographer', credit: 'Original photographer',
  content_version: 'a637239b-39e9-47ea-8e90-a7de9e194c6b', published: false,
});

test('Photo translation sends only descriptive text and preserves Chinese-to-English direction', async () => {
  const signal = new AbortController().signal;
  let calls = 0;
  const output = await translatePhotoText(photo, 'example:fx', signal, async (url, init) => {
    calls++;
    assert.equal(url, 'https://api-free.deepl.com/v2/translate');
    assert.equal(init.method, 'POST');
    assert.equal(init.signal, signal);
    assert.equal(init.headers.Authorization, 'DeepL-Auth-Key example:fx');
    assert.deepEqual(JSON.parse(init.body), {
      text: [photo.title, photo.caption], source_lang: 'ZH', target_lang: 'EN-US', preserve_formatting: true,
    });
    for (const protectedValue of [photo.id, photo.image_url, photo.source_url, photo.credit, photo.content_version]) {
      assert.ok(!init.body.includes(protectedValue), 'Private identifiers, URLs and credits must not be sent to DeepL');
    }
    return Response.json({ translations: [{ text: 'The forest after rain' }, { text: 'Sunlight through the canopy.\nA quiet moment.' }] });
  });
  assert.equal(calls, 1);
  assert.deepEqual(output, { title: 'The forest after rain', caption: 'Sunlight through the canopy.\nA quiet moment.' });
  assert.equal(photo.title, '雨后的森林');
  assert.equal(photo.credit, 'Original photographer');
});

test('English photos translate into simplified Chinese using the Pro API endpoint', async () => {
  const input = Object.freeze({ ...photo, title: 'Rainy afternoon', caption: 'A coffee by the window.', source_language: 'en' });
  const output = await translatePhotoText(input, 'example-pro-key', undefined, async (url, init) => {
    assert.equal(url, 'https://api.deepl.com/v2/translate');
    assert.deepEqual(JSON.parse(init.body), {
      text: [input.title, input.caption], source_lang: 'EN', target_lang: 'ZH-HANS', preserve_formatting: true,
    });
    return Response.json({ translations: [{ text: '下雨的午后' }, { text: '窗边的一杯咖啡。' }] });
  });
  assert.deepEqual(output, { title: '下雨的午后', caption: '窗边的一杯咖啡。' });
});

test('Empty and whitespace-only captions need one translation and remain empty', async () => {
  for (const caption of ['', '   \n\t']) {
    const output = await translatePhotoText({ ...photo, caption }, 'example:fx', undefined, async (_, init) => {
      assert.deepEqual(JSON.parse(init.body).text, [photo.title]);
      return Response.json({ translations: [{ text: 'Forest' }] });
    });
    assert.deepEqual(output, { title: 'Forest', caption: '' });
  }
});

test('Provider quota, credential and server failures return safe actionable errors', async () => {
  for (const [status, message] of [[456, /额度/], [403, /密钥未通过验证/], [429, /稍后重试/], [500, /稍后重试/]]) {
    await assert.rejects(
      translatePhotoText(photo, 'example:fx', undefined, async () => new Response('Provider response is not exposed', { status })),
      message,
    );
  }
});

test('Incomplete, empty and invalid provider results never become stored translations', async () => {
  for (const response of [
    null, {}, { translations: null }, { translations: {} }, { translations: [] },
    { translations: [{ text: 'Title only' }] },
    { translations: [{ text: 'Title' }, { text: 'Caption' }, { text: 'Unexpected third result' }] },
    { translations: [null, { text: 'Caption' }] },
    { translations: [{ text: 'Title' }, null] },
    { translations: [{ text: 123 }, { text: 'Caption' }] },
    { translations: [{ text: 'Title' }, { text: '' }] },
    { translations: [{ text: '  ' }, { text: 'Caption' }] },
  ]) {
    await assert.rejects(
      translatePhotoText(photo, 'example:fx', undefined, async () => Response.json(response)),
      /译文不完整/,
      `Unexpected provider result: ${JSON.stringify(response)}`,
    );
  }
});

test('Invalid JSON and interrupted requests reject instead of returning partial text', async () => {
  await assert.rejects(translatePhotoText(photo, 'example:fx', undefined, async () => new Response('{ broken JSON')), SyntaxError);
  const abort = new DOMException('Translation interrupted', 'AbortError');
  await assert.rejects(translatePhotoText(photo, 'example:fx', undefined, async () => { throw abort; }), error => error === abort);
});
