import { ComponentProps, useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { LazyMarkdownEditor } from './LazyMarkdown';

type Props = ComponentProps<typeof LazyMarkdownEditor>;

// Wrap the markdown editor with a synced line-number gutter.
//
// Layout — single rounded container, two columns:
//   ┌─────────┬───────────────────────────┐
//   │  cap    │       toolbar             │   (top strip — height measured)
//   ├─────────┼───────────────────────────┤
//   │ scroll  │                           │
//   │  1 2 3  │   editor / preview area   │
//   │   …     │                           │
//   └─────────┴───────────────────────────┘
export function EditorWithLineNumbers(props: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineCount = Math.max(1, splitLines(props.value));
  // Toolbar height — measured from the actual rendered toolbar so the cap
  // and line-1 baseline line up perfectly across font / theme changes.
  const [toolbarH, setToolbarH] = useState(0);
  // On phones the line-number gutter eats too much horizontal space.
  // Skip it; the editor renders edge-to-edge.
  const isMobile = useMediaQuery('(max-width: 48em)');

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;

    let textarea: HTMLTextAreaElement | null = null;
    let toolbar: HTMLElement | null = null;
    let onScroll: (() => void) | null = null;
    let resizeObs: ResizeObserver | null = null;

    const wireUp = () => {
      textarea = root.querySelector<HTMLTextAreaElement>('.w-md-editor-text-input');
      toolbar = root.querySelector<HTMLElement>('.w-md-editor-toolbar');
      if (!textarea || !toolbar) return false;

      onScroll = () => {
        if (scrollRef.current) scrollRef.current.scrollTop = textarea!.scrollTop;
      };
      textarea.addEventListener('scroll', onScroll, { passive: true });

      // Track toolbar height — re-measure when its layout changes.
      const measure = () => setToolbarH(toolbar!.offsetHeight);
      measure();
      resizeObs = new ResizeObserver(measure);
      resizeObs.observe(toolbar);
      return true;
    };

    const cleanup = () => {
      if (textarea && onScroll) textarea.removeEventListener('scroll', onScroll);
      if (resizeObs) resizeObs.disconnect();
    };

    if (wireUp()) return cleanup;

    const obs = new MutationObserver(() => {
      if (wireUp()) obs.disconnect();
    });
    obs.observe(root, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      cleanup();
    };
  }, []);

  if (isMobile) {
    return (
      <div ref={wrapRef} className="md-with-gutter md-with-gutter--mobile">
        <div className="md-with-gutter-editor">
          <LazyMarkdownEditor {...props} />
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="md-with-gutter">
      <div className="md-gutter" aria-hidden="true">
        <div className="md-gutter-cap" style={{ height: toolbarH }} />
        <div ref={scrollRef} className="md-gutter-scroll">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1}>{i + 1}</div>
          ))}
        </div>
      </div>
      <div className="md-with-gutter-editor">
        <LazyMarkdownEditor {...props} />
      </div>
    </div>
  );
}

function splitLines(s: unknown): number {
  if (typeof s !== 'string') return 1;
  let count = 1;
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) count++;
  return count;
}
