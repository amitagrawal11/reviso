import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Card,
  Group,
  Button,
  Stack,
  UnstyledButton,
  Skeleton,
  Box,
} from '@mantine/core';
import { FilePlus, FolderPlus, Keyboard, BookOpen, Clock } from 'lucide-react';
import { Icon } from '../components/Icon';
import { openItemDialog } from '../components/dialogs-lazy';
import { useItems, useModePath, useRepo } from '../lib/data-mode';
import { Link } from 'react-router-dom';
import { useState } from 'react';

// Must match the padding in each row so skeletons reserve exactly the right height.
const ROW_HEIGHT = 41; // 10px top + ~21px text line-height + 10px bottom
const SKELETON_ROWS = 10; // matches the .slice(0, 10) limit

export default function Home() {
  const repo = useRepo();
  const path = useModePath();
  const allItems = useItems();

  // Once we've seen a non-empty item list, isLoading stays false permanently
  // (avoids flashing skeletons if the user later deletes all notes).
  const [isLoading, setIsLoading] = useState(() => allItems.length === 0);
  if (isLoading && allItems.length > 0) setIsLoading(false);

  const recentNotes = allItems
    .filter((i) => !i.isFolder && !i.trashed)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 10);

  return (
    <Container size="md" py="xl">
      <Title order={1}>Welcome back</Title>
      <Text c="dimmed" mt="xs">
        Pick up where you left off, or start something new.
      </Text>

      {/* ── Recent notes ── */}
      {/* Always render this section (even while loading) so the Quick Actions
          grid below doesn't shift down when data arrives — the main CLS cause. */}
      {(isLoading || recentNotes.length > 0) && (
        <>
          <Group mt="xl" mb="sm" justify="space-between" align="center">
            <Group gap="xs">
              <Icon icon={Clock} size="md" />
              <Text fw={600} size="sm">
                Recent
              </Text>
            </Group>
            {!isLoading && (
              <Text
                component={Link}
                to={path('/recent')}
                size="xs"
                c="dimmed"
                style={{ textDecoration: 'none' }}
              >
                See all →
              </Text>
            )}
          </Group>
          <Card withBorder p={0}>
            <Stack gap={0}>
              {isLoading
                ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                    <Box
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 16px',
                        height: ROW_HEIGHT,
                        borderTop: i === 0 ? 'none' : '1px solid var(--app-border)',
                      }}
                    >
                      {/* icon placeholder */}
                      <Skeleton circle height={20} width={20} style={{ flexShrink: 0 }} />
                      {/* title placeholder — variable width to look natural */}
                      <Skeleton height={14} width={`${55 + (i % 4) * 10}%`} radius="sm" />
                      {/* date placeholder */}
                      <Skeleton
                        height={12}
                        width={36}
                        radius="sm"
                        style={{ flexShrink: 0, marginLeft: 'auto' }}
                      />
                    </Box>
                  ))
                : recentNotes.map((note, i) => (
                    <UnstyledButton
                      key={note.id}
                      component={Link}
                      to={path(`/n/${note.id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 16px',
                        borderTop: i === 0 ? 'none' : '1px solid var(--app-border)',
                        transition: 'background 120ms',
                      }}
                      styles={{
                        root: {
                          '&:hover': { background: 'var(--app-surface-hi)' },
                        },
                      }}
                    >
                      <Text size="lg" style={{ lineHeight: 1, flexShrink: 0 }}>
                        {note.icon}
                      </Text>
                      <Text size="sm" truncate style={{ flex: 1 }}>
                        {note.title || 'Untitled'}
                      </Text>
                      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                        {new Date(note.updatedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </UnstyledButton>
                  ))}
            </Stack>
          </Card>
        </>
      )}

      {/* ── Quick actions ── */}
      <Group mt="xl" mb="sm" gap="xs">
        <Text fw={600} size="sm">
          Quick actions
        </Text>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card withBorder>
          <Group>
            <Icon icon={FilePlus} size="xl" />
            <Title order={4}>New note</Title>
          </Group>
          <Text c="dimmed" size="sm" mt="xs">
            Open the editor with live preview. Headings, code, tables, mermaid diagrams — all
            standard.
          </Text>
          <Button
            mt="md"
            variant="light"
            onClick={() => openItemDialog({ isFolder: false, repo, path })}
          >
            Create note
          </Button>
        </Card>
        <Card withBorder>
          <Group>
            <Icon icon={FolderPlus} size="xl" />
            <Title order={4}>New collection</Title>
          </Group>
          <Text c="dimmed" size="sm" mt="xs">
            Group related notes into a folder. Nest as deep as you need; reorganize later by
            drag-and-drop.
          </Text>
          <Button
            mt="md"
            variant="light"
            onClick={() => openItemDialog({ isFolder: true, repo, path })}
          >
            Create collection
          </Button>
        </Card>
        <Card withBorder>
          <Group>
            <Icon icon={Keyboard} size="xl" />
            <Title order={4}>Keyboard shortcuts</Title>
          </Group>
          <Text c="dimmed" size="sm" mt="xs">
            <strong>⌘K</strong> open search · <strong>⌘\</strong> toggle sidebar ·{' '}
            <strong>⌘.</strong> toggle read mode
          </Text>
        </Card>
        <Card withBorder>
          <Group>
            <Icon icon={BookOpen} size="xl" />
            <Title order={4}>Read mode</Title>
          </Group>
          <Text c="dimmed" size="sm" mt="xs">
            Collapse the sidebars and the outline for distraction-free reading. Toggle from the
            toolbar of any note.
          </Text>
        </Card>
      </SimpleGrid>
    </Container>
  );
}
