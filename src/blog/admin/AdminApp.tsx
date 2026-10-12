import { createContext, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { ArrowLeft, ArrowUpRight, BookOpen, Check, ChevronRight, Copy, ExternalLink, FileText, Image, Link2, Loader2, LogOut, Plus, Save, Settings, ShieldCheck, Trash2, Upload, X } from 'lucide-react';
import { getBlogClient, getBackendProblem, getReadingMinutes, validatePostInput, type BlogPostRecord, type BlogPhotoRecord, type BlogLinkRecord, type BlogSettingsRecord } from '../backend';
import { renderMarkdown } from '../markdown.mjs';
import StarterPanel from './StarterPanel';
import './admin.css';

type Tab = 'posts' | 'photos' | 'links' | 'settings' | 'starter';
type Dialog = { title: string; description: string; action: () => void; confirmLabel?: string; destructive?: boolean };
type Guard = { dirty: boolean; busy: boolean; register: (dirty: boolean, busy: boolean) => void; leave: (action: () => void) => void; confirm: (dialog: Dialog) => void };
const GuardContext = createContext<Guard | null>(null);
const tabs: { id: Tab; title: string; description: string; icon: typeof FileText }[] = [
  { id: 'posts', title: '文章', description: '草稿与发布', icon: FileText },
  { id: 'photos', title: '相册', description: '画面与故事', icon: Image },
  { id: 'links', title: '收集', description: '值得留下的链接', icon: Link2 },
  { id: 'settings', title: '站点设置', description: '介绍与联系方式', icon: Settings },
  { id: 'starter', title: '模板内容', description: '导入开篇与配图', icon: Copy },
];
function todayInVancouver() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}
const emptyPost = (): PostDraft => ({ slug: '', title: '', summary: '', markdown: '', category: '随笔', tagsText: '', cover: '', published: false, published_on: todayInVancouver() });
const emptyPhoto = (): PhotoDraft => ({ title: '', caption: '', image_url: '', source_url: '', credit: '', is_own: true, published: false, sort_order: 0 });
const emptyLink = (): LinkDraft => ({ title: '', kind: 'LEARNING / RESOURCE', description: '', href: '', symbol: '↗', color: 'lavender', published: false, sort_order: 0 });
const errorMessage = (error: unknown) => error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '操作未完成，请稍后重试。';
const reportError = (error: unknown) => { const message = errorMessage(error); return /Failed to fetch|NetworkError|Load failed/i.test(message) ? '无法连接 Supabase，请检查网络和项目地址。' : message; };
const safeUrl = (value: string, field: string, optional = false, allowRelative = false) => {
  const trimmed = value.trim();
  if (!trimmed && optional) return '';
  if (trimmed.length > 2048 || /[\u0000-\u0020\u007f\\<>]/.test(trimmed)) throw new Error(field + '不能超过 2,048 个字符，且不能包含空白或控制字符。');
  if (allowRelative && /^\/(?!\/)/.test(trimmed)) { try { if (!decodeURIComponent(trimmed).split('/').includes('..')) return trimmed; } catch { /* Invalid URL below. */ } }
  try { const url = new URL(trimmed); if (url.protocol === 'https:' && !url.username && !url.password) return url.href; } catch { /* Validation below gives a field-specific message. */ }
  throw new Error(field + '请使用完整的 HTTPS 地址' + (allowRelative ? '，或本站以 / 开头的资源路径。' : '。'));
};

function Spinner({ children = '正在加载…' }: { children?: ReactNode }) { return <span className="admin-loading"><Loader2 size={17} className="admin-spinner" aria-hidden="true" />{children}</span>; }
function Notice({ message, kind = 'error' }: { message: string; kind?: 'error' | 'success' | 'info' }) { return <div className={'admin-notice ' + kind} role={kind === 'error' ? 'alert' : 'status'}>{kind === 'success' && <Check size={16} aria-hidden="true" />}<span>{message}</span></div>; }
function Field({ label, children, hint, wide = false }: { label: string; children: ReactNode; hint?: string; wide?: boolean }) { return <label className={'admin-field' + (wide ? ' admin-field-wide' : '')}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
function Confirmation({ dialog, close }: { dialog: Dialog; close: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(box.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [close]);
  return <div className="admin-dialog-shade"><div className="blog-card admin-dialog" ref={box} role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title" aria-describedby="admin-dialog-description"><h2 id="admin-dialog-title">{dialog.title}</h2><p id="admin-dialog-description">{dialog.description}</p><div className="admin-dialog-actions"><button className="blog-button blog-outline-button" onClick={close}>继续编辑</button><button className={'blog-button' + (dialog.destructive ? ' admin-danger-button' : '')} onClick={() => { close(); dialog.action(); }}>{dialog.confirmLabel || '放弃修改并继续'}</button></div></div></div>;
}

function useEditor<T>(makeEmpty: () => T) {
  const guard = useContext(GuardContext)!;
  const initial = useRef(makeEmpty());
  const [draft, setDraft] = useState(initial.current);
  const [baseline, setBaseline] = useState(JSON.stringify(initial.current));
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dirty = JSON.stringify(draft) !== baseline;
  useEffect(() => { guard.register(dirty, busy); }, [dirty, busy, guard.register]);
  useEffect(() => () => guard.register(false, false), [guard.register]);
  const replace = (value: T, id: string | null) => { setDraft(value); setBaseline(JSON.stringify(value)); setSelected(id); setError(''); setSuccess(''); };
  const change = (value: Partial<T>) => { setDraft((previous) => ({ ...previous, ...value })); setSuccess(''); };
  return { draft, selected, busy, setBusy, error, setError, success, setSuccess, dirty, change, replace, guard };
}

function ImageUpload({ client, user, onUploaded, disabled, onBusy }: { client: SupabaseClient; user: User; onUploaded: (url: string) => void; disabled?: boolean; onBusy: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const extensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' };
  const upload = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!extensions[file.type]) { setError('仅支持 PNG、JPEG、WebP、AVIF 或 GIF 图片，不支持 SVG。'); return; }
    if (file.size > 5 * 1024 * 1024 || file.size === 0) { setError('请选择不超过 5 MB 的有效图片。'); return; }
    setBusy(true); onBusy(true);
    try {
      const path = user.id + '/' + crypto.randomUUID() + '.' + extensions[file.type];
      const { error: uploadError } = await client.storage.from('blog-media').upload(path, file, { contentType: file.type, upsert: false, cacheControl: '3600' });
      if (uploadError) throw uploadError;
      const { data } = client.storage.from('blog-media').getPublicUrl(path);
      onUploaded(data.publicUrl);
    } catch (cause) { setError(reportError(cause)); }
    finally { setBusy(false); onBusy(false); if (input.current) input.current.value = ''; }
  };
  return <div className="admin-image-upload"><input ref={input} className="admin-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif" aria-label="上传公开图片" disabled={disabled || busy} onChange={(event) => void upload(event.target.files?.[0])} /><button type="button" className="blog-button blog-outline-button" onClick={() => input.current?.click()} disabled={disabled || busy}>{busy ? <Spinner>上传中</Spinner> : <><Upload size={15} />上传图片</>}</button><small>PNG / JPEG / WebP / AVIF / GIF · ≤ 5 MB · 上传后公开可访问</small>{error && <Notice message={error} />}</div>;
}

type PostDraft = Pick<BlogPostRecord, 'slug' | 'title' | 'summary' | 'markdown' | 'category' | 'cover' | 'published' | 'published_on'> & { tagsText: string };
const postDraft = (post: BlogPostRecord): PostDraft => ({ slug: post.slug, title: post.title, summary: post.summary, markdown: post.markdown, category: post.category, cover: post.cover, published: post.published, published_on: post.published_on, tagsText: post.tags.join(', ') });
function PostsPanel({ client, user }: { client: SupabaseClient; user: User }) {
  const [records, setRecords] = useState<BlogPostRecord[]>([]), [loading, setLoading] = useState(true), [listError, setListError] = useState(''), [preview, setPreview] = useState(false);
  const editor = useEditor(emptyPost);
  const { draft, selected, busy, dirty, change, guard } = editor;
  const reload = async () => { setLoading(true); setListError(''); try { const { data, error } = await client.from('blog_posts').select('*').order('updated_at', { ascending: false }); if (error) throw error; setRecords((data ?? []) as BlogPostRecord[]); } catch (cause) { setListError(reportError(cause)); } finally { setLoading(false); } };
  useEffect(() => { void reload(); }, [client]);
  const previewHtml = useMemo(() => renderMarkdown(draft.markdown).html, [draft.markdown]);
  const save = async (published: boolean) => {
    editor.setError(''); editor.setSuccess('');
    try {
      const title = draft.title.trim(), slug = draft.slug.trim(), summary = draft.summary.trim(), category = draft.category.trim();
      if (!title || title.length > 160) throw new Error('文章标题不能为空，且不能超过 160 个字符。');
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) throw new Error('文章路径请使用小写英文、数字和单个连字符，例如 my-first-post。');
      if (summary.length > 400) throw new Error('摘要不能超过 400 个字符。');
      if (!category || category.length > 60) throw new Error('请填写不超过 60 个字符的分类。');
      if ((published && !draft.markdown.trim()) || draft.markdown.length > 200000) throw new Error('发布文章时正文不能为空，且正文不能超过 200,000 个字符。');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.published_on) || draft.published_on < '1900-01-01' || Number.isNaN(Date.parse(draft.published_on)) || new Date(draft.published_on).toISOString().slice(0, 10) !== draft.published_on) throw new Error('请选择 1900 年以后的有效发布日期。');
      const tags = [...new Set(draft.tagsText.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))];
      if (tags.length > 12 || tags.some((tag) => tag.length > 40)) throw new Error('最多添加 12 个标签，每个标签不超过 40 个字符。');
      const payload = { title, slug, summary, category, markdown: draft.markdown, tags, cover: safeUrl(draft.cover, '封面', true, true), published, published_on: draft.published_on, reading_minutes: getReadingMinutes(draft.markdown) };
      const validation = validatePostInput(payload); if (validation) throw new Error(validation);
      editor.setBusy(true);
      const response = selected ? await client.from('blog_posts').update(payload).eq('id', selected).select().single() : await client.from('blog_posts').insert(payload).select().single();
      if (response.error) throw response.error;
      const record = response.data as BlogPostRecord;
      editor.replace(postDraft(record), record.id); editor.setSuccess(published ? '文章已发布，博客中可以阅读。' : '已保存为草稿，仅管理员可见。');
      await reload();
    } catch (cause) { editor.setError(reportError(cause)); } finally { editor.setBusy(false); }
  };
  const remove = () => { if (!selected) return; guard.confirm({ title: '删除这篇文章？', description: '「' + (draft.title || '未命名文章') + '」及正文将从数据库永久删除。已上传的图片会保留。', confirmLabel: '确认删除', destructive: true, action: () => { void (async () => { editor.setBusy(true); editor.setError(''); try { const { error } = await client.from('blog_posts').delete().eq('id', selected); if (error) throw error; editor.replace(emptyPost(), null); editor.setSuccess('文章已删除。'); await reload(); } catch (cause) { editor.setError(reportError(cause)); } finally { editor.setBusy(false); } })(); } }); };
  const copyCover = async () => { try { await navigator.clipboard.writeText(draft.cover); editor.setSuccess('封面地址已复制。'); } catch { editor.setError('复制失败，请手动复制封面地址。'); } };
  return <div className="admin-editor-layout"><section className="blog-card admin-records"><div className="admin-panel-title"><h2>所有文章</h2><button className="admin-icon-button" aria-label="新建文章" onClick={() => guard.leave(() => { editor.replace(emptyPost(), null); setPreview(false); })}><Plus size={18} /></button></div><p className="admin-muted">{records.length} 篇 · 发布与草稿一起管理</p>{loading ? <Spinner /> : listError ? <><Notice message={listError} /><button className="admin-text-button" onClick={() => void reload()}>重新加载</button></> : records.length ? <div className="admin-record-list">{records.map((post) => <button key={post.id} className={selected === post.id ? 'selected' : ''} onClick={() => guard.leave(() => { editor.replace(postDraft(post), post.id); setPreview(false); })}><span className={'admin-status-dot ' + (post.published ? 'published' : '')} /><span><strong>{post.title}</strong><small>{post.published ? '已发布' : '草稿'} · {post.published_on}</small></span><ChevronRight size={14} /></button>)}</div> : <div className="admin-small-empty"><BookOpen size={27} /><p>从第一篇草稿开始。</p></div>}</section><section className="blog-card admin-editor"><div className="admin-editor-heading"><div><span className="blog-eyebrow">WORDS / EDITOR</span><h2>{selected ? '编辑文章' : '新建文章'}</h2></div><span className={'admin-save-state' + (dirty ? ' changed' : '')}>{dirty ? '有未保存的修改' : selected ? '修改已保存' : '新文章默认草稿'}</span></div>{editor.error && <Notice message={editor.error} />}{editor.success && <Notice message={editor.success} kind="success" />}<fieldset disabled={busy}><div className="admin-form-grid"><Field label="文章标题" wide><input value={draft.title} maxLength={160} placeholder="一个值得写下的想法" onChange={(event) => change({ title: event.target.value })} /></Field><Field label="文章路径" hint="小写英文、数字和连字符；发布后修改会改变链接。"><div className="admin-slug-field"><span>/blog/articles/?post=</span><input value={draft.slug} maxLength={100} placeholder="my-first-post" onChange={(event) => change({ slug: event.target.value })} /></div></Field><Field label="发布日期"><input type="date" min="1900-01-01" max="9999-12-31" value={draft.published_on} onChange={(event) => change({ published_on: event.target.value })} /></Field><Field label="摘要" wide><textarea rows={2} value={draft.summary} maxLength={400} placeholder="给这篇文字一个简短的介绍…" onChange={(event) => change({ summary: event.target.value })} /></Field><Field label="分类"><input value={draft.category} maxLength={60} onChange={(event) => change({ category: event.target.value })} /></Field><Field label="标签" hint="多个标签用逗号分隔。"><input value={draft.tagsText} placeholder="React, 学习笔记" onChange={(event) => change({ tagsText: event.target.value })} /></Field><Field label="封面地址" wide hint="可用 HTTPS 图片地址或本站资源路径；上传后自动填入。"><input value={draft.cover} type="text" placeholder="https://… 或 /blog/assets/…" onChange={(event) => change({ cover: event.target.value })} /></Field></div><ImageUpload client={client} user={user} onUploaded={(url) => change({ cover: url })} disabled={busy} onBusy={editor.setBusy} />{draft.cover && <div className="admin-cover-tools"><img src={draft.cover} alt="封面预览" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} onLoad={(event) => { event.currentTarget.style.visibility = 'visible'; }} /><button type="button" className="admin-text-button" onClick={() => void copyCover()}><Copy size={14} />复制图片地址</button></div>}<div className="admin-markdown-toolbar"><label htmlFor="admin-markdown">正文 · Markdown</label><div><button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}>编辑</button><button type="button" aria-pressed={preview} onClick={() => setPreview(true)}>预览</button></div></div>{preview ? <div className="admin-markdown-preview blog-prose" aria-label="Markdown 预览" dangerouslySetInnerHTML={{ __html: previewHtml || '<p>写下一点内容后，在这里预览。</p>' }} /> : <textarea id="admin-markdown" className="admin-markdown" value={draft.markdown} maxLength={200000} spellCheck={false} placeholder={'## 从一个想法开始\n\n写下你的第一段文字…'} onChange={(event) => change({ markdown: event.target.value })} />}<p className="admin-form-note">正文支持标题、列表、代码块和图片。HTML 标签会作为文本处理。</p></fieldset><div className="admin-editor-actions"><button className="blog-button blog-outline-button" disabled={busy} onClick={() => void save(draft.published)}>{busy ? <Spinner>保存中</Spinner> : <><Save size={15} />{draft.published ? '保存修改' : '保存草稿'}</>}</button><button className="blog-button" disabled={busy} onClick={() => void save(!draft.published)}>{draft.published ? '撤回为草稿' : '发布文章'}<ArrowUpRight size={15} /></button>{selected && <button className="admin-delete" disabled={busy} onClick={remove}><Trash2 size={15} />删除文章</button>}</div>{selected && draft.published && <a className="admin-text-button" href={'/blog/articles/?post=' + encodeURIComponent(records.find((post) => post.id === selected)?.slug || draft.slug)} target="_blank" rel="noopener noreferrer">查看已发布文章<ExternalLink size={14} /></a>}</section></div>;
}

type PhotoDraft = Pick<BlogPhotoRecord, 'title' | 'caption' | 'image_url' | 'credit' | 'is_own' | 'published' | 'sort_order'> & { source_url: string };
const photoDraft = (photo: BlogPhotoRecord): PhotoDraft => ({ title: photo.title, caption: photo.caption, image_url: photo.image_url, source_url: photo.source_url || '', credit: photo.credit, is_own: photo.is_own, published: photo.published, sort_order: photo.sort_order });
function PhotosPanel({ client, user }: { client: SupabaseClient; user: User }) {
  const [records, setRecords] = useState<BlogPhotoRecord[]>([]), [loading, setLoading] = useState(true), [listError, setListError] = useState('');
  const editor = useEditor(emptyPhoto), { draft, busy, dirty, selected, change, guard } = editor;
  const reload = async () => { setLoading(true); setListError(''); try { const { data, error } = await client.from('blog_photos').select('*').order('sort_order').order('created_at', { ascending: false }); if (error) throw error; setRecords((data ?? []) as BlogPhotoRecord[]); } catch (cause) { setListError(reportError(cause)); } finally { setLoading(false); } };
  useEffect(() => { void reload(); }, [client]);
  const save = async (published: boolean) => {
    editor.setError(''); editor.setSuccess('');
    try {
      if (!draft.title.trim() || draft.title.trim().length > 160) throw new Error('请输入不超过 160 个字符的照片标题。');
      if (draft.caption.length > 2000 || draft.credit.length > 300 || /[\u0000-\u001f\u007f]/.test(draft.credit)) throw new Error('照片说明最多 2,000 字，署名最多 300 字且不含控制字符。');
      if (!Number.isInteger(draft.sort_order) || draft.sort_order < 0 || draft.sort_order > 1000000) throw new Error('排序必须是 0 到 1,000,000 之间的整数。');
      const payload = { ...draft, title: draft.title.trim(), caption: draft.caption.trim(), credit: draft.credit.trim(), image_url: safeUrl(draft.image_url, '照片地址', false, true), source_url: safeUrl(draft.source_url, '来源链接', true) || null, published };
      editor.setBusy(true);
      const response = selected ? await client.from('blog_photos').update(payload).eq('id', selected).select().single() : await client.from('blog_photos').insert(payload).select().single();
      if (response.error) throw response.error;
      const record = response.data as BlogPhotoRecord; editor.replace(photoDraft(record), record.id); editor.setSuccess(published ? '照片已公开展示。' : '照片已保存，尚未公开。'); await reload();
    } catch (cause) { editor.setError(reportError(cause)); } finally { editor.setBusy(false); }
  };
  const remove = () => { if (!selected) return; guard.confirm({ title: '删除这张照片记录？', description: '数据库中的照片信息将永久删除。Storage 中的图片文件会保留，其他文章仍可引用。', confirmLabel: '确认删除', destructive: true, action: () => { void (async () => { editor.setBusy(true); try { const { error } = await client.from('blog_photos').delete().eq('id', selected); if (error) throw error; editor.replace(emptyPhoto(), null); editor.setSuccess('照片记录已删除。'); await reload(); } catch (cause) { editor.setError(reportError(cause)); } finally { editor.setBusy(false); } })(); } }); };
  return <div className="admin-editor-layout"><section className="blog-card admin-records"><div className="admin-panel-title"><h2>相册</h2><button className="admin-icon-button" aria-label="添加照片" onClick={() => guard.leave(() => editor.replace(emptyPhoto(), null))}><Plus size={18} /></button></div><p className="admin-muted">{records.length} 张 · 数字小的优先展示</p>{loading ? <Spinner /> : listError ? <><Notice message={listError} /><button className="admin-text-button" onClick={() => void reload()}>重新加载</button></> : records.length ? <div className="admin-record-list">{records.map((photo) => <button key={photo.id} className={selected === photo.id ? 'selected' : ''} onClick={() => guard.leave(() => editor.replace(photoDraft(photo), photo.id))}><span className={'admin-status-dot ' + (photo.published ? 'published' : '')} /><span><strong>{photo.title}</strong><small>{photo.published ? '公开' : '未公开'} · {photo.is_own ? '自己的照片' : '来源素材'}</small></span><ChevronRight size={14} /></button>)}</div> : <div className="admin-small-empty"><Image size={27} /><p>留下第一张喜欢的画面。</p></div>}</section><section className="blog-card admin-editor"><div className="admin-editor-heading"><div><span className="blog-eyebrow">A LITTLE MOMENT / PHOTOS</span><h2>{selected ? '编辑照片' : '添加照片'}</h2></div><span className={'admin-save-state' + (dirty ? ' changed' : '')}>{dirty ? '有未保存的修改' : '照片默认不公开'}</span></div>{editor.error && <Notice message={editor.error} />}{editor.success && <Notice message={editor.success} kind="success" />}<fieldset disabled={busy}><div className="admin-form-grid"><Field label="照片标题" wide><input value={draft.title} maxLength={160} placeholder="这一刻，值得留下" onChange={(event) => change({ title: event.target.value })} /></Field><Field label="照片说明" wide><textarea value={draft.caption} maxLength={2000} rows={3} onChange={(event) => change({ caption: event.target.value })} /></Field><Field label="照片地址" wide><input value={draft.image_url} placeholder="上传图片，或粘贴 HTTPS 图片地址" onChange={(event) => change({ image_url: event.target.value })} /></Field></div><ImageUpload client={client} user={user} onUploaded={(url) => change({ image_url: url })} disabled={busy} onBusy={editor.setBusy} />{draft.image_url && <img className="admin-photo-preview" src={draft.image_url} alt="照片预览" />}<div className="admin-form-grid"><Field label="来源链接" wide hint="引用他人素材时，请填写来源并保留署名。"><input type="url" value={draft.source_url} placeholder="https://…" onChange={(event) => change({ source_url: event.target.value })} /></Field><Field label="摄影 / 素材署名"><input value={draft.credit} maxLength={300} placeholder="Tommy Ren" onChange={(event) => change({ credit: event.target.value })} /></Field><Field label="排序"><input type="number" step="1" min="0" max="1000000" value={draft.sort_order} onChange={(event) => change({ sort_order: Number(event.target.value) })} /></Field></div><label className="admin-checkbox"><input type="checkbox" checked={draft.is_own} onChange={(event) => change({ is_own: event.target.checked })} /><span>这是我自己的照片</span></label></fieldset><div className="admin-editor-actions"><button className="blog-button blog-outline-button" disabled={busy} onClick={() => void save(draft.published)}><Save size={15} />{busy ? '保存中…' : '保存照片'}</button><button className="blog-button" disabled={busy} onClick={() => void save(!draft.published)}>{draft.published ? '取消公开' : '公开展示'}<ArrowUpRight size={15} /></button>{selected && <button className="admin-delete" disabled={busy} onClick={remove}><Trash2 size={15} />删除记录</button>}</div></section></div>;
}

type LinkDraft = Pick<BlogLinkRecord, 'title' | 'kind' | 'description' | 'href' | 'symbol' | 'color' | 'published' | 'sort_order'>;
const linkDraft = (link: BlogLinkRecord): LinkDraft => ({ title: link.title, kind: link.kind, description: link.description, href: link.href, symbol: link.symbol, color: link.color, published: link.published, sort_order: link.sort_order });
function LinksPanel({ client }: { client: SupabaseClient }) {
  const [records, setRecords] = useState<BlogLinkRecord[]>([]), [loading, setLoading] = useState(true), [listError, setListError] = useState('');
  const editor = useEditor(emptyLink), { draft, busy, selected, dirty, change, guard } = editor;
  const reload = async () => { setLoading(true); setListError(''); try { const { data, error } = await client.from('blog_links').select('*').order('sort_order').order('created_at', { ascending: false }); if (error) throw error; setRecords((data ?? []) as BlogLinkRecord[]); } catch (cause) { setListError(reportError(cause)); } finally { setLoading(false); } };
  useEffect(() => { void reload(); }, [client]);
  const save = async (published: boolean) => {
    editor.setError(''); editor.setSuccess('');
    try {
      if (!draft.title.trim() || draft.title.length > 160) throw new Error('请填写不超过 160 个字符的链接标题。');
      if (!draft.kind.trim() || draft.kind.length > 80 || draft.description.length > 2000 || !draft.symbol.trim() || draft.symbol.length > 12 || /[\u0000-\u001f\u007f]/.test(draft.title + draft.kind + draft.symbol)) throw new Error('分类最多 80 字、描述最多 2,000 字，卡片符号为 1 到 12 字；标题、分类和符号不能包含控制字符。');
      if (!Number.isInteger(draft.sort_order) || draft.sort_order < 0 || draft.sort_order > 1000000) throw new Error('排序必须是 0 到 1,000,000 之间的整数。');
      const payload = { ...draft, title: draft.title.trim(), kind: draft.kind.trim(), description: draft.description.trim(), symbol: draft.symbol.trim(), href: safeUrl(draft.href, '链接'), published };
      editor.setBusy(true);
      const response = selected ? await client.from('blog_links').update(payload).eq('id', selected).select().single() : await client.from('blog_links').insert(payload).select().single();
      if (response.error) throw response.error;
      const record = response.data as BlogLinkRecord; editor.replace(linkDraft(record), record.id); editor.setSuccess(published ? '链接已公开展示。' : '链接已保存，尚未公开。'); await reload();
    } catch (cause) { editor.setError(reportError(cause)); } finally { editor.setBusy(false); }
  };
  const remove = () => { if (!selected) return; guard.confirm({ title: '删除这个收集链接？', description: '「' + draft.title + '」会从数据库永久删除。', confirmLabel: '确认删除', destructive: true, action: () => { void (async () => { editor.setBusy(true); try { const { error } = await client.from('blog_links').delete().eq('id', selected); if (error) throw error; editor.replace(emptyLink(), null); editor.setSuccess('链接已删除。'); await reload(); } catch (cause) { editor.setError(reportError(cause)); } finally { editor.setBusy(false); } })(); } }); };
  return <div className="admin-editor-layout"><section className="blog-card admin-records"><div className="admin-panel-title"><h2>收集的链接</h2><button className="admin-icon-button" aria-label="添加链接" onClick={() => guard.leave(() => editor.replace(emptyLink(), null))}><Plus size={18} /></button></div><p className="admin-muted">{records.length} 个 · 留给好奇心的书签</p>{loading ? <Spinner /> : listError ? <><Notice message={listError} /><button className="admin-text-button" onClick={() => void reload()}>重新加载</button></> : records.length ? <div className="admin-record-list">{records.map((link) => <button key={link.id} className={selected === link.id ? 'selected' : ''} onClick={() => guard.leave(() => editor.replace(linkDraft(link), link.id))}><span className={'admin-status-dot ' + (link.published ? 'published' : '')} /><span><strong>{link.title}</strong><small>{link.published ? '公开' : '未公开'} · {link.kind}</small></span><ChevronRight size={14} /></button>)}</div> : <div className="admin-small-empty"><Link2 size={27} /><p>把一个好链接留下来。</p></div>}</section><section className="blog-card admin-editor"><div className="admin-editor-heading"><div><span className="blog-eyebrow">KEEP EXPLORING / LINKS</span><h2>{selected ? '编辑链接' : '添加链接'}</h2></div><span className={'admin-save-state' + (dirty ? ' changed' : '')}>{dirty ? '有未保存的修改' : '链接默认不公开'}</span></div>{editor.error && <Notice message={editor.error} />}{editor.success && <Notice message={editor.success} kind="success" />}<fieldset disabled={busy}><div className="admin-form-grid"><Field label="链接标题" wide><input value={draft.title} maxLength={160} onChange={(event) => change({ title: event.target.value })} /></Field><Field label="链接地址" wide><input type="url" value={draft.href} placeholder="https://…" onChange={(event) => change({ href: event.target.value })} /></Field><Field label="分类"><input value={draft.kind} maxLength={80} placeholder="WEB / DOCUMENTATION" onChange={(event) => change({ kind: event.target.value })} /></Field><Field label="卡片符号"><input value={draft.symbol} maxLength={12} placeholder="M、3、>_…" onChange={(event) => change({ symbol: event.target.value })} /></Field><Field label="介绍" wide><textarea value={draft.description} rows={4} maxLength={2000} onChange={(event) => change({ description: event.target.value })} /></Field><Field label="卡片颜色"><select value={draft.color} onChange={(event) => change({ color: event.target.value as LinkDraft['color'] })}><option value="lavender">薰衣草紫</option><option value="lime">青柠绿</option><option value="blue">天空蓝</option><option value="peach">蜜桃色</option></select></Field><Field label="排序"><input type="number" step="1" min="0" max="1000000" value={draft.sort_order} onChange={(event) => change({ sort_order: Number(event.target.value) })} /></Field></div><div className={'admin-link-preview ' + draft.color}><span>{draft.kind || 'LEARNING / RESOURCE'}</span><strong>{draft.symbol || '↗'}</strong><div>{draft.title || '卡片标题'}<ArrowUpRight size={20} /></div></div></fieldset><div className="admin-editor-actions"><button className="blog-button blog-outline-button" disabled={busy} onClick={() => void save(draft.published)}><Save size={15} />{busy ? '保存中…' : '保存链接'}</button><button className="blog-button" disabled={busy} onClick={() => void save(!draft.published)}>{draft.published ? '取消公开' : '公开展示'}<ArrowUpRight size={15} /></button>{selected && <button className="admin-delete" disabled={busy} onClick={remove}><Trash2 size={15} />删除链接</button>}</div></section></div>;
}

type SettingsDraft = Omit<BlogSettingsRecord, 'id' | 'updated_at'>;
const emptySettings = (): SettingsDraft => ({ display_name: '', home_title: '', home_intro: '', about_title: '', about_bio: '', contact_email: '', github_url: '', linkedin_url: '' });
function SettingsPanel({ client }: { client: SupabaseClient }) {
  const editor = useEditor(emptySettings), { draft, busy, dirty, change } = editor;
  const [loading, setLoading] = useState(true), [loaded, setLoaded] = useState(false);
  const reload = async () => { setLoading(true); editor.setError(''); try { const { data, error } = await client.from('blog_settings').select('*').eq('id', 'main').single(); if (error) throw error; const { id, updated_at, ...settings } = data as BlogSettingsRecord; void id; void updated_at; editor.replace(settings, 'main'); setLoaded(true); } catch (cause) { editor.setError(reportError(cause)); } finally { setLoading(false); } };
  useEffect(() => { void reload(); }, [client]);
  const save = async (event: FormEvent) => {
    event.preventDefault(); editor.setError(''); editor.setSuccess('');
    try {
      for (const [value, title, limit] of [[draft.display_name, '显示名称', 80], [draft.home_title, '首页标题', 160], [draft.home_intro, '首页介绍', 600], [draft.about_title, '关于页标题', 160], [draft.about_bio, '关于页介绍', 10000]] as const) if ((!value.trim() && title !== '关于页介绍') || value.length > limit) throw new Error(title + '最多 ' + limit + ' 个字符，标题和名称不能为空。');
      if (/[\u0000-\u001f\u007f]/.test(draft.display_name + draft.about_title)) throw new Error('显示名称和关于页标题不能包含控制字符。');
      if ((draft.home_title.match(/\n/g)?.length ?? 0) > 1 || (draft.home_intro.match(/\n/g)?.length ?? 0) > 1) throw new Error('首页标题和介绍最多两行。');
      if ((draft.contact_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contact_email.trim())) || draft.contact_email.length > 254) throw new Error('请填写有效的公开联系邮箱，或留空。');
      const payload = { ...draft, github_url: safeUrl(draft.github_url, 'GitHub 地址', true), linkedin_url: safeUrl(draft.linkedin_url, 'LinkedIn 地址', true), contact_email: draft.contact_email.trim() };
      editor.setBusy(true);
      const { data, error } = await client.from('blog_settings').update(payload).eq('id', 'main').select().single(); if (error) throw error;
      const { id, updated_at, ...settings } = data as BlogSettingsRecord; void id; void updated_at; editor.replace(settings, 'main'); editor.setSuccess('站点设置已保存，重新打开博客即可查看。');
    } catch (cause) { editor.setError(reportError(cause)); } finally { editor.setBusy(false); }
  };
  return <section className="blog-card admin-editor admin-settings"><div className="admin-editor-heading"><div><span className="blog-eyebrow">YOUR SPACE / SETTINGS</span><h2>让这个空间，更像你。</h2></div><span className={'admin-save-state' + (dirty ? ' changed' : '')}>{dirty ? '有未保存的修改' : '公开展示的介绍'}</span></div>{editor.error && <Notice message={editor.error} />}{editor.success && <Notice message={editor.success} kind="success" />}{loading ? <Spinner /> : !loaded ? <button className="blog-button blog-outline-button" onClick={() => void reload()}>重新加载设置</button> : <form onSubmit={(event) => void save(event)}><fieldset disabled={busy}><div className="admin-form-grid"><Field label="显示名称" wide><input value={draft.display_name} maxLength={80} onChange={(event) => change({ display_name: event.target.value })} /></Field><Field label="首页标题" wide><textarea rows={2} value={draft.home_title} maxLength={160} onChange={(event) => change({ home_title: event.target.value })} /></Field><Field label="首页介绍" wide><textarea rows={3} maxLength={600} value={draft.home_intro} onChange={(event) => change({ home_intro: event.target.value })} /></Field><Field label="关于页标题" wide><input value={draft.about_title} maxLength={160} onChange={(event) => change({ about_title: event.target.value })} /></Field><Field label="关于页介绍" wide hint="用空行分段；这里是公开的文字介绍。"><textarea rows={7} maxLength={10000} value={draft.about_bio} onChange={(event) => change({ about_bio: event.target.value })} /></Field><Field label="公开联系邮箱" wide><input type="email" value={draft.contact_email} maxLength={254} onChange={(event) => change({ contact_email: event.target.value })} /></Field><Field label="GitHub 地址"><input type="url" value={draft.github_url} onChange={(event) => change({ github_url: event.target.value })} /></Field><Field label="LinkedIn 地址"><input type="url" value={draft.linkedin_url} onChange={(event) => change({ linkedin_url: event.target.value })} /></Field></div></fieldset><div className="admin-editor-actions"><button className="blog-button" type="submit" disabled={busy}>{busy ? <Spinner>保存中</Spinner> : <><Save size={15} />保存站点设置</>}</button><a className="admin-text-button" href="/blog/home/" target="_blank" rel="noopener noreferrer">查看博客<ExternalLink size={14} /></a></div></form>}</section>;
}

function PasswordForm({ client, onComplete, onCancel, recovery = false }: { client: SupabaseClient; onComplete: () => void; onCancel: () => void; recovery?: boolean }) {
  const guard = useContext(GuardContext)!;
  const [password, setPassword] = useState(''), [repeat, setRepeat] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { guard.register(Boolean(password || repeat), busy); }, [password, repeat, busy, guard.register]);
  useEffect(() => () => guard.register(false, false), [guard.register]);
  const update = async (event: FormEvent) => { event.preventDefault(); setError(''); if (password.length < 12 || password.length > 128) { setError('新密码请使用 12 到 128 个字符。'); return; } if (password !== repeat) { setError('两次输入的新密码不一致。'); return; } setBusy(true); try { const { error: updateError } = await client.auth.updateUser({ password }); if (updateError) throw updateError; setPassword(''); setRepeat(''); onComplete(); } catch (cause) { setError(reportError(cause)); } finally { setBusy(false); } };
  return <section className="blog-card admin-password-card"><div className="admin-panel-title"><h2>{recovery ? '设置新密码' : '修改管理员密码'}</h2>{!recovery && <button className="admin-icon-button" aria-label="关闭修改密码" onClick={onCancel} disabled={busy}><X size={18} /></button>}</div><p className="admin-muted">使用独立的长密码，至少 12 个字符。</p>{error && <Notice message={error} />}<form onSubmit={(event) => void update(event)}><fieldset disabled={busy}><Field label="新密码"><input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></Field><Field label="再次输入新密码"><input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={repeat} onChange={(event) => setRepeat(event.target.value)} /></Field></fieldset><button className="blog-button" type="submit" disabled={busy}>{busy ? <Spinner>更新中</Spinner> : '更新密码'}</button></form></section>;
}

function Dashboard({ client, user, recovery, clearRecovery }: { client: SupabaseClient; user: User; recovery: boolean; clearRecovery: () => void }) {
  const [tab, setTab] = useState<Tab>('posts'), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [dialog, setDialog] = useState<Dialog | null>(null), [notice, setNotice] = useState(''), [password, setPassword] = useState(false), [logoutBusy, setLogoutBusy] = useState(false);
  const register = useMemo(() => (nextDirty: boolean, nextBusy: boolean) => { setDirty(nextDirty); setBusy(nextBusy); }, []);
  const leave = (action: () => void) => { if (busy || logoutBusy) { setNotice('正在处理操作，请完成后再离开。'); return; } if (dirty) setDialog({ title: '有修改还没有保存', description: '离开当前编辑器会丢失这些修改。可以继续编辑，或放弃修改后继续。', action }); else action(); };
  const guard: Guard = { dirty, busy, register, leave, confirm: setDialog };
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } };
    const click = (event: MouseEvent) => {
      if ((!dirty && !busy) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (!/^https?:$/.test(url.protocol) || (url.pathname === window.location.pathname && url.search === window.location.search && url.hash)) return;
      event.preventDefault(); event.stopPropagation(); leave(() => window.location.assign(url.href));
    };
    window.addEventListener('beforeunload', beforeUnload); document.addEventListener('click', click, true);
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', click, true); };
  }, [dirty, busy, logoutBusy]);
  const logout = () => leave(() => { void (async () => { setLogoutBusy(true); setNotice(''); try { const { error } = await client.auth.signOut(); if (error) throw error; } catch (cause) { setNotice(reportError(cause)); } finally { setLogoutBusy(false); } })(); });
  return <GuardContext.Provider value={guard}><div className="blog-admin" data-admin-state="authorized"><header className="admin-heading"><div><span className="blog-eyebrow">YOUR WORDS / YOUR SPACE</span><h1>创作工作台<span>.</span></h1><p>把想法写下来，把喜欢的画面留下来。</p></div><div className="admin-account"><ShieldCheck size={17} /><span>{user.email || '管理员'}<small>管理员 · Supabase</small></span><button className="admin-icon-button" aria-label="修改管理员密码" onClick={() => leave(() => setPassword(true))} disabled={busy || logoutBusy}><ShieldCheck size={17} /></button><button className="admin-icon-button" aria-label="退出登录" onClick={logout} disabled={busy || logoutBusy}>{logoutBusy ? <Loader2 size={17} className="admin-spinner" /> : <LogOut size={17} />}</button></div></header>{notice && <div className="admin-dismissible"><Notice message={notice} kind="info" /><button className="admin-icon-button" aria-label="关闭提示" onClick={() => setNotice('')}><X size={15} /></button></div>}<div className="admin-layout"><aside className="blog-card admin-sidebar"><span className="blog-eyebrow">WORKSPACE</span><nav aria-label="后台管理">{tabs.map(({ id, title, description, icon: Icon }) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => { if (tab !== id) leave(() => { setTab(id); setNotice(''); }); }}><Icon size={19} /><span><strong>{title}</strong><small>{description}</small></span><ChevronRight size={14} /></button>)}</nav><div className="admin-sidebar-bottom"><a href="/blog/home/" target="_blank" rel="noopener noreferrer">打开博客<ArrowUpRight size={15} /></a><button onClick={() => leave(() => setPassword(true))}>修改密码<ShieldCheck size={14} /></button><p>草稿只对管理员可见。<br />上传图片为公开资源。</p></div></aside><div className="admin-content">{recovery || password ? <PasswordForm client={client} recovery={recovery} onCancel={() => leave(() => setPassword(false))} onComplete={() => { setPassword(false); clearRecovery(); setNotice('密码操作完成。'); }} /> : tab === 'starter' ? <StarterPanel client={client} user={user} onBusy={register} /> : tab === 'posts' ? <PostsPanel client={client} user={user} /> : tab === 'photos' ? <PhotosPanel client={client} user={user} /> : tab === 'links' ? <LinksPanel client={client} /> : <SettingsPanel client={client} />}</div></div>{dialog && <Confirmation dialog={dialog} close={() => setDialog(null)} />}</div></GuardContext.Provider>;
}

function SignIn({ client, initialError = '' }: { client: SupabaseClient; initialError?: string }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [mode, setMode] = useState<'login' | 'reset'>('login'), [busy, setBusy] = useState(false), [error, setError] = useState(initialError), [success, setSuccess] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSuccess(''); setBusy(true);
    try {
      if (mode === 'reset') {
        const redirectTo = new URL('/blog/admin/?mode=recovery', window.location.origin).href;
        const { error: authError } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo }); if (authError) throw authError;
        setSuccess('如果该邮箱可接收密码重置邮件，你会收到链接。请在同一浏览器中打开，设置新密码。');
      } else {
        const { error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) { if (/Invalid login credentials/i.test(authError.message)) throw new Error('邮箱或密码不正确。'); if (/Email not confirmed/i.test(authError.message)) throw new Error('请先确认邮箱，再登录。'); throw authError; }
        setPassword('');
      }
    } catch (cause) { setError(reportError(cause)); } finally { setBusy(false); }
  };
  return <div className="blog-admin admin-gate" data-admin-state="signed-out"><section className="blog-card admin-auth"><span className="admin-auth-icon"><ShieldCheck size={27} /></span><span className="blog-eyebrow">A PRIVATE WORKSPACE</span><h1>{mode === 'reset' ? '找回管理员密码' : '欢迎回来，Tommy'}<span>.</span></h1><p>{mode === 'reset' ? '向你的管理员邮箱发送密码重置链接。' : '登录，继续写下今天的想法。'}</p>{error && <Notice message={error} />}{success && <Notice message={success} kind="success" />}<form onSubmit={(event) => void submit(event)}><fieldset disabled={busy}><Field label="管理员邮箱"><input type="email" required autoComplete="username" value={email} placeholder="you@example.com" onChange={(event) => setEmail(event.target.value)} /></Field>{mode === 'login' && <Field label="密码"><input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>}</fieldset><button type="submit" className="blog-button admin-auth-submit" disabled={busy}>{busy ? <Spinner>{mode === 'reset' ? '发送中' : '登录中'}</Spinner> : <>{mode === 'reset' ? '发送重置邮件' : '登录工作台'}<ArrowUpRight size={16} /></>}</button></form><button className="admin-text-button" onClick={() => { setMode(mode === 'login' ? 'reset' : 'login'); setError(''); setSuccess(''); setPassword(''); }} disabled={busy}>{mode === 'reset' ? <><ArrowLeft size={14} />返回登录</> : '忘记密码？'}</button><div className="admin-auth-footer">仅向管理员开放 · 账号由站点所有者创建</div></section></div>;
}

export default function AdminApp() {
  const client = getBlogClient();
  const problem = getBackendProblem();
  const [session, setSession] = useState<Session | null>(null), [ready, setReady] = useState(false), [state, setState] = useState<'checking' | 'authorized' | 'denied' | 'error'>('checking'), [user, setUser] = useState<User | null>(null), [error, setError] = useState(''), [recovery, setRecovery] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!client) return;
    let live = true;
    if (new URLSearchParams(window.location.search).get('mode') === 'recovery') setRecovery(true);
    const subscription = client.auth.onAuthStateChange((event, nextSession) => {
      if (!live) return;
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
      setSession(nextSession); setReady(true);
    });
    void client.auth.getSession().then(({ data, error: sessionError }) => { if (!live) return; if (sessionError) { setError(reportError(sessionError)); setState('error'); } setSession(data.session); setReady(true); }).catch((cause) => { if (live) { setError(reportError(cause)); setState('error'); setReady(true); } });
    return () => { live = false; subscription.data.subscription.unsubscribe(); };
  }, [client]);
  useEffect(() => {
    if (!client || !ready || !session) { if (ready && !session) setUser(null); return; }
    let live = true;
    setState((current) => current === 'authorized' && session.user.id === user?.id ? current : 'checking'); setError('');
    void (async () => {
      try {
        const { data: authData, error: authError } = await client.auth.getUser(); if (authError) throw authError;
        if (!authData.user) throw new Error('登录会话已失效，请重新登录。');
        const { data: isAdmin, error: adminError } = await client.rpc('is_blog_admin'); if (adminError) {
          if (adminError.code === 'PGRST202' || /Could not find the function/i.test(adminError.message)) throw new Error('管理员验证函数尚未配置，请先在 Supabase 执行仓库中的数据库初始化 SQL。');
          throw adminError;
        }
        if (live) { setUser(authData.user); setState(isAdmin === true ? 'authorized' : 'denied'); }
      } catch (cause) { if (live) { setError(reportError(cause)); setState('error'); } }
    })();
    return () => { live = false; };
  }, [client, ready, session?.access_token, retry]);
  if (!client || problem) return <div className="blog-admin admin-gate" data-admin-state="unconfigured"><section className="blog-card admin-setup"><ShieldCheck size={30} /><span className="blog-eyebrow">ONE SMALL STEP / CONNECT SUPABASE</span><h1>工作台，等待连接<span>.</span></h1><p>后台页面已准备好。连接你的 Supabase 项目后，就能登录、管理草稿、发布文章和上传图片。</p>{problem && <Notice message={problem} kind="info" />}<ol><li>创建 Supabase 项目并执行仓库中的数据库初始化 SQL。</li><li>在 Supabase 创建自己的管理员账号，将其用户 ID 加入管理员表。</li><li>配置 Project URL 和 Publishable key，重新构建并部署网站。</li></ol><p className="admin-setup-note">这里需要公开的项目配置。管理员密码和数据库 secret key 不放进网站源码。</p><a className="blog-button blog-outline-button" href="/blog/home/">回到博客<ArrowLeft size={15} /></a></section></div>;
  if (!ready) return <div className="blog-admin admin-gate" data-admin-state="checking"><div className="blog-card admin-auth"><Spinner>正在恢复登录会话…</Spinner></div></div>;
  if (!session) return <SignIn client={client} initialError={error} />;
  if (state === 'checking') return <div className="blog-admin admin-gate" data-admin-state="checking"><div className="blog-card admin-auth"><Spinner>正在验证管理员权限…</Spinner></div></div>;
  if (state !== 'authorized' || !user) return <div className="blog-admin admin-gate" data-admin-state={state}><section className="blog-card admin-auth"><ShieldCheck size={29} /><h1>{state === 'denied' ? '这个账号没有后台权限。' : '暂时无法验证权限。'}</h1><p>{state === 'denied' ? '你已登录，但此账号不在博客管理员名单中。请使用自己的管理员账号。' : '请检查项目配置和数据库初始化；验证成功后才能进入工作台。'}</p>{error && <Notice message={error} />}<div className="admin-dialog-actions">{state === 'error' && <button className="blog-button" onClick={() => setRetry((value) => value + 1)}>重新验证</button>}<button className="blog-button blog-outline-button" onClick={() => void client.auth.signOut().then(({ error: signOutError }) => { if (signOutError) setError(reportError(signOutError)); })}><LogOut size={15} />退出登录</button></div></section></div>;
  return <Dashboard client={client} user={user} recovery={recovery} clearRecovery={() => { setRecovery(false); const currentUrl = new URL(window.location.href); currentUrl.searchParams.delete('mode'); window.history.replaceState(null, '', currentUrl.href); }} />;
}



