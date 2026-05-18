import { lazy, Suspense, type ComponentProps } from 'react';
import { Skeleton } from '@mantine/core';

const mdModulePromise = () => import('@uiw/react-md-editor');

const Editor = lazy(async () => ({ default: (await mdModulePromise()).default }));

export function MarkdownEditor(props: ComponentProps<typeof Editor>) {
  return (
    <Suspense fallback={<Skeleton height={600} radius="md" />}>
      <Editor {...props} />
    </Suspense>
  );
}

let prefetched = false;
export function prefetchMarkdownEditor(): void {
  if (prefetched) return;
  prefetched = true;
  mdModulePromise().catch(() => {
    prefetched = false;
  });
}
