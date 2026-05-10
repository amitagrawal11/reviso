import { lazy, Suspense, ComponentProps } from 'react';
import { Skeleton } from '@mantine/core';

// Default build includes Prism — gives the editor pane its own markdown
// source highlighting (headings, bold, fenced blocks). Costs ~60 KB extra,
// paid only when the user navigates to a note view/edit (chunk is lazy).
const mdModulePromise = () => import('@uiw/react-md-editor');

const Editor = lazy(async () => ({ default: (await mdModulePromise()).default }));
const Markdown = lazy(async () => ({ default: (await mdModulePromise()).default.Markdown }));

export function LazyMarkdownView(props: ComponentProps<typeof Markdown>) {
  return (
    <Suspense fallback={<Skeleton height={300} radius="md" />}>
      <Markdown {...props} />
    </Suspense>
  );
}

export function LazyMarkdownEditor(props: ComponentProps<typeof Editor>) {
  return (
    <Suspense fallback={<Skeleton height={600} radius="md" />}>
      <Editor {...props} />
    </Suspense>
  );
}

// Intent-based prefetch only. Call on hover / focus of note links.
let prefetched = false;
export function prefetchMarkdown() {
  if (prefetched) return;
  prefetched = true;
  mdModulePromise().catch(() => {
    prefetched = false;
  });
}
