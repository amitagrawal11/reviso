import { useEffect } from 'react';
import { useComputedColorScheme } from '@mantine/core';

// Lazily inject highlight.js theme CSS based on the current Mantine color scheme.
// Two CSS files are loaded once each and toggled via `disabled` so swapping is instant.
export function useHljsTheme() {
  const scheme = useComputedColorScheme('dark');

  useEffect(() => {
    const ensure = async (id: string, importer: () => Promise<unknown>) => {
      if (document.getElementById(id)) return document.getElementById(id) as HTMLLinkElement | HTMLStyleElement;
      // Vite supports ?inline / ?url for CSS — use ?inline so we can swap via a <style> tag.
      const css = (await importer()) as { default: string };
      const el = document.createElement('style');
      el.id = id;
      el.textContent = css.default;
      document.head.appendChild(el);
      return el;
    };

    let cancelled = false;
    (async () => {
      const [light, dark] = await Promise.all([
        ensure('hljs-light', () => import('highlight.js/styles/github.css?inline')),
        ensure('hljs-dark', () => import('highlight.js/styles/github-dark.css?inline')),
      ]);
      if (cancelled) return;
      // Toggle by emptying the inactive sheet's textContent.
      // Actually simpler: keep both as <style>, but use media attr to control which applies.
      light.setAttribute('media', scheme === 'light' ? 'all' : 'not all');
      dark.setAttribute('media', scheme === 'dark' ? 'all' : 'not all');
    })();
    return () => { cancelled = true; };
  }, [scheme]);
}
