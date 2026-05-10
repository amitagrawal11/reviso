import { Group, Title, Text, Breadcrumbs, Anchor, TypographyStylesProvider, ActionIcon, useComputedColorScheme, Box } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconBook, IconPencil, IconStar, IconStarFilled, IconTrash } from '@tabler/icons-react';
import { Tooltip } from '@mantine/core';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { LazyMarkdownView } from '../components/LazyMarkdown';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useItems, useRepo, useModePath } from '../lib/data-mode';
import { useHljsTheme } from '../lib/hljs-theme';
import { CodeBlock } from '../components/CodeBlock';
import { openConfirm } from '../components/dialogs-lazy';

const TocSidebar = lazy(() => import('../components/TocSidebar'));

// Hoisted plugin/component arrays — stable reference across renders so
// react-md-editor doesn't recompile its plugin pipeline on every keystroke.
const REHYPE_PLUGINS: any[] = [
  rehypeSlug,
  [rehypeAutolinkHeadings, { behavior: 'wrap' }],
  [rehypeHighlight, { detect: true, ignoreMissing: true }],
];
// remark-breaks: a single newline becomes a hard break in the rendered output,
// matching the intuition most users have from chat / notes apps.
const REMARK_PLUGINS = [remarkGfm, remarkBreaks];
const VIEW_COMPONENTS = { pre: CodeBlock };

// Robust word count — empty / whitespace-only content was reporting "1 word".
function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export default function NoteView() {
  const { id } = useParams();
  const items = useItems();
  const note = items.find((i) => i.id === id);
  const { readMode, setReadMode, tocOpen, setTocOpen } = useOutletContext<{
    readMode: boolean;
    setReadMode: (v: boolean | ((prev: boolean) => boolean)) => void;
    tocOpen: boolean;
    setTocOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  }>();
  const scheme = useComputedColorScheme('dark');
  useHljsTheme();
  const repo = useRepo();
  const path = useModePath();
  const nav = useNavigate();

  // If the note we're looking at gets deleted or moved to Trash (e.g. via the
  // sidebar context menu while we're viewing it), bail out to home rather
  // than render a stale page or "Note not found".
  useEffect(() => {
    if (!note || note.trashed) {
      nav(path('/'), { replace: true });
    }
  }, [note?.id, note?.trashed, nav, path]);
  if (!note || note.trashed) return null;
  // Default the TOC to open on wide viewports, closed on narrow ones — but only
  // on first viewport-width change for this view; subsequent toggles come from header.
  const wideEnough = useMediaQuery('(min-width: 1100px)');
  useEffect(() => {
    setTocOpen(!!wideEnough);
  }, [wideEnough, setTocOpen]);
  const showToc = !readMode && tocOpen;

  // (early-return for missing/trashed handled above by the redirect effect)

  const crumbs: { id: string; title: string }[] = [];
  let cur = note.parentId;
  while (cur) {
    const p = items.find((i) => i.id === cur);
    if (!p) break;
    crumbs.unshift({ id: p.id, title: p.title });
    cur = p.parentId;
  }

  const article = (
    <div
      style={{
        padding: readMode ? '40px 48px' : '24px 32px',
        // Use most of the viewport in read mode but keep a comfortable cap so
        // line length doesn't blow past ~120 chars on huge displays.
        maxWidth: readMode ? 'min(1100px, 92vw)' : 'none',
        margin: readMode ? '0 auto' : 0,
        position: 'relative',
      }}
    >
      {readMode && (
        <Tooltip label="Exit read mode (⌘.)">
          <ActionIcon
            variant="filled"
            color="blue"
            size="lg"
            onClick={() => setReadMode(false)}
            aria-label="Exit read mode"
            // Match the article's padding so the button sits flush with the
            // top-right corner of the content rectangle, not floating in the
            // padding zone outside it.
            style={{ position: 'absolute', top: 40, right: 48 }}
          >
            <IconBook size={18} />
          </ActionIcon>
        </Tooltip>
      )}
      {!readMode && (
        <Group justify="space-between" mb="md">
          <Breadcrumbs>
            <Anchor component={Link} to={path('/')} size="sm" c="dimmed">Home</Anchor>
            {crumbs.map((c) => (
              <Anchor key={c.id} component={Link} to={path(`/c/${c.id}`)} size="sm" c="dimmed">
                {c.title}
              </Anchor>
            ))}
            <Text size="sm" fw={600} component="span">{note.title}</Text>
          </Breadcrumbs>
          <Group gap={6}>
            <Tooltip label={note.starred ? 'Unstar' : 'Star'}>
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => repo.update(note.id, { starred: !note.starred })}
                aria-label={note.starred ? 'Unstar note' : 'Star note'}
              >
                {note.starred ? <IconStarFilled size={18} color="gold" /> : <IconStar size={18} />}
              </ActionIcon>
            </Tooltip>
            <Tooltip label={readMode ? 'Exit read mode (⌘.)' : 'Read mode (⌘.)'}>
              <ActionIcon
                variant={readMode ? 'filled' : 'default'}
                color={readMode ? 'blue' : undefined}
                size="lg"
                onClick={() => setReadMode((r) => !r)}
                aria-label="Toggle read mode"
              >
                <IconBook size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Edit">
              <ActionIcon
                component={Link}
                to={path(`/n/${note.id}/edit`)}
                variant="default"
                size="lg"
                aria-label="Edit note"
              >
                <IconPencil size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Move to Trash">
              <ActionIcon
                variant="default"
                size="lg"
                color="red"
                onClick={() => openConfirm(note, repo)}
                aria-label="Move note to Trash"
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      )}
      <Title order={1} mb={4}>
        <span style={{ marginRight: 8 }}>{note.icon}</span>{note.title}
      </Title>
      <Text size="xs" c="dimmed" mb="lg">
        Last edited {new Date(note.updatedAt).toLocaleString()} · {wordCount(note.content)} words
      </Text>
      <TypographyStylesProvider>
        <div className="markdown" data-color-mode={scheme}>
          <LazyMarkdownView
            source={note.content}
            rehypePlugins={REHYPE_PLUGINS}
            remarkPlugins={REMARK_PLUGINS}
            components={VIEW_COMPONENTS}
            style={{ background: 'transparent', color: 'inherit' }}
          />
        </div>
      </TypographyStylesProvider>
    </div>
  );

  if (!showToc) return article;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 0 }}>
      <div style={{ minWidth: 0 }}>{article}</div>
      <Box
        pt="xl"
        pr="md"
        pl="md"
        style={{
          position: 'sticky',
          top: 60,
          alignSelf: 'start',
          maxHeight: 'calc(100vh - 80px)',
          overflow: 'auto',
          borderLeft: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Suspense fallback={null}>
          <TocSidebar />
        </Suspense>
      </Box>
    </div>
  );
}
