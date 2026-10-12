import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { importStarterContent } from '../../src/blog/admin/import-starter.mjs';
import { buildSeedData } from '../../scripts/export-blog-seed.mjs';

const bundle = JSON.parse(await readFile(new URL('../../src/blog/admin/starter-content.json', import.meta.url), 'utf8'));
const uid = '12345678-1234-4123-8123-123456789abc';
const fetchImage = async () => new Response(new Blob(['webp-fixture'], { type: 'image/webp' }));

function fixture({ authorized = true, failPhotoOnce = false } = {}) {
  const tables = { blog_posts: new Map(), blog_photos: new Map(), blog_links: new Map() };
  const objects = new Set();
  let uploads = 0, queries = 0;
  const bucket = {
    async list(folder, { search }) { return { data: [...objects].filter(path => path.startsWith(`${folder}/`) && path.endsWith(search)).map(path => ({ name: path.split('/').at(-1) })) }; },
    async upload(path, _blob, options) { assert.equal(options.upsert, false); assert.ok(path.startsWith(`${uid}/`)); assert.ok(!objects.has(path)); objects.add(path); uploads++; return { error: null }; },
    getPublicUrl(path) { return { data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/blog-media/${path}` } }; },
  };
  const client = {
    rpc: async () => ({ data: authorized }),
    storage: { from: name => { assert.equal(name, 'blog-media'); return bucket; } },
    from(name) {
      queries++; assert.ok(tables[name], `Unexpected table ${name}`);
      return {
        select: () => ({ in: async (_column, ids) => ({ data: [...tables[name].values()].filter(row => ids.includes(row.id)) }) }),
        upsert(rows, options) {
          assert.equal(options.ignoreDuplicates, true);
          return { select: async () => {
            if (name === 'blog_photos' && failPhotoOnce) { failPhotoOnce = false; return { error: new Error('network interrupted') }; }
            const data = [];
            for (const row of Array.isArray(rows) ? rows : [rows]) {
              const key = row[options.onConflict];
              if (tables[name].has(key)) continue;
              tables[name].set(key, structuredClone(row)); data.push({ id: row.id || key });
            }
            return { data };
          } };
        },
      };
    },
  };
  return { client, tables, objects, get uploads() { return uploads; }, get queries() { return queries; } };
}

test('Starter bundle matches the published Markdown export and attributes every photo', async () => {
  assert.deepEqual(bundle, await buildSeedData());
  assert.equal(bundle.posts.length, 3); assert.equal(bundle.photos.length, 8);
  for (const photo of bundle.photos) { assert.equal(photo.is_own, false); assert.match(photo.credit, /Unsplash/); assert.match(photo.source_url, /^https:/); }
  for (const post of bundle.posts) assert.ok(bundle.photos.some(photo => photo.image_url === post.cover));
});

test('Imports real records and storage URLs, preserves edited drafts, and safely skips a repeat', async () => {
  const f = fixture();
  const edited = { ...bundle.posts[0], title: 'My existing draft', published: false };
  f.tables.blog_posts.set(edited.slug, edited);
  const first = await importStarterContent(f.client, uid, bundle, undefined, fetchImage);
  assert.deepEqual(first, { posts: 2, photos: 8, links: 4, uploaded: 8, skipped: 1 });
  assert.deepEqual(f.tables.blog_posts.get(edited.slug), edited);
  for (const photo of f.tables.blog_photos.values()) assert.match(photo.image_url, /storage\/v1\/object\/public\/blog-media/);
  for (const post of f.tables.blog_posts.values()) if (post.slug !== edited.slug) assert.match(post.cover, /storage\/v1\/object\/public\/blog-media/);
  const second = await importStarterContent(f.client, uid, bundle, undefined, fetchImage);
  assert.deepEqual(second, { posts: 0, photos: 0, links: 0, uploaded: 0, skipped: 15 });
  assert.equal(f.uploads, 8);
});

test('Retry reuses an uploaded image after the database write was interrupted', async () => {
  const f = fixture({ failPhotoOnce: true });
  await assert.rejects(importStarterContent(f.client, uid, bundle, undefined, fetchImage), /network interrupted/);
  assert.equal(f.uploads, 1);
  const resumed = await importStarterContent(f.client, uid, bundle, undefined, fetchImage);
  assert.equal(resumed.photos, 8); assert.equal(resumed.uploaded, 7); assert.equal(f.uploads, 8);
});

test('A non-administrator cannot start database or Storage writes', async () => {
  const f = fixture({ authorized: false });
  await assert.rejects(importStarterContent(f.client, uid, bundle, undefined, fetchImage), /管理员/);
  assert.equal(f.queries, 0); assert.equal(f.uploads, 0);
});
