import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { ArrowUpRight, Check, Download, Loader2 } from 'lucide-react';
import { importStarterContent, type ImportCounts } from './import-starter.mjs';
import bundle from './starter-content.json';

export default function StarterPanel({ client, user, onBusy }: { client: SupabaseClient; user: User; onBusy: (dirty: boolean, busy: boolean) => void }) {
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState(''), [error, setError] = useState('');
  const [result, setResult] = useState<ImportCounts | null>(null);
  const running = useRef(false);
  useEffect(() => { onBusy(false, busy); return () => onBusy(false, false); }, [busy, onBusy]);
  const start = async () => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(''); setResult(null); setProgress('正在验证管理员权限…');
    try { setResult(await importStarterContent(client, user.id, bundle, setProgress)); }
    catch (cause) { setError(cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : '导入未完成，请检查网络后重试。'); }
    finally { running.current = false; setBusy(false); setProgress(''); }
  };
  return <section className="blog-card admin-editor admin-starter">
    <span className="blog-eyebrow">A LITTLE INSPIRATION / STARTER COLLECTION</span>
    <h2>先让这里，热闹起来。</h2>
    <p className="admin-muted">恢复开篇文章与模板配图，给接下来的创作一个起点。导入后可在文章、相册和收集中继续编辑。</p>
    <div className="admin-starter-stats"><span><strong>{bundle.posts.length}</strong> 篇开篇文章</span><span><strong>{bundle.photos.length}</strong> 张相册配图</span><span><strong>{bundle.links.length}</strong> 个收藏链接</span></div>
    <div className="admin-starter-photos">{bundle.photos.map(photo => <figure key={photo.id}><img src={photo.image_url} alt={photo.title} width="300" height="200" loading="lazy" /><figcaption>{photo.title}</figcaption></figure>)}</div>
    <ul className="admin-starter-posts">{bundle.posts.map(post => <li key={post.slug}><span>{post.category}</span><strong>{post.title}</strong></li>)}</ul>
    <p className="admin-starter-note">文章为可改写的初始化示例。配图来自 momo-blog 的 Unsplash 示例素材，保留来源，不标为个人摄影。图片将上传至公开图库，文章、相册与收藏导入后直接展示；已有记录与站点介绍保持不变。</p>
    {error && <div className="admin-notice error" role="alert"><span>{error}<br />已完成的内容会保留，再次导入会跳过已有记录。</span></div>}
    {busy && <p className="admin-notice info" role="status"><Loader2 size={16} className="admin-spinner" />{progress}</p>}
    {result && <div className="admin-notice success" role="status"><Check size={17} /><span>导入完成：新增 {result.posts} 篇文章、{result.photos} 张照片、{result.links} 个链接。上传 {result.uploaded} 张图片，跳过 {result.skipped} 条已有记录。</span></div>}
    <div className="admin-editor-actions"><button className="blog-button" disabled={busy} onClick={() => void start()}>{busy ? <Loader2 size={16} className="admin-spinner" /> : <Download size={16} />}{busy ? '正在导入…' : result ? '再次检查并补齐' : '导入并展示模板内容'}</button><a href="/blog/home/" target="_blank" rel="noopener noreferrer" className="admin-text-button">查看博客<ArrowUpRight size={16} /></a></div>
  </section>;
}
