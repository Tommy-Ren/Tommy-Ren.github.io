import path from 'node:path';
import { defineConfig, loadEnv, normalizePath, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { loadBlogContent } from './scripts/blog-content.mjs';
import { backendConfigProblem } from './src/blog/config.mjs';

function blogDevelopment(): Plugin {
  const virtualId = '\0virtual:blog-content';
  return {
    name: 'blog-markdown-development',
    resolveId(id) { if (id === 'virtual:blog-content') return virtualId; },
    async load(id) {
      if (id === virtualId) return `export const content = ${JSON.stringify(await loadBlogContent())};`;
    },
    configureServer(server) {
      const contentDirectory = normalizePath(path.resolve(server.config.root, 'content/blog'));
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || '').split('?')[0];
        if (pathname === '/blog' || pathname === '/blog/') {
          res.writeHead(302, { Location: '/blog/home/' });
          res.end();
          return;
        }
        const routePath = pathname.replace(/\/index\.html$/, '/');
        if (routePath.startsWith('/blog/') && !routePath.split('/').some(part => part.includes('.'))) {
          req.url = '/blog/home/index.html';
        }
        next();
      });
      server.watcher.add(contentDirectory);
      server.watcher.on('all', (_event, file) => {
        const normalizedFile = normalizePath(path.resolve(server.config.root, file));
        if (!normalizedFile.startsWith(`${contentDirectory}/`) || !normalizedFile.toLowerCase().endsWith('.md')) return;
        const module = server.moduleGraph.getModuleById(virtualId);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

export default defineConfig(({ isSsrBuild, mode, command }) => {
  const environment = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  const url = (environment.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const keys = [environment.VITE_SUPABASE_PUBLISHABLE_KEY, environment.VITE_SUPABASE_ANON_KEY].filter(Boolean) as string[];
  if (url || keys.length) {
    for (const key of keys.length ? keys : ['']) {
      const problem = backendConfigProblem({ url, key: key.trim(), allowLocal: command === 'serve' });
      if (problem) throw new Error(`Supabase configuration: ${problem}`);
    }
  }
  return {
  plugins: [react(), blogDevelopment()],
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: isSsrBuild ? undefined : {
      input: { portfolio: 'index.html', blog: 'blog/home/index.html' },
    },
  },
  };
});
