import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// 验证与 Deno entry 共用的纯 HTTP handler，不启动服务或连接项目。
const source = await readFile(new URL('../functions/blog-feed/feed.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { createFeedHandler } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const env = name => ({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: 'anon-only-key' })[name];
const posts = [{ slug: 'first-note', title: 'Tommy <&> "Note"', summary: 'Summary & more', published_on: '2026-10-11', category: '学习', tags: ['A&B'] }];

test('Public RSS fetches only published metadata as anon and escapes XML', async () => {
  let call;
  const handler = createFeedHandler({ env, fetch: async (url, init) => {
    call = { url: new URL(url), init };
    return Response.json(posts);
  } });
  const response = await handler(new Request('https://project.supabase.co/functions/v1/blog-feed', { headers: { Authorization: 'Bearer admin-user-token' } }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/rss+xml; charset=utf-8');
  assert.equal(call.init.headers.Authorization, 'Bearer anon-only-key');
  assert.equal(call.url.searchParams.get('published'), 'eq.true');
  assert.equal(call.url.searchParams.get('select'), 'slug,title,summary,published_on,category,tags');
  assert.equal(call.url.searchParams.get('limit'), '100');
  const xml = await response.text();
  assert.match(xml, /Tommy &lt;&amp;&gt; &quot;Note&quot;/);
  assert.match(xml, /<category>A&amp;B<\/category>/);
  assert.match(xml, /https:\/\/tommy-ren.github.io\/blog\/articles\/\?post=first-note/);
  assert.match(xml, /href="https:\/\/project.supabase.co\/functions\/v1\/blog-feed"/);
  assert.doesNotMatch(xml, /admin-user-token|anon-only-key|markdown/);
});

test('Unsupported methods and CORS preflight do not access the database', async () => {
  let calls = 0;
  const handler = createFeedHandler({ env, fetch: async () => { calls++; return Response.json(posts); } });
  const options = await handler(new Request('https://example.com/', { method: 'OPTIONS' }));
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('access-control-allow-origin'), '*');
  const post = await handler(new Request('https://example.com/', { method: 'POST' }));
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, OPTIONS');
  assert.equal(calls, 0);
});

test('New publishable keys use apikey only and never borrow the caller session or a secret key', async () => {
  const queried = [];
  let headers;
  const handler = createFeedHandler({ env: name => {
    queried.push(name);
    return ({ SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: 'sb_publishable_demo' }),
      SUPABASE_ANON_KEY: 'unused-legacy', SUPABASE_SECRET_KEYS: 'DO NOT READ' })[name];
  }, fetch: async (_url, init) => { headers = init.headers; return Response.json(posts); } });
  const response = await handler(new Request('https://example.com/', { headers: { Authorization: 'Bearer admin-session' } }));
  assert.equal(response.status, 200);
  assert.equal(headers.apikey, 'sb_publishable_demo');
  assert.equal(headers.Authorization, undefined);
  assert.deepEqual(queried, ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEYS']);
});

test('Missing configuration, backend errors and invalid dates fail without exposing details', async () => {
  const request = new Request('https://example.com/');
  const missing = await createFeedHandler({ env: () => undefined })(request);
  assert.equal(missing.status, 503);
  const backend = await createFeedHandler({ env, fetch: async () => new Response('SECRET DATABASE DETAIL', { status: 500 }) })(request);
  assert.equal(backend.status, 503);
  assert.doesNotMatch(await backend.text(), /SECRET|anon-only-key/);
  const invalid = await createFeedHandler({ env, fetch: async () => Response.json([{ ...posts[0], published_on: '2026-02-30' }]) })(request);
  assert.equal(invalid.status, 503);
  const offline = await createFeedHandler({ env, fetch: async () => { throw new Error('offline detail'); } })(request);
  assert.equal(offline.status, 503);
  assert.doesNotMatch(await offline.text(), /offline detail/);
});
