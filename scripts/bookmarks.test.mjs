import test from 'node:test';
import assert from 'node:assert/strict';
import { bookmarkCategory, bookmarkCategories, bookmarkCategoryLabel, bookmarkUrl } from '../src/blog/bookmarks.ts';

test('Existing bookmarks remain discoverable under the new categories', () => {
  assert.equal(bookmarkCategory('WEB / DOCUMENTATION'), 'links');
  for (const kind of ['CREATIVE / GRAPHICS', 'UI / DEVELOPMENT', 'TOOLS / LEARNING']) {
    assert.equal(bookmarkCategory(kind), 'tools');
  }
  assert.equal(bookmarkCategory('休闲'), 'leisure');
  assert.equal(bookmarkCategoryLabel('tools', 'en'), 'Tools');
  assert.equal(bookmarkCategoryLabel('tools', 'zh'), '工具');
});

test('New categories extend navigation without duplicating built-in groups', () => {
  assert.deepEqual(bookmarkCategories([{kind:'Tools'}, {kind:'Design'}, {kind:'Design'}, {kind:'休闲'}]), ['tools', 'links', 'leisure', 'Design']);
  assert.equal(bookmarkCategory('constructor'), 'constructor');
  assert.equal(bookmarkCategory('__proto__'), '__proto__');
});

test('Category links round-trip names without changing query structure', () => {
  const category = '灵感 / Design & Art #1';
  const url = new URL(bookmarkUrl(category), 'https://tommy-ren.github.io');
  assert.equal(url.pathname, '/blog/collections/');
  assert.deepEqual([...url.searchParams.entries()], [['category', category]]);
  assert.equal(url.hash, '');
  assert.equal(bookmarkUrl(), '/blog/collections/');
});
