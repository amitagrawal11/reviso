import { lazy, Suspense, type ComponentProps } from 'react';
import { Skeleton } from '@mantine/core';

const mdModulePromise = () => import('@uiw/react-md-editor');

const Markdown = lazy(async () => ({ default: (await mdModulePromise()).default.Markdown }));

export function MarkdownViewer(props: ComponentProps<typeof Markdown>) {
  return (
    <Suspense fallback={<Skeleton height={300} radius="md" />}>
      <Markdown {...props} />
    </Suspense>
  );
}

let prefetched = false;
export function prefetchMarkdownViewer(): void {
  if (prefetched) return;
  prefetched = true;
  mdModulePromise().catch(() => {
    prefetched = false;
  });
}
