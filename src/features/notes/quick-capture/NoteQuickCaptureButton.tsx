import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  ActionIcon,
  Tooltip,
  Drawer,
  Text,
  TextInput,
  Select,
  Group,
  Button,
  Box,
  SegmentedControl,
} from '@mantine/core';
import { Plus, X } from 'lucide-react';
import { useMantineColorScheme } from '@mantine/core';
import { ItemIcon } from '@/shared/components/ItemIcon';
import { useRepo, useItems } from '@/features/notes/repository/NoteRepositoryContext';
import { subscribeQuickCapture } from '@/features/notes/quick-capture/NoteQuickCaptureIntent';

// The preview pane (MarkdownViewer + rehype-highlight + highlight.js) is
// only loaded when the user taps the Preview tab — not on AppLayout mount.
const LazyPreview = lazy(() => import('@/features/notes/quick-capture/NoteQuickCapturePreview'));

interface QuickCaptureFabProps {
  bottomOffset?: number;
  /** Show the floating action button. Pass false on desktop — the drawer is
   *  still available via openQuickCapture() but no FAB renders. */
  showFab?: boolean;
}

export function NoteQuickCaptureButton({
  bottomOffset = 16,
  showFab = true,
}: QuickCaptureFabProps) {
  const repo = useRepo();
  const items = useItems();

  const { colorScheme } = useMantineColorScheme();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Subscribe to the imperative bridge so sidebar buttons can open this drawer.
  const handleOpenWithParent = useCallback((pid?: string | null) => {
    setParentId(pid ?? null);
    setOpen(true);
  }, []);

  useEffect(() => subscribeQuickCapture(handleOpenWithParent), [handleOpenWithParent]);

  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 100);
      // Warm the preview chunk as soon as the drawer opens so tapping Preview
      // is instant rather than waiting for the highlight.js download.
      void import('@/features/notes/quick-capture/NoteQuickCapturePreview');
    } else {
      setTitle('');
      setContent('');
      setParentId(null);
      setTab('edit');
    }
  }, [open]);

  const folders = items.filter((i) => i.isFolder && !i.trashed);
  const collectionData = [
    { value: '', label: 'Top level' },
    ...folders.map((f) => ({ value: f.id, label: `${f.icon}  ${f.title || 'Untitled'}` })),
  ];

  function saveNote() {
    if (!title.trim()) return;
    const body = content.trim();
    repo.create({
      title: title.trim(),
      isFolder: false,
      parentId: parentId || null,
      content: body ? `# ${title.trim()}\n\n${body}` : `# ${title.trim()}\n\n`,
    });
    setOpen(false);
  }

  function onTitleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('qcf-body')?.focus();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function onBodyKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false);
  }

  const canSave = title.trim().length > 0;
  const previewSource = [title.trim() ? `# ${title}` : '', content].filter(Boolean).join('\n\n');

  return (
    <>
      {showFab && (
        <Tooltip label="New note" position="left" withArrow>
          <ActionIcon
            className="quick-capture-fab"
            aria-label="New note"
            onClick={() => setOpen(true)}
            style={{ bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom))` }}
          >
            <ItemIcon icon={Plus} size="xl" />
          </ActionIcon>
        </Tooltip>
      )}

      <Drawer
        opened={open}
        onClose={() => setOpen(false)}
        position="bottom"
        size="92vh"
        radius="16px 16px 0 0"
        withCloseButton={false}
        keepMounted={false}
        styles={{
          body: {
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          },
          content: {
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Grabber */}
        <Box
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 12,
            paddingBottom: 4,
            flexShrink: 0,
          }}
        >
          <Box style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--app-border)' }} />
        </Box>

        {/* Top bar */}
        <Group
          justify="space-between"
          align="center"
          px="md"
          py="xs"
          style={{ flexShrink: 0, borderBottom: '1px solid var(--app-border)' }}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <ItemIcon icon={X} size="md" />
          </ActionIcon>

          <SegmentedControl
            size="xs"
            value={tab}
            onChange={(v) => setTab(v as 'edit' | 'preview')}
            data={[
              { label: 'Edit', value: 'edit' },
              { label: 'Preview', value: 'preview' },
            ]}
          />

          {/* spacer to balance the close button */}
          <Box style={{ width: 28 }} />
        </Group>

        {/* Title — hidden in preview mode */}
        {tab === 'edit' && (
          <Box px="lg" pt="lg" pb="md" style={{ flexShrink: 0 }}>
            <TextInput
              ref={titleRef}
              placeholder="Note title"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              onKeyDown={onTitleKey}
              variant="unstyled"
              styles={{
                input: {
                  fontSize: 24,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  padding: 0,
                  height: 'auto',
                  color: 'var(--mantine-color-text)',
                },
              }}
            />
            <Box style={{ height: 1, background: 'var(--app-border)', marginTop: 12 }} />
          </Box>
        )}

        {/* Body */}
        <Box
          px="lg"
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          {tab === 'edit' ? (
            <textarea
              id="qcf-body"
              value={content}
              onChange={(e) => setContent(e.currentTarget.value)}
              onKeyDown={onBodyKey}
              placeholder="Write something…"
              style={{
                flex: 1,
                width: '100%',
                resize: 'none',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--mantine-color-text)',
                fontSize: 15,
                lineHeight: 1.7,
                fontFamily: 'inherit',
                padding: '4px 0 16px',
              }}
            />
          ) : (
            <Suspense
              fallback={
                <Text c="dimmed" size="sm" py="md">
                  Loading preview…
                </Text>
              }
            >
              <LazyPreview source={previewSource} colorScheme={colorScheme} />
            </Suspense>
          )}
        </Box>

        {/* Bottom action bar */}
        <Box
          style={{
            flexShrink: 0,
            borderTop: '1px solid var(--app-border)',
            paddingBottom: `env(safe-area-inset-bottom)`,
            background: 'var(--app-surface)',
          }}
        >
          <Box
            px="md"
            py="xs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: '1px solid var(--app-border)',
            }}
          >
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              Save to
            </Text>
            <Select
              data={collectionData}
              value={parentId ?? ''}
              onChange={(v) => setParentId(v || null)}
              allowDeselect={false}
              size="xs"
              variant="filled"
              style={{ flex: 1, maxWidth: 200 }}
              comboboxProps={{ withinPortal: false }}
            />
          </Box>

          <Group px="md" py="sm" gap="sm" grow>
            <Button variant="default" size="md" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="md" onClick={() => saveNote()} disabled={!canSave}>
              Save
            </Button>
          </Group>
        </Box>
      </Drawer>
    </>
  );
}
