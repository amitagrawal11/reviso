import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { MarkdownEditor } from '@/features/notes/editor/MarkdownEditor';
import { NoteEditorLineGutter } from '@/features/notes/editor/NoteEditorLineGutter';
import { usePreferences } from '@/shared/lib/UserPreferences';

type Props = ComponentProps<typeof MarkdownEditor>;

export function NoteEditor(props: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineCount = Math.max(1, splitLines(props.value));
  const [toolbarH, setToolbarH] = useState(0);
  const isMobile = useMediaQuery('(max-width: 48em)');
  const { lineNumbers: showLineNumbers, spellcheck } = usePreferences();

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    const apply = () => {
      const ta = root.querySelector<HTMLTextAreaElement>('.w-md-editor-text-input');
      if (ta) ta.spellcheck = spellcheck;
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(root, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [spellcheck]);

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

  if (isMobile || !showLineNumbers) {
    return (
      <div ref={wrapRef} className="md-with-gutter md-with-gutter--mobile">
        <div className="md-with-gutter-editor">
          <MarkdownEditor {...props} />
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="md-with-gutter">
      <NoteEditorLineGutter ref={scrollRef} lineCount={lineCount} toolbarHeight={toolbarH} />
      <div className="md-with-gutter-editor">
        <MarkdownEditor {...props} />
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
