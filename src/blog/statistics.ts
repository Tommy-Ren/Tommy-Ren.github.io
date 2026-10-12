import { getBlogClient } from './backend';
export interface BlogStatistics { today_visitors: number; total_visits: number; running_days: number; date: string; recorded: boolean }
let pending: Promise<BlogStatistics> | undefined;
let cached: { value: BlogStatistics; at: number } | undefined;
// Both entry points call this. The database, not browser storage, deduplicates IPs.
export async function loadStatistics(): Promise<BlogStatistics> {
  if (cached && Date.now() - cached.at < 30000) return cached.value;
  if (pending) return pending;
  const client = getBlogClient();
  if (!client) throw new Error('Statistics unavailable');
  pending = (async () => {
    const result = await client.rpc('site_statistics');
    if (result.error) throw result.error;
    const value = result.data as BlogStatistics;
    cached = { value, at: Date.now() };
    return value;
  })();
  try { return await pending; } finally { pending = undefined; }
}
