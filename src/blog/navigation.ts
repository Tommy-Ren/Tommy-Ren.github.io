export function navigateBlog(path: string, replace = false) {
  const url = new URL(path, window.location.href);
  if (url.origin !== location.origin || !url.pathname.startsWith('/blog/')) { location.assign(url.href); return; }
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}
