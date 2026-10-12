import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { buildSeedSql, sqlLiteral } from '../../scripts/export-blog-seed.mjs';

test('SQL literals preserve apostrophes, backslashes and Unicode without injectable delimiters', () => {
  assert.equal(sqlLiteral("Tommy's C:\\notes"), "'Tommy''s C:\\notes'");
  assert.equal(sqlLiteral(['博客', "A'B"]), "array['博客', 'A''B']::text[]");
  assert.equal(sqlLiteral([]), 'array[]::text[]');
  assert.throws(() => sqlLiteral('\0'), /without NUL/);
});

test('Seed exports exact Markdown, excludes drafts and never overwrites existing content', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tommy-blog-seed-'));
  try {
    await writeFile(path.join(directory, 'first.md'), `---\ntitle: "Tommy's Note"\nslug: first-note\ndate: "2026-10-11"\nsummary: 介绍\ntags: [博客]\n---\n\n## 标题\n\n原始 **Markdown** 和 C:\\notes。\n`, 'utf8');
    await writeFile(path.join(directory, 'draft.md'), '---\ndraft: true\n---\nPRIVATE DRAFT BODY', 'utf8');
    const sql = await buildSeedSql({ contentDirectory: directory });
    assert.match(sql, /Tommy''s Note/);
    assert.match(sql, /原始 \*\*Markdown\*\* 和 C:\\notes。/);
    assert.doesNotMatch(sql, /PRIVATE DRAFT BODY|<strong>|auth\.users|blog_admins/);
    assert.match(sql, /on conflict \(slug\) do nothing/);
    assert.equal((sql.match(/on conflict \(id\) do nothing/g) ?? []).length, 3);
    assert.match(sql, /reading_minutes/);
    assert.match(sql, /set local standard_conforming_strings = on/);
    assert.match(sql, /false, true, 0/); // Unsplash inspiration is not claimed as Tommy photography.
  } finally {
    const absolute = path.resolve(directory);
    const expectedRoot = `${path.resolve(os.tmpdir())}${path.sep}`;
    if (!absolute.startsWith(expectedRoot) || !path.basename(absolute).startsWith('tommy-blog-seed-')) throw new Error('Refusing unexpected test cleanup path.');
    await rm(absolute, { recursive: true, force: true });
  }
});
