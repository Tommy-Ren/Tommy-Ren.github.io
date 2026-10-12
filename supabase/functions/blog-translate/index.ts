import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { fromMarkdown } from 'npm:mdast-util-from-markdown@2.1.0';
import { toMarkdown } from 'npm:mdast-util-to-markdown@2.2.0';
import { gfmFromMarkdown, gfmToMarkdown } from 'npm:mdast-util-gfm@3.1.0';
import { gfm } from 'npm:micromark-extension-gfm@3.0.0';
import { XMLParser } from 'npm:fast-xml-parser@5.11.2';
import { createTranslationEngine } from './translate.mjs';

const translate = createTranslationEngine({ fromMarkdown, toMarkdown, XMLParser, extensions: [gfm()],
  mdastExtensions: [gfmFromMarkdown()], markdownExtensions: [gfmToMarkdown()] });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return reply({ error: '请先登录博客管理员账号。' }, 401);
  // Use the caller's verified user JWT and existing RLS, never a service-role key.
  const database = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const user = await database.auth.getUser(authorization.slice(7));
  if (user.error || !user.data.user) return reply({ error: '登录已过期，请重新登录。' }, 401);
  const admin = await database.rpc('is_blog_admin');
  if (admin.error || admin.data !== true) return reply({ error: '仅博客管理员可以生成译文。' }, 403);
  try {
    if (Number(request.headers.get('Content-Length')) > 2048) return reply({ error: 'Request too large' }, 413);
    const raw = await request.text();
    if (raw.length > 2048) return reply({ error: 'Request too large' }, 413);
    const { postId, regenerate } = JSON.parse(raw);
    if (typeof postId !== 'string' || !/^[0-9a-f-]{36}$/i.test(postId)) return reply({ error: 'Invalid article ID' }, 400);
    const result = await database.from('blog_posts').select('*').eq('id', postId).single();
    if (result.error || !result.data) return reply({ error: '文章不存在。' }, 404);
    const post = result.data;
    const locale = post.source_language === 'zh' ? 'en' : 'zh';
    const cached = await database.from('blog_post_translations').select('source_version').eq('post_id', postId).eq('locale', locale).maybeSingle();
    if (cached.error) return reply({ error: '译文数据库尚未配置。' }, 503);
    if (cached.data?.source_version === post.content_version && regenerate !== true) return reply({ status: 'cached', locale });
    const apiKey = Deno.env.get('DEEPL_API_KEY')?.trim();
    if (!apiKey) return reply({ error: '请先在 Supabase → Edge Functions → Secrets 添加 DEEPL_API_KEY。' }, 503);
    if (!post.markdown.trim()) return reply({ error: '请先填写文章正文。' }, 400);
    const output = await translate(post, apiKey, AbortSignal.timeout(110000));
    const saved = await database.rpc('save_blog_translation', { p_post_id: postId, p_locale: locale,
      p_source_version: post.content_version, p_title: output.title, p_summary: output.summary,
      p_markdown: output.markdown, p_category: output.category, p_tags: output.tags, p_provider: 'deepl' });
    if (saved.error) return reply({ error: saved.error.code === '40001' ? '翻译期间原文发生了修改，请重新生成。' : '译文未能保存，请重试。' }, 409);
    return reply({ status: 'translated', locale });
  } catch (error) {
    return reply({ error: error instanceof SyntaxError ? 'Invalid request' : error instanceof Error && !/fetch|abort|signal/i.test(error.message) ? error.message : '翻译服务连接超时或网络异常；原文已保留，可以稍后重试。' }, 502);
  }
});
