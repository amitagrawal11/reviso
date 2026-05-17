import {
  Group,
  Text,
  Breadcrumbs,
  Anchor,
  TypographyStylesProvider,
  ActionIcon,
  useComputedColorScheme,
  Box,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { BookOpen, Pencil, Star, Trash2 } from 'lucide-react';
import { Icon } from '../components/Icon';
import { Tooltip } from '@mantine/core';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef, useState, type ComponentProps } from 'react';
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
type RehypePlugins = ComponentProps<typeof LazyMarkdownView>['rehypePlugins'];
const REHYPE_PLUGINS: RehypePlugins = [
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
  const wideEnough = useMediaQuery('(min-width: 1100px)');
  const isMobile = useMediaQuery('(max-width: 48em)');
  // Sentinel div sits just below the note title. When it scrolls out of view
  // the title condenses into the header bar (iOS large-title pattern).
  const titleSentinelRef = useRef<HTMLDivElement>(null);
  const [, setTitleScrolled] = useState(false);

  // If the note we're looking at gets deleted or moved to Trash (e.g. via the
  // sidebar context menu while we're viewing it), bail out to home rather
  // than render a stale page or "Note not found".
  useEffect(() => {
    if (!note || note.trashed) {
      nav(path('/'), { replace: true });
    }
  }, [note, nav, path]);

  // Default the TOC to open on wide viewports, closed on narrow ones — but only
  // on first viewport-width change for this view; subsequent toggles come from header.
  useEffect(() => {
    setTocOpen(!!wideEnough);
  }, [wideEnough, setTocOpen]);

  // Large-title-on-scroll: observe the sentinel div just below the title.
  // When it exits the top of the viewport, write the note title into a
  // data attribute on <html> so the Shell header can display it.
  useEffect(() => {
    if (!isMobile) {
      document.documentElement.removeAttribute('data-condensed-title');
      return;
    }
    const el = titleSentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setTitleScrolled(!entry.isIntersecting);
        if (!entry.isIntersecting) {
          document.documentElement.setAttribute('data-condensed-title', note?.title ?? '');
        } else {
          document.documentElement.removeAttribute('data-condensed-title');
        }
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      document.documentElement.removeAttribute('data-condensed-title');
    };
  }, [isMobile, note?.id, note?.title]);

  if (!note || note.trashed) return null;
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
        // Content well — capped at a comfortable reading width on every
        // surface. Long lines hurt scan speed; ~65-75 characters per line
        // is the readability sweet spot. Read mode gets a slightly wider
        // cap (1100px) for code blocks / diagrams.
        maxWidth: readMode ? 'min(1100px, 92vw)' : '760px',
        margin: '0 auto',
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
            <Icon icon={BookOpen} size="md" />
          </ActionIcon>
        </Tooltip>
      )}
      {!readMode && (
        <Group justify="space-between" mb="md">
          <Breadcrumbs>
            <Anchor component={Link} to={path('/')} size="sm" c="dimmed">
              Home
            </Anchor>
            {crumbs.map((c) => (
              <Anchor key={c.id} component={Link} to={path(`/c/${c.id}`)} size="sm" c="dimmed">
                {c.title}
              </Anchor>
            ))}
            <Text size="sm" fw={600} component="span">
              {note.title}
            </Text>
          </Breadcrumbs>
          <Group gap={6}>
            <Tooltip label={note.starred ? 'Unstar' : 'Star'}>
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => repo.update(note.id, { starred: !note.starred })}
                aria-label={note.starred ? 'Unstar note' : 'Star note'}
              >
                {note.starred ? (
                  <Icon icon={Star} size="md" fill="currentColor" color="gold" />
                ) : (
                  <Icon icon={Star} size="md" />
                )}
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
                <Icon icon={BookOpen} size="md" />
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
                <Icon icon={Pencil} size="md" />
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
                <Icon icon={Trash2} size="md" />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      )}
      {/* Title block */}
      <h1 className="display-title note-title-row">
        <span className="note-title-icon" aria-hidden="true">
          {note.icon}
        </span>
        <span>{note.title}</span>
      </h1>
      <p className="caption note-title-caption">
        Last edited {new Date(note.updatedAt).toLocaleString()} · {wordCount(note.content)} words
      </p>
      {/* Sentinel: sits right after the title block. IntersectionObserver
          watches it — when it scrolls off-screen the header shows the
          condensed note title (mobile large-title pattern). */}
      <div ref={titleSentinelRef} aria-hidden="true" style={{ height: 0 }} />
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
