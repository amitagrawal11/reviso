import { Container, Title, Text, SimpleGrid, Card, Group, Button } from '@mantine/core';
import { IconFilePlus, IconFolderPlus, IconKeyboard, IconBook } from '@tabler/icons-react';
import { openItemDialog } from '../components/dialogs-lazy';
import { useModePath, useRepo } from '../lib/data-mode';

export default function Home() {
  const repo = useRepo();
  const path = useModePath();
  return (
    <Container size="md" py="xl">
      <Title order={1}>Welcome back</Title>
      <Text c="dimmed" mt="xs">
        Pick up where you left off, or start something new. Everything you write is in plain
        markdown — yours to export at any time.
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="xl">
        <Card withBorder>
          <Group>
            <IconFilePlus />
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
            <IconFolderPlus />
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
            <IconKeyboard />
            <Title order={4}>Keyboard shortcuts</Title>
          </Group>
          <Text c="dimmed" size="sm" mt="xs">
            <strong>⌘K</strong> open search · <strong>⌘\</strong> toggle sidebar ·{' '}
            <strong>⌘.</strong> toggle read mode
          </Text>
        </Card>
        <Card withBorder>
          <Group>
            <IconBook />
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
