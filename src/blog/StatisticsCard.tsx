import { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { useLocale } from '../i18n/Locale';
import { loadStatistics, type BlogStatistics } from './statistics';

export default function StatisticsCard() {
  const { t } = useLocale();
  const [stats, setStats] = useState<BlogStatistics | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = () => { if (!document.hidden) void loadStatistics().then(data => { if (active) { setStats(data); setFailed(false); } }).catch(() => { if (active) setFailed(true); }); };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [retry]);
  return <section className="blog-card blog-statistics">
    <span className="blog-eyebrow">{t('PEOPLE & MOMENTS')}</span>
    <div className="blog-checkin-heading"><div><h2>{t('Glad you’re here.')}</h2><p><Activity size={20} />{t('Every visit is part of the story.')}</p></div><span className="blog-stats-live"><i />{t('LIVE')}</span></div>
    <div className="blog-stats-grid" aria-live="polite">{[['Today’s visitors', stats?.today_visitors], ['Total visits', stats?.total_visits], ['Days online', stats?.running_days]].map(([label, value]) => <div key={label}><strong>{typeof value === 'number' ? value.toLocaleString() : '—'}</strong><span>{t(String(label))}</span></div>)}</div>
    {failed && <p className="blog-stats-note"><span role="status">{t('Statistics temporarily unavailable.')}</span><button onClick={() => setRetry(value => value + 1)} aria-label={t('Retry')}><RefreshCw size={13} /></button></p>}
  </section>;
}
