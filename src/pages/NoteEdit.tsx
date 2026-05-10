import {
  Group,
  Button,
  TextInput,
  Text,
  SegmentedControl,
  useComputedColorScheme,
} from '@mantine/core';
import { NotFoundCard } from '../components/NotFoundCard';
import { IconCheck } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EditorWithLineNumbers } from '../components/EditorWithLineNumbers';
import { useEffect, useState } from 'react';
import { useItems, useRepo, useModePath } from '../lib/data-mode';
import { notifications } from '@mantine/notifications';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useHljsTheme } from '../lib/hljs-theme';
import { CodeBlock } from '../components/CodeBlock';

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];
const REHYPE_PLUGINS: any[] = [[rehypeHighlight, { detect: true, ignoreMissing: true }]];
const PREVIEW_COMPONENTS = { pre: CodeBlock };
const PREVIEW_OPTIONS = {
  remarkPlugins: REMARK_PLUGINS,
  rehypePlugins: REHYPE_PLUGINS,
  components: PREVIEW_COMPONENTS,
};

export default function NoteEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const items = useItems();
  const note = items.find((i) => i.id === id);
  const scheme = useComputedColorScheme('dark');
  useHljsTheme();
  const repo = useRepo();
  const path = useModePath();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [dirty, setDirty] = useState(false);
  // On mobile we can't show edit + preview side by side. The user picks one
  // pane at a time via this toggle. On desktop it's irrelevant — split view.
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (!note) return;
    if (dirty) return;
    setTitle(note.title);
    setContent(note.content);
  }, [note?.id, note?.title, note?.content, dirty]);

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
    notifications.show({ message: 'Note saved', color: 'green' });
    nav(path(`/n/${note.id}`));
  };

  // Desktop = split (live), mobile = whichever pane the user picked.
  const previewMode: 'live' | 'edit' | 'preview' = isMobile ? mobilePane : 'live';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 60px)',
        padding: isMobile ? '8px 12px' : '12px 16px',
      }}
    >
      <Group mb="sm" justify="space-between" wrap="wrap" gap="xs">
        <TextInput
          value={title}
          onChange={(e) => {
            setTitle(e.currentTarget.value);
            setDirty(true);
          }}
          placeholder="Title"
          style={{ flex: '1 1 200px', minWidth: 0 }}
          size={isMobile ? 'sm' : 'md'}
        />
        <Group gap="xs" wrap="nowrap">
          <Button
            onClick={handleSave}
            size="sm"
            disabled={!dirty}
            leftSection={!isMobile ? <IconCheck size={16} /> : undefined}
          >
            Create
          </Button>
          <Button variant="default" size="sm" component={Link} to={path(`/n/${note.id}`)}>
            Cancel
          </Button>
        </Group>
      </Group>

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

      <div data-color-mode={scheme} style={{ flex: 1, minHeight: 0 }}>
        <EditorWithLineNumbers
          value={content}
          onChange={(v) => {
            setContent(v ?? '');
            setDirty(true);
          }}
          height="100%"
          preview={previewMode}
          hideToolbar={false}
          style={{ height: '100%' }}
          previewOptions={PREVIEW_OPTIONS}
        />
      </div>
      <Text size="xs" c={dirty ? 'yellow.6' : 'dimmed'} mt="xs">
        {dirty ? 'Unsaved changes' : 'All changes saved'}
      </Text>
    </div>
  );
}
