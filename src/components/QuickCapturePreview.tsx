/**
 * Markdown preview pane for the QuickCaptureFab drawer.
 * Kept in its own file so it (and its rehype/highlight.js imports) can be
 * lazy-loaded only when the user switches to the Preview tab.
 */
import { Box, Text } from '@mantine/core';
import { LazyMarkdownView } from './LazyMarkdown';
import { CodeBlock } from './CodeBlock';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

const REHYPE_PLUGINS = [
  rehypeSlug,
  [rehypeHighlight, { detect: true, ignoreMissing: true }],
] as Parameters<typeof LazyMarkdownView>[0]['rehypePlugins'];

const REMARK_PLUGINS = [remarkGfm, remarkBreaks] as Parameters<
  typeof LazyMarkdownView
>[0]['remarkPlugins'];

const VIEW_COMPONENTS = { pre: CodeBlock } as Parameters<typeof LazyMarkdownView>[0]['components'];

export default function QuickCapturePreview({
  source,
  colorScheme,
}: {
  source: string;
  colorScheme: string;
}) {
  return (
    <Box
      className="markdown"
      data-color-mode={colorScheme === 'dark' ? 'dark' : 'light'}
      style={{ padding: '16px 0 24px' }}
    >
      {source.trim() ? (
        <LazyMarkdownView
          source={source}
          rehypePlugins={REHYPE_PLUGINS}
          remarkPlugins={REMARK_PLUGINS}
          components={VIEW_COMPONENTS}
        />
      ) : (
        <Text c="dimmed" size="sm">
          Nothing to preview yet.
        </Text>
      )}
    </Box>
  );
}
