import {
  Group,
  Button,
  TextInput,
  Text,
  SegmentedControl,
  useComputedColorScheme,
  Box,
} from '@mantine/core';
import { NotFoundCard } from '../components/NotFoundCard';
import { Check } from 'lucide-react';
import { Icon } from '../components/Icon';
import { useMediaQuery } from '@mantine/hooks';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { EditorWithLineNumbers } from '../components/EditorWithLineNumbers';
import { useEffect, useState, type ComponentProps } from 'react';
import { useItems, useRepo, useModePath } from '../lib/data-mode';
import { usePreferences } from '../lib/preferences';
import { notifications } from '@mantine/notifications';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useHljsTheme } from '../lib/hljs-theme';
import { CodeBlock } from '../components/CodeBlock';
import { LazyMarkdownView } from '../components/LazyMarkdown';

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];
type RehypePlugins = ComponentProps<typeof LazyMarkdownView>['rehypePlugins'];
const REHYPE_PLUGINS: RehypePlugins = [[rehypeHighlight, { detect: true, ignoreMissing: true }]];
const PREVIEW_COMPONENTS = { pre: CodeBlock };
const PREVIEW_OPTIONS = {
  remarkPlugins: REMARK_PLUGINS,
  rehypePlugins: REHYPE_PLUGINS,
  components: PREVIEW_COMPONENTS,
};

export default function NoteEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  // ?new=1 means the note was just created by the dialog — cancel should
  // hard-delete it so the user doesn't end up with an empty orphan note.
  const isNew = searchParams.get('new') === '1';
  const items = useItems();
  const note = items.find((i) => i.id === id);
  const scheme = useComputedColorScheme('dark');
  useHljsTheme();
  const repo = useRepo();
  const path = useModePath();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const prefs = usePreferences();
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [dirty, setDirty] = useState(false);
  // On mobile we can't show edit + preview side by side. The user picks one
  // pane at a time via this toggle. Initial pane honors the user's
  // `defaultView` pref where mobile-meaningful ('edit' or 'preview'); 'split'
  // falls back to 'edit' since there is no mobile split.
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>(
    prefs.defaultView === 'preview' ? 'preview' : 'edit',
  );

  useEffect(() => {
    if (!note) return;
    if (dirty) return;
    setTitle(note.title);
    setContent(note.content);
  }, [note, dirty]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  if (!note) return <NotFoundCard kind="note" homePath={path('/')} />;

  const handleSave = () => {
    repo.update(note.id, { title, content });
    setDirty(false);
    notifications.show({ message: isNew ? 'Note created' : 'Note saved', color: 'green' });
    nav(path(`/n/${note.id}`));
  };

  const handleCancel = () => {
    if (isNew) {
      // Note was just created by the dialog but never saved — discard it.
      repo.hardDelete(note.id);
      nav(path('/'));
    } else {
      nav(path(`/n/${note.id}`));
    }
  };

  // Desktop respects the user's defaultView preference (edit / split / preview);
  // mobile uses whichever pane is selected via the segmented control.
  // The md-editor calls these: 'live' = side-by-side, 'edit' / 'preview' = single pane.
  const desktopMode: 'live' | 'edit' | 'preview' =
    prefs.defaultView === 'split' ? 'live' : prefs.defaultView;
  const previewMode: 'live' | 'edit' | 'preview' = isMobile ? mobilePane : desktopMode;

  return (
    <div
      className="note-edit-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        // On mobile the bottom save bar is fixed, so don't add bottom padding
        // here — it would double up with the bar's own reserved space.
        // On mobile the save bar is fixed (52px) above the bottom nav —
        // pad the flex column so the editor scrolls clear of it.
        padding: isMobile ? '8px 12px 72px' : '12px 16px',
      }}
    >
      {/* Desktop header row — title + save/cancel buttons */}
      {!isMobile && (
        <Group mb="sm" justify="space-between" wrap="wrap" gap="xs">
          <TextInput
            value={title}
            onChange={(e) => {
              setTitle(e.currentTarget.value);
              setDirty(true);
            }}
            placeholder="Title"
            style={{ flex: '1 1 200px', minWidth: 0 }}
            size="md"
          />
          <Group gap="xs" wrap="nowrap">
            <Button
              onClick={handleSave}
              size="sm"
              disabled={!dirty}
              leftSection={<Icon icon={Check} size={16} />}
            >
              {isNew ? 'Create' : 'Save'}
            </Button>
            <Button variant="default" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </Group>
        </Group>
      )}

      {/* Mobile header — just the title input */}
      {isMobile && (
        <TextInput
          value={title}
          onChange={(e) => {
            setTitle(e.currentTarget.value);
            setDirty(true);
          }}
          placeholder="Title"
          size="sm"
          mb="xs"
          style={{ width: '100%' }}
        />
      )}

      {/* On mobile: a clear toggle between edit and preview panes. */}
      {isMobile && (
        <SegmentedControl
          fullWidth
          mb="xs"
          size="xs"
          value={mobilePane}
          onChange={(v) => setMobilePane(v as 'edit' | 'preview')}
          data={[
            { label: 'Edit', value: 'edit' },
            { label: 'Preview', value: 'preview' },
          ]}
        />
      )}

      {/* flex column + overflow hidden so EditorWithLineNumbers can fill
          the remaining height via flex:1 without needing height:"100%" on
          a parent that has no explicit height (which Chrome can't resolve). */}
      <div
        data-color-mode={scheme}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <EditorWithLineNumbers
          value={content}
          onChange={(v) => {
            setContent(v ?? '');
            setDirty(true);
          }}
          height="100%"
          preview={previewMode}
          hideToolbar={false}
          style={{ flex: 1, minHeight: 0 }}
          previewOptions={PREVIEW_OPTIONS}
        />
      </div>

      {/* Desktop status line */}
      {!isMobile && (
        <Text size="xs" c={dirty ? 'yellow.6' : 'dimmed'} mt="xs">
          {dirty ? 'Unsaved changes' : 'All changes saved'}
        </Text>
      )}

      {/* Mobile bottom save bar — fixed above the BottomNav so it's always
          reachable. Uses env(safe-area-inset-bottom) so it clears the iPhone
          home indicator when installed as a PWA. */}
      {isMobile && (
        <Box className="editor-save-bar">
          <Group gap={6} align="center" style={{ flex: 1 }}>
            <span
              className="editor-save-bar__dot"
              style={{
                background: dirty ? 'var(--mantine-color-yellow-6)' : 'var(--color-success)',
              }}
            />
            <Text size="xs" c={dirty ? 'yellow.6' : 'dimmed'}>
              {dirty ? 'Unsaved changes' : 'All changes saved'}
            </Text>
          </Group>
          <Group gap="xs">
            <Button variant="default" size="xs" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              size="xs"
              disabled={!dirty}
              onClick={handleSave}
              leftSection={<Icon icon={Check} size={14} />}
            >
              {isNew ? 'Create' : 'Save'}
            </Button>
          </Group>
        </Box>
      )}
    </div>
  );
}
