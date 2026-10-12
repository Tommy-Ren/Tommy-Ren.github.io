export function backendConfigProblem({ url, key, allowLocal = false }) {
  if (!url || !key) return '尚未连接 Supabase。请按设置说明填写项目 URL 和 Publishable key。';
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error();
    if (parsed.protocol !== 'https:' && !(allowLocal && parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) throw new Error();
  } catch { return 'Supabase 项目 URL 格式不正确。请使用项目的 HTTPS 地址。'; }
  if (key.startsWith('sb_publishable_') && key.length > 20) return null;
  if (key.startsWith('sb_secret_')) return '浏览器配置必须使用 Publishable/anon key，不能使用 Secret key。';
  try {
    const pieces = key.split('.');
    const payload = JSON.parse(atob(pieces[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (pieces.length === 3 && payload.role === 'anon') return null;
  } catch { /* Never initialize a browser client with a privileged or malformed key. */ }
  return '请使用 Publishable key 或 anon key；不能把管理员服务密钥放入前端配置。';
}
