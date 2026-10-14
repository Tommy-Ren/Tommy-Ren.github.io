import { useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { getBlogClient } from './backend';
import { useLocale } from '../i18n/Locale';

export default function PasswordForm() {
  const { locale } = useLocale(), zh = locale === 'zh';
  const [password,setPassword] = useState(''), [repeat,setRepeat] = useState('');
  const [show,setShow] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState(''), [done,setDone] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setError(''); setDone(false);
    if (password.length < 12 || password.length > 128) { setError(zh ? '密码需要 12–128 个字符。' : 'Use 12–128 characters for your password.'); return; }
    if (password !== repeat) { setError(zh ? '两次密码不一致。' : 'The passwords do not match.'); return; }
    const client = getBlogClient(); if (!client) { setError('Account service unavailable.'); return; }
    setBusy(true);
    try {
      const result = await client.auth.updateUser({password});
      if (result.error) throw result.error;
      setPassword(''); setRepeat(''); setDone(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Please retry.'); }
    finally { setBusy(false); }
  }
  return <form className="community-password-form" onSubmit={submit} noValidate>
      <p>{zh ? '为你的账号设置新密码。' : 'Choose a new password for your account.'}</p>
      <fieldset disabled={busy}>{[[password,setPassword,zh?'新密码':'New password'],[repeat,setRepeat,zh?'再次输入新密码':'Confirm new password']].map(([value,setter,label],index)=><label key={index}>{label as string}<input type={show?'text':'password'} value={value as string} onChange={e=>(setter as (v:string)=>void)(e.target.value)} required minLength={12} maxLength={128} autoComplete="new-password" /></label>)}
      <button className="community-password-reveal" type="button" aria-pressed={show} onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={17}/>:<Eye size={17}/>} {show?(zh?'隐藏密码':'Hide passwords'):(zh?'显示密码':'Show passwords')}</button></fieldset>
      {error && <p className="community-error" role="alert">{error}</p>}{done && <p role="status">{zh ? '密码已更新，下次登录请使用新密码。' : 'Password updated. Use your new password the next time you log in.'}</p>}
      <button className="blog-button" disabled={busy}>{busy?(zh?'更新中…':'Updating…'):(zh?'更新密码':'Update password')}</button>
    </form>;
}
