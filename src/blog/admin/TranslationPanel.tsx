import { useStudioLocale } from './useStudioLocale';
import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Languages } from 'lucide-react';
import { translateArticle, type BlogPostRecord, type BlogTranslationRecord } from '../backend';
import { renderMarkdown } from '../markdown.mjs';

export default function TranslationPanel({ client, post, disabled, onBusy }: {
  client: SupabaseClient; post?: BlogPostRecord; disabled: boolean; onBusy: (busy: boolean) => void;
}) {
  const { t } = useStudioLocale();
  const [translation, setTranslation] = useState<BlogTranslationRecord | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  const target = post?.source_language === 'en' ? 'zh' : 'en';
  useEffect(() => {
    let active = true;
    setTranslation(null); setMessage('');
    if (!post) return;
    setLoading(true);
    void client.from('blog_post_translations').select('*').eq('post_id', post.id).eq('locale', target).maybeSingle()
      .then(({ data, error }) => { if (active) { setTranslation(data); setLoading(false); if (error) setMessage(t("无法读取译文，请检查数据库连接与翻译迁移脚本。")); } });
    return () => { active = false; };
  }, [client, post, target, attempt]);
  const current = translation?.source_version === post?.content_version && Boolean(translation);
  const generate = async () => {
    if (!post) return;
    setBusy(true); onBusy(true); setMessage('');
    try { await translateArticle(client, post.id, current); setAttempt(value => value + 1); }
    catch (error) { setMessage(error instanceof Error ? error.message : t("翻译未完成，请重试。")); }
    finally { setBusy(false); onBusy(false); }
  };
  return <section className="admin-translations" aria-label={t("文章翻译")}>
    <div className="admin-panel-title"><h3><Languages size={18} />{t("中英双语")}</h3><span className="admin-muted">{target === 'en' ? t("中文 → English") : t("English → 中文")}</span></div>
    <p className="admin-muted">{!post ? t("先保存原文，再生成另一种语言。") : loading ? t("正在读取译文…") : current ? t("译文已就绪，读者切换语言即可阅读。") : translation ? t("原文已更新，需要重新生成译文。") : t("这篇文章还没有译文。")}</p>
    <button className="blog-button blog-outline-button" disabled={!post || disabled || busy || loading} onClick={() => void generate()}>{busy ? t("正在通过 DeepL 翻译…") : current ? t("重新生成译文") : t("生成 / 更新译文")}</button>
    {message && <p className="admin-notice error" role="alert">{t(message)}</p>}
    {current && translation && <details><summary>{t("预览")} {target === 'en' ? t("英文") : t("中文")}{t("译文 ·")}{translation.provider === 'deepl' ? 'DeepL' : t("已整理的译文")}</summary>
      <h4>{translation.title}</h4><p>{translation.summary}</p><p className="admin-muted">{translation.category} · {translation.tags.join(' / ')}</p>
      <div className="blog-prose" lang={target === 'zh' ? 'zh-CN' : 'en'} dangerouslySetInnerHTML={{ __html: renderMarkdown(translation.markdown || '').html }} />
    </details>}
  </section>;
}
