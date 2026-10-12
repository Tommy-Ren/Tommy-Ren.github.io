import { createFeedHandler } from './feed.ts';

// 使用平台提供的 publishable key（兼容 anon），完全不使用 service_role / secret key。
Deno.serve(createFeedHandler({ env: name => Deno.env.get(name) }));
