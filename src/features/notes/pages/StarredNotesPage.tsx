import { Container, Title, Card, Text, Stack, Group } from '@mantine/core';
import { Link } from 'react-router-dom';
import { useItems, useModePath } from '@/features/notes/repository/NoteRepositoryContext';

export default function StarredNotesPage() {
  const items = useItems().filter((i) => !i.trashed && i.starred);
  const path = useModePath();
  return (
    <Container size="md" py="xl">
      <Title order={1} mb="lg">
        ⭐ Starred
      </Title>
      {items.length === 0 ? (
        <Text c="dimmed">
          You haven't starred any notes yet. Star a note from its toolbar to keep it within easy
          reach.
        </Text>
      ) : (
        <Stack>
          {items.map((i) => (
            <Card
              key={i.id}
              withBorder
              component={Link}
              to={path(`/n/${i.id}`)}
              style={{ textDecoration: 'none' }}
            >
              <Group gap={6}>
                <span>{i.icon}</span>
                <Text fw={600}>{i.title}</Text>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
