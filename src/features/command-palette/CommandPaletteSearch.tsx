/**
 * CommandPaletteSearch — command palette (⌘K).
 *
 * Phase 13: grouped sections with keyboard hints.
 *   1. Actions   — New note (⌘N), New collection (⌘⇧N), Toggle theme (⌘J)
 *   2. Recent    — most recently edited 8 notes
 *   3. Notes     — every non-trashed, non-recent note
 *   4. Collections — non-trashed folders
 *
 * Lazy-loaded via CommandPaletteIntent so neither the palette UI nor any of
 * its action plumbing lands on the landing critical chunk.
 */

import { Spotlight, type SpotlightActionGroupData, spotlight } from '@mantine/spotlight';
import '@mantine/spotlight/styles.css';
import {
  Search,
  File,
  Folder,
  FilePlus,
  FolderPlus,
  Moon,
  Sun,
  Clock,
  Star,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useMantineColorScheme, Kbd, Group, Text } from '@mantine/core';
import { ItemIcon } from '@/shared/components/ItemIcon';
import { useItems, useRepo, useModePath } from '@/features/notes/repository/NoteRepositoryContext';
import {
  consumePendingSpotlight,
  subscribeSpotlight,
} from '@/features/command-palette/CommandPaletteIntent';
import { openItemDialog, prefetchDialogs } from '@/features/notes/dialogs/NotesDialogs';

const RECENT_LIMIT = 8;

export default function CommandPaletteSearch() {
  const items = useItems();
  const nav = useNavigate();
  const path = useModePath();
  const repo = useRepo();
  const { toggleColorScheme, colorScheme } = useMantineColorScheme();

  // Drain any intent queued before this chunk loaded, plus respond to every
  // subsequent request from the bridge.
  useEffect(() => {
    if (consumePendingSpotlight()) spotlight.open();
    return subscribeSpotlight(() => {
      consumePendingSpotlight();
      spotlight.open();
    });
    // Prefetch the dialogs chunk so opening the palette doesn't have a tap-
    // through-load delay on the "New note" / "New collection" actions.
  }, []);

  useEffect(() => {
    prefetchDialogs();
  }, []);

  const groups: SpotlightActionGroupData[] = useMemo(() => {
    const live = items.filter((i) => !i.trashed);
    // updatedAt is ISO string in mock-repo and supabase-repo alike.
    const notes = live
      .filter((i) => !i.isFolder)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    const folders = live.filter((i) => i.isFolder);
    const recent = notes.slice(0, RECENT_LIMIT);
    const recentIds = new Set(recent.map((n) => n.id));
    const otherNotes = notes.filter((n) => !recentIds.has(n.id));

    const noteAction = (i: (typeof notes)[number]) => ({
      id: i.id,
      label: i.title,
      description: (i.content.split('\n').find((l) => l.trim().length > 0) ?? '').slice(0, 80),
      leftSection: <ItemIcon icon={File} size="md" />,
      onClick: () => nav(path(`/n/${i.id}`)),
    });
    const folderAction = (i: (typeof folders)[number]) => ({
      id: i.id,
      label: i.title,
      description: 'Collection',
      leftSection: <ItemIcon icon={Folder} size="md" />,
      onClick: () => nav(path(`/c/${i.id}`)),
    });

    return [
      {
        group: 'Actions',
        actions: [
          {
            id: 'action-new-note',
            label: 'New note',
            description: 'Create and open the editor',
            leftSection: <ItemIcon icon={FilePlus} size="md" />,
            rightSection: <KbdHint keys={['⌘', 'N']} />,
            onClick: () => openItemDialog({ isFolder: false, repo, path }),
          },
          {
            id: 'action-new-collection',
            label: 'New collection',
            description: 'Group notes into a folder',
            leftSection: <ItemIcon icon={FolderPlus} size="md" />,
            rightSection: <KbdHint keys={['⌘', '⇧', 'N']} />,
            onClick: () => openItemDialog({ isFolder: true, repo, path }),
          },
          {
            id: 'action-toggle-theme',
            label: colorScheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
            description: 'Reviso adapts both themes for long sessions',
            leftSection: <ItemIcon icon={colorScheme === 'dark' ? Sun : Moon} size="md" />,
            rightSection: <KbdHint keys={['⌘', 'J']} />,
            onClick: () => toggleColorScheme(),
          },
        ],
      },
      // "Go to" routes that no longer live in the primary nav. Trash matters
      // for recovery, so keep it discoverable via ⌘K.
      {
        group: 'Go to',
        actions: [
          {
            id: 'goto-recent',
            label: 'Recent',
            description: 'Most recently edited notes',
            leftSection: <ItemIcon icon={Clock} size="md" />,
            onClick: () => nav(path('/recent')),
          },
          {
            id: 'goto-starred',
            label: 'Starred',
            description: 'Notes you have marked with a star',
            leftSection: <ItemIcon icon={Star} size="md" />,
            onClick: () => nav(path('/starred')),
          },
          {
            id: 'goto-trash',
            label: 'Trash',
            description: 'Restore or permanently delete trashed notes',
            leftSection: <ItemIcon icon={Trash2} size="md" />,
            onClick: () => nav(path('/trash')),
          },
        ],
      },
      ...(recent.length ? [{ group: 'Recent notes', actions: recent.map(noteAction) }] : []),
      ...(otherNotes.length ? [{ group: 'All notes', actions: otherNotes.map(noteAction) }] : []),
      ...(folders.length ? [{ group: 'Collections', actions: folders.map(folderAction) }] : []),
    ];
  }, [items, nav, path, repo, colorScheme, toggleColorScheme]);

  return (
    <Spotlight
      actions={groups}
      shortcut={['mod + K', 'mod + P']}
      nothingFound="Nothing found…"
      highlightQuery
      searchProps={{
        leftSection: <ItemIcon icon={Search} size="md" />,
        placeholder: 'Search or run a command…',
      }}
    />
  );
}

/** Renders ⌘N-style keyboard hint chips at the end of a palette row. */
function KbdHint({ keys }: { keys: string[] }) {
  return (
    <Group gap={4} wrap="nowrap">
      {keys.map((k, i) => (
        <Kbd key={`${k}-${i}`} size="xs">
          {k}
        </Kbd>
      ))}
      <Text component="span" size="xs" c="dimmed" visibleFrom="sm">
        {' '}
      </Text>
    </Group>
  );
}
