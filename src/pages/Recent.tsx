import { Container, Title, Card, Text, Stack, Group } from '@mantine/core';
import { Link } from 'react-router-dom';
import { useItems, useModePath } from '../lib/data-mode';

export default function Recent() {
  const path = useModePath();
  const items = useItems()
    .filter((i) => !i.trashed && !i.isFolder)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 20);
  return (
    <Container size="md" py="xl">
      <Title order={1} mb="lg">🕘 Recent</Title>
      {items.length === 0 ? (
        <Text c="dimmed">
          Nothing here yet. Notes you create or edit will show up in this list, sorted by most recent first.
        </Text>
      ) : (
        <Stack>
          {items.map((i) => (
            <Card key={i.id} withBorder component={Link} to={path(`/n/${i.id}`)} style={{ textDecoration: 'none' }}>
              <Group justify="space-between">
                <Group gap={6}><span>{i.icon}</span><Text fw={600}>{i.title}</Text></Group>
                <Text size="xs" c="dimmed">{new Date(i.updatedAt).toLocaleString()}</Text>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
