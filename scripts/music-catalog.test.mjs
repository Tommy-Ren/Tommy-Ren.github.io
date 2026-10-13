import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const catalog = JSON.parse(await readFile(new URL('../src/blog/music-catalog.json', import.meta.url), 'utf8'));

test('study radio adds 100 distinct, full-length, locally hosted tracks with verified licenses', async () => {
  assert.equal(catalog.length, 100);
  assert.equal(new Set(catalog.map(track => track.id)).size, catalog.length);
  assert.equal(new Set(catalog.map(track => track.sha256)).size, catalog.length);
  assert.ok(new Set(catalog.map(track => track.artist)).size >= 20);

  for (const track of catalog) {
    assert.match(track.src, /^\/blog\/audio\/study\/[a-z0-9-]+\.m4a$/);
    assert.match(track.licenseUrl, /^https:\/\/creativecommons\.org\/licenses\/by(?:-sa)?\/[34]\.0\//);
    assert.match(track.sourceUrl, /^https:\/\/www\.free-stock-music\.com\/.+\.html$/);
    assert.ok(track.duration >= 45, `${track.id}: expected a complete track`);
    assert.ok(Math.abs(track.duration - track.originalDuration) <= 0.2, `${track.id}: duration must be preserved`);
    assert.ok(track.credit.includes(track.artist));
    assert.ok(track.credit.includes('https://www.free-stock-music.com'));

    const path = new URL(`../public${track.src}`, import.meta.url);
    const bytes = await readFile(path);
    assert.equal(bytes.length, track.fileBytes, `${track.id}: file size`);
    assert.equal(bytes.subarray(4, 8).toString('ascii'), 'ftyp', `${track.id}: MPEG-4 audio container`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), track.sha256, `${track.id}: audio integrity`);
    assert.ok((await stat(new URL(`../public${track.cover}`, import.meta.url))).isFile());
  }
});
