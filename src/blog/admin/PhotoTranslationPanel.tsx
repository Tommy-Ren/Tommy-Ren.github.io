import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Languages } from 'lucide-react';
import { translatePhoto, type BlogPhotoRecord, type PhotoTranslationRecord } from '../backend';

export default function PhotoTranslationPanel({ client, photo, disabled, onBusy }: {
  client: SupabaseClient; photo?: BlogPhotoRecord; disabled: boolean; onBusy: (busy: boolean) => void;
}) {
  const [translation, setTranslation] = useState<PhotoTranslationRecord | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const target = photo?.source_language === 'en' ? 'zh' : 'en';
  useEffect(() => {
    let active = true;
    setTranslation(null); setMessage(''); setLoading(Boolean(photo));
    if (!photo) return;
    void client.from('blog_photo_translations').select('*').eq('photo_id', photo.id).eq('locale', target).maybeSingle()
      .then(({ data, error }) => { if (active) { setTranslation(data); setLoading(false); if (error) setMessage('无法读取照片译文，请重试。'); } });
    return () => { active = false; };
  }, [client, photo, target, attempt]);
  const current = Boolean(translation && translation.source_version === photo?.content_version);
  const generate = async () => {
    if (!photo) return;
    setBusy(true); onBusy(true); setMessage('');
    try { await translatePhoto(client, photo.id, current); setAttempt(value => value + 1); }
    catch (error) { setMessage(error instanceof Error ? error.message : '翻译未完成，请重试。'); }
    finally { setBusy(false); onBusy(false); }
  };
  return <section className="admin-translations" aria-label="照片翻译">
    <div className="admin-panel-title"><h3><Languages size={18} />照片双语说明</h3><span className="admin-muted">{target === 'en' ? '中文 → English' : 'English → 中文'}</span></div>
    <p className="admin-muted">{!photo ? '先保存照片，再生成另一种语言。' : loading ? '正在读取译文…' : current ? '标题与说明已就绪，切换语言即可查看。' : '照片说明还没有最新译文。'}</p>
    <button className="blog-button blog-outline-button" disabled={!photo || disabled || busy || loading} onClick={() => void generate()}>{busy ? '正在通过 DeepL 翻译…' : current ? '重新生成照片译文' : '生成照片译文'}</button>
    {message && <p className="admin-notice error" role="alert">{message}</p>}
    {current && translation && <details><summary>预览{target === 'en' ? '英文' : '中文'}译文 · DeepL</summary><div lang={target === 'en' ? 'en' : 'zh-CN'}><h4>{translation.title}</h4><p>{translation.caption}</p></div></details>}
  </section>;
}
