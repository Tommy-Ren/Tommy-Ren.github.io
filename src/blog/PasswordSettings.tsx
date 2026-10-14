import { useAccount } from './Community';
import PasswordForm from './PasswordForm';
import { useLocale } from '../i18n/Locale';

export default function PasswordSettings() {
  const { user, ready, openAuth } = useAccount();
  const { locale } = useLocale(), zh = locale === 'zh';
  return <section className="blog-card community-password-page"><span className="blog-eyebrow">YOUR ACCOUNT</span><h1>{zh ? '修改密码' : 'Change your password'}</h1>
    {!ready ? <p role="status">{zh ? '正在恢复账号…' : 'Loading your account…'}</p> : !user ? <><p>{zh ? '请登录，或重新打开邮件中的密码重置链接。若链接已过期，可在登录窗口选择“忘记密码”重新发送。' : 'Log in or reopen the password reset link from your email. If it expired, use “Forgot password?” in the login window.'}</p><button className="blog-button" onClick={openAuth}>{zh ? '登录 / 找回密码' : 'Log in / Reset password'}</button></> : <PasswordForm />}
  </section>;
}
