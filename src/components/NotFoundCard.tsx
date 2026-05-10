import { Center, Stack, Card, Title, Text, Button, Group, ThemeIcon } from '@mantine/core';
import { IconAlertCircle, IconHome } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

// Friendly fallback shown when a note / collection the user is trying to view
// no longer exists or never persisted (e.g. a Supabase insert failed after
// the optimistic local navigation). Replaces the bare "Note not found" text.
export function NotFoundCard({
  kind,
  homePath,
}: {
  kind: 'note' | 'collection';
  homePath: string;
}) {
  return (
    <Center py="xl" px="md" mih="60vh">
      <Card withBorder p="xl" radius="md" maw={460}>
        <Stack align="center" gap="md">
          <ThemeIcon variant="light" color="yellow" size={48} radius="xl">
            <IconAlertCircle size={26} />
          </ThemeIcon>
          <Stack gap={4} align="center">
            <Title order={3}>We couldn't find this {kind}</Title>
            <Text size="sm" c="dimmed" ta="center">
              It may have been deleted, moved to Trash, or didn't finish saving.
              {kind === 'note' ? ' Any unsaved changes are no longer recoverable.' : ''} If you just
              tried to create it and saw an error, look for the red toast at the bottom of the
              screen for the exact reason.
            </Text>
          </Stack>
          <Group>
            <Button component={Link} to={homePath} leftSection={<IconHome size={16} />}>
              Go home
            </Button>
          </Group>
        </Stack>
      </Card>
    </Center>
  );
}
