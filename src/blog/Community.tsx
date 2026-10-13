import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { ChevronDown, Eye, LogOut, PenLine, Settings, X } from 'lucide-react';
import { getBlogClient } from './backend';
import { useLocale } from '../i18n/Locale';
import type { BlogPost } from './types';
import './community.css';

export interface Author { id: string; display_name: string; avatar: string }
const presets: Record<string, string> = { orbit: '🪐', cat: '🐈', fox: '🦊', leaf: '🌿', moon: '🌙', robot: '🤖' };
export function Avatar({ author, size = 36 }: { author?: Pick<Author, 'avatar' | 'display_name'> | null; size?: number }) {
  return <span className={'community-avatar avatar-' + (author?.avatar || 'orbit')} style={{ width: size, height: size }} aria-hidden="true">{author?.avatar === 'tommy' ? <img src="/images/tommy-avatar.webp" alt="" /> : presets[author?.avatar || 'orbit'] || presets.orbit}</span>;
}
type AccountState = { user: User | null; profile: Author | null; isAdmin: boolean; ready: boolean; error: string; reload: () => void; openAuth: () => void; authOpen: boolean; closeAuth: () => void };
const Account = createContext<AccountState>({ user: null, profile: null, isAdmin: false, ready: false, error: '', reload() {}, openAuth() {}, authOpen: false, closeAuth() {} });
export const useAccount = () => useContext(Account);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null), [profile, setProfile] = useState<Author | null>(null);
  const [isAdmin, setAdmin] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState(''), [version, setVersion] = useState(0), [open, setOpen] = useState(false);
  useEffect(() => {
    const client = getBlogClient(); if (!client) { setReady(true); return; }
    let active = true, generation = 0;
    const refresh = async () => {
      const current = ++generation;
      const valid = () => active && current === generation;
      try {
        const session = await client.auth.getSession(); if (session.error) throw session.error;
        if (!session.data.session) { if (valid()) { setUser(null); setProfile(null); setAdmin(false); setError(''); setReady(true); } return; }
        const result = await client.auth.getUser(); if (result.error) throw result.error;
        const next = result.data.user;
        if (!valid()) return;
        setUser(next); setAdmin(false); setProfile(null);
        if (next?.email_confirmed_at) {
          let record = await client.from('blog_profiles').select('id,display_name,avatar').eq('id', next.id).maybeSingle();
          if (record.error) throw record.error;
          if (!record.data) {
            const name = String(next.user_metadata?.display_name || 'Reader').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0,60) || 'Reader';
            const avatar = Object.hasOwn(presets, next.user_metadata?.avatar) ? next.user_metadata.avatar : 'orbit';
            const created = await client.from('blog_profiles').insert({ id: next.id, display_name: name, avatar });
            if (created.error && created.error.code !== '23505') throw created.error;
            record = await client.from('blog_profiles').select('id,display_name,avatar').eq('id', next.id).single();
            if (record.error) throw record.error;
          }
          const role = await client.rpc('is_blog_admin'); if (role.error) throw role.error;
          if (valid()) { setProfile(record.data); setAdmin(role.data === true); }
        }
        if (valid()) { setError(''); setReady(true); }
      } catch { if (valid()) { setAdmin(false); setError('Account unavailable. Please retry. / 账号暂不可用，请重试。'); setReady(true); } }
    };
    // Do not await Supabase calls inside its auth event callback.
    const subscription = client.auth.onAuthStateChange(() => { queueMicrotask(() => { if (active) void refresh(); }); });
    void refresh();
    return () => { active = false; subscription.data.subscription.unsubscribe(); };
  }, [version]);
  return <Account.Provider value={{ user, profile, isAdmin, ready, error, reload: () => setVersion(v => v + 1), openAuth: () => setOpen(true), authOpen: open, closeAuth: () => setOpen(false) }}>{children}</Account.Provider>;
}

export function AccountDialogHost() { const { authOpen, closeAuth } = useAccount(); return authOpen ? <AccountDialog close={closeAuth} /> : null; }

export function AccountMenu() {
  const { user, profile, ready, isAdmin, openAuth, error, reload } = useAccount();
  const { locale } = useLocale(), zh = locale === 'zh';
  const [open, setOpen] = useState(false), [notice, setNotice] = useState('');
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close);
  }, []);
  if (!ready) return <span className="community-account-loading" aria-label={zh ? '正在恢复账号' : 'Loading account'} />;
  if (!user) return <button className="blog-portfolio-link" onClick={openAuth}>{zh ? '登录 / 注册' : 'Log in / Sign up'}</button>;
  return <div className="community-account" ref={root} onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); root.current?.querySelector('button')?.focus(); } }}><button className="community-account-trigger" aria-label={zh ? '我的账号' : 'My account'} aria-expanded={open} onClick={() => setOpen(!open)}><Avatar author={profile} /><ChevronDown size={14} /></button>{open && <div className="community-account-popover"><strong>{profile?.display_name || (zh ? '我的账号' : 'My account')}</strong><small>{isAdmin ? (zh ? '管理员' : 'Administrator') : (zh ? '作者' : 'Writer')}</small>{error ? <button onClick={reload}>{zh ? '重试账号连接' : 'Retry account connection'}</button> : user.email_confirmed_at && profile && <a href="/blog/admin/"><PenLine size={16} />{zh ? '创作工作台' : 'Writing studio'}</a>}<button onClick={() => { setOpen(false); openAuth(); }}><Settings size={16} />{zh ? '个人资料' : 'Edit profile'}</button><button onClick={async () => { const result = await getBlogClient()?.auth.signOut(); if (result?.error) setNotice(result.error.message); else setOpen(false); }}><LogOut size={16} />{zh ? '退出登录' : 'Sign out'}</button>{notice && <p role="alert">{notice}</p>}</div>}</div>;
}

function AccountDialog({ close }: { close: () => void }) {
  const { user, profile, reload } = useAccount(); const { locale } = useLocale(); const zh = locale === 'zh';
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState(profile?.display_name || ''), [avatar, setAvatar] = useState(profile?.avatar || 'orbit');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; box.current?.querySelector<HTMLElement>('button')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab') return;
      const elements = Array.from(box.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]') || []);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown',key); return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown',key); previous?.focus(); };
  }, []);
  const confirmation = zh ? '请查看邮箱中的确认邮件，完成验证后再登录。' : 'Check your inbox for a confirmation email, verify your address, then log in.';
  async function submit(event: FormEvent) {
    event.preventDefault(); const client = getBlogClient(); if (!client) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (user) {
        const result = await client.from('blog_profiles').update({ display_name: name.trim(), avatar }).eq('id',user.id).select().single();
        if (result.error) throw result.error; reload(); close();
      } else if (mode === 'signup') {
        const result = await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: new URL('/blog/home/',location.origin).href, data: { display_name: name.trim(), avatar } } });
        if (result.error) throw result.error; setPassword(''); setMessage(confirmation);
      } else if (mode === 'reset') {
        const result = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: new URL('/blog/admin/?mode=recovery',location.origin).href });
        if (result.error) throw result.error; setMessage(zh ? '如该邮箱可接收邮件，你会收到重置链接。' : 'If this address can receive account emails, a reset link will arrive shortly.');
      } else {
        const result = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error; setPassword(''); close();
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : (zh ? '暂时无法完成，请重试。' : 'Unable to complete. Please retry.')); } finally { setBusy(false); }
  }
  return <div className="community-dialog-shade"><div className="community-dialog blog-card" ref={box} role="dialog" aria-modal="true" aria-labelledby="account-title"><button className="community-dialog-close" aria-label={zh ? '关闭' : 'Close'} onClick={close}><X size={20} /></button><span className="blog-eyebrow">A SPACE FOR YOUR IDEAS</span><h2 id="account-title">{user ? (zh ? '你的个人资料' : 'Make it yours.') : mode === 'signup' ? (zh ? '加入我们的写作空间' : 'A new voice. Yours.') : mode === 'reset' ? (zh ? '找回密码' : 'Reset your password') : (zh ? '很高兴再次见到你' : 'Welcome back.')}</h2><p>{zh ? '写下想法，分享画面，开始一段交流。' : 'Write a story, share a moment, start a conversation.'}</p>{error && <p className="community-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}<form onSubmit={submit}><fieldset disabled={busy}>{(user || mode === 'signup') && <><label>{zh ? '公开昵称' : 'Display name'}<input required maxLength={60} value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" /></label><div className="community-avatar-picker" role="group" aria-label={zh ? '选择头像' : 'Choose an avatar'}>{Object.keys(presets).concat(profile?.avatar === 'tommy' ? ['tommy'] : []).map(key => <button type="button" key={key} aria-label={key} aria-pressed={avatar === key} onClick={() => setAvatar(key)}><Avatar author={{avatar:key,display_name:''}} size={42} /></button>)}</div></>}{!user && <><label>{zh ? '邮箱' : 'Email'}<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>{mode !== 'reset' && <label>{zh ? '密码' : 'Password'}<input type="password" required minLength={mode === 'signup' ? 12 : undefined} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />{mode === 'signup' && <small>{zh ? '至少 12 个字符。验证邮箱后可发布和留言。' : 'At least 12 characters. Verify your email to publish and comment.'}</small>}</label>}</>}</fieldset><button className="blog-button" disabled={busy}>{busy ? '…' : user ? (zh ? '保存资料' : 'Save profile') : mode === 'signup' ? (zh ? '创建账号' : 'Create account') : mode === 'reset' ? (zh ? '发送重置链接' : 'Send reset link') : (zh ? '登录' : 'Log in')}</button></form>{!user && <div className="community-auth-links"><button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setMessage(''); setError(''); }}>{mode === 'signup' ? (zh ? '已有账号？登录' : 'Already a member? Log in') : (zh ? '新用户？注册' : 'New here? Sign up')}</button><button onClick={() => { setMode(mode === 'reset' ? 'login' : 'reset'); setError(''); setMessage(''); }}>{mode === 'reset' ? (zh ? '返回登录' : 'Back to login') : (zh ? '忘记密码？' : 'Forgot password?')}</button>{mode === 'signup' && <button disabled={busy || !email} onClick={async () => { setBusy(true); const response = await getBlogClient()?.auth.resend({ type:'signup',email:email.trim(),options:{ emailRedirectTo:new URL('/blog/home/',location.origin).href } }); setBusy(false); if (response?.error) setError(response.error.message); else setMessage(confirmation); }}>{zh ? '重新发送验证邮件' : 'Resend confirmation'}</button>}</div>}</div></div>;
}

export function PostIdentity({ post, record = false }: { post: BlogPost; record?: boolean }) {
  const { locale } = useLocale(); const [views, setViews] = useState(post.views ?? 0);
  useEffect(() => {
    setViews(post.views ?? 0); if (!record || !post.id) return;
    let live = true;
    void getBlogClient()?.rpc('record_article_view', { p_post_id: post.id }).then(({ data, error }) => { if (live && !error && typeof data === 'number') setViews(data); });
    return () => { live = false; };
  }, [post.id, post.views, record]);
  const author = post.author || { display_name:'Tommy Ren', avatar:'tommy' };
  return <div className="community-post-identity"><Avatar author={author} size={28} /><span>{author.display_name}</span><span className="community-views"><Eye size={14} />{views.toLocaleString(locale)} {locale === 'zh' ? '次浏览' : views === 1 ? 'view' : 'views'}</span></div>;
}

type Comment = { id: string; body: string; created_at: string; author_id: string; author: Author };
export function Comments({ postId }: { postId?: string }) {
  const { user, profile, isAdmin, openAuth, error: accountError } = useAccount(); const { locale } = useLocale(); const zh = locale === 'zh';
  const [rows, setRows] = useState<Comment[]>([]), [body,setBody] = useState(''), [error,setError] = useState(''), [busy,setBusy] = useState(false), [loading,setLoading] = useState(true), [limit,setLimit] = useState(30), [more,setMore] = useState(false), [revision,setRevision] = useState(0);
  useEffect(() => {
    let live = true; setLoading(true); setError('');
    const client = getBlogClient(); if (!client || !postId) { setLoading(false); return; }
    void client.from('blog_comments').select('id,body,created_at,author_id,author:blog_profiles(id,display_name,avatar)').eq('post_id',postId).order('created_at',{ascending:false}).order('id').limit(limit+1).then(({data,error:err}) => { if (!live) return; if(err) setError(zh ? '留言加载失败，请重试。' : 'Unable to load comments. Please retry.'); else { setRows((data || []).slice(0,limit) as unknown as Comment[]); setMore((data?.length || 0)>limit); } setLoading(false); });
    return () => { live=false; };
  }, [postId,limit,revision,zh]);
  useEffect(() => { setBody(''); setRows([]); setLimit(30); }, [postId]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!body.trim() || !postId || busy) return; setBusy(true); setError('');
    const response = await getBlogClient()?.from('blog_comments').insert({ post_id:postId, body:body.trim() });
    if (response?.error) setError(response.error.message); else { setBody(''); setRevision(r=>r+1); } setBusy(false);
  };
  if (!postId) return null;
  return <section className="community-comments" aria-labelledby="comments-title"><span className="blog-eyebrow">THE CONVERSATION</span><h2 id="comments-title">{zh ? '留下你的想法' : 'What’s on your mind?'}</h2>{user?.email_confirmed_at && profile ? <form onSubmit={submit}><div className="community-comment-writer"><Avatar author={profile} /><strong>{profile.display_name}</strong></div><textarea aria-label={zh ? '留言内容' : 'Your comment'} required maxLength={2000} rows={4} value={body} placeholder={zh ? '分享一个想法或问题…' : 'A thought, a question, a little hello…'} onChange={e=>setBody(e.target.value)} /><div className="community-comment-submit"><small>{body.length} / 2000</small><button className="blog-button" disabled={busy || !body.trim()}>{busy ? '…' : zh ? '发布留言' : 'Post comment'}</button></div></form> : <div className="community-comment-gate"><p>{accountError || (zh ? '用自己的邮箱注册并验证后，即可参与讨论。' : 'Join the conversation with a verified email account.')}</p><button className="blog-button blog-outline-button" onClick={openAuth}>{zh ? '登录 / 注册' : 'Log in / Sign up'}</button></div>}{error && <p className="community-error" role="alert">{error}<button onClick={()=>setRevision(r=>r+1)}>{zh ? '重试' : 'Retry'}</button></p>}{loading && <p role="status">{zh ? '加载留言…' : 'Loading comments…'}</p>}<div className="community-comment-list">{rows.map(row=><article key={row.id}><Avatar author={row.author} /><div><header><strong>{row.author?.display_name || 'Reader'}</strong><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleDateString(locale)}</time></header><p>{row.body}</p>{(user?.id === row.author_id || isAdmin) && <button className="community-comment-delete" onClick={async ()=>{ if (!window.confirm(zh ? '确定删除这条留言？' : 'Delete this comment?')) return; const response=await getBlogClient()?.from('blog_comments').delete().eq('id',row.id); if(response?.error) setError(response.error.message); else setRevision(r=>r+1); }}>{zh ? '删除' : 'Delete'}</button>}</div></article>)}</div>{!loading && !error && !rows.length && <p className="community-comment-empty">{zh ? '成为第一个留言的人。' : 'Be the first to leave a thought.'}</p>}{more && <button className="blog-button blog-outline-button" onClick={()=>setLimit(n=>n+30)}>{zh ? '更多留言' : 'More comments'}</button>}</section>;
}
