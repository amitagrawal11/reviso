import { useEffect, useRef, useState } from 'react';
import { useComputedColorScheme } from '@mantine/core';
import type Mermaid from 'mermaid';

// Lazy-load mermaid only when a diagram actually renders. ~150 KB gz.
let mermaidPromise: Promise<typeof Mermaid> | null = null;
let lastTheme: 'dark' | 'default' | null = null;

async function getMermaid(theme: 'dark' | 'default') {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => m.default);
  }
  const mermaid = await mermaidPromise;
  if (lastTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      theme,
      // 'antiscript' permits <foreignObject> / HTML labels (so syntax like
      // `A["text >= b?"]` still renders) but strips <script> / event handlers,
      // closing the most obvious XSS vector. Use 'strict' once we want to
      // disallow HTML labels entirely, or 'sandbox' if we ever render
      // diagrams from untrusted sources (renders inside an iframe).
      securityLevel: 'antiscript',
      fontFamily: 'inherit',
    });
    lastTheme = theme;
  }
  return mermaid;
}

let counter = 0;
const nextId = () => `mmd-${++counter}`;

export function MermaidDiagramRenderer({ source }: { source: string }) {
  const idRef = useRef<string>(nextId());
  const ref = useRef<HTMLDivElement>(null);
  const scheme = useComputedColorScheme('dark');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = await getMermaid(scheme === 'dark' ? 'dark' : 'default');
        const { svg } = await mermaid.render(idRef.current, source.trim());
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svg;
        // Add a11y affordances to the rendered SVG so screen readers don't
        // skip over it silently.
        const svgEl = ref.current.querySelector('svg');
        if (svgEl) {
          svgEl.setAttribute('role', 'img');
          svgEl.setAttribute('aria-label', 'Diagram');
          if (!svgEl.querySelector('title')) {
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = source.split('\n').slice(0, 1).join('').trim() || 'Mermaid diagram';
            svgEl.insertBefore(title, svgEl.firstChild);
          }
        }
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message ?? 'Diagram error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, scheme]);

  if (error) {
    return (
      <pre style={{ color: 'var(--mantine-color-red-5)', whiteSpace: 'pre-wrap', fontSize: 12 }}>
        Mermaid error: {error}
        {'\n\n'}
        {source}
      </pre>
    );
  }

  return (
    <div
      ref={ref}
      className="mermaid-block"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 100,
        padding: '12px 8px',
        background: 'var(--mantine-color-default)',
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 8,
        overflow: 'auto',
        margin: '12px 0',
      }}
    />
  );
}
