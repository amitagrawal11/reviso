import { Container, Title, Card, Text, Stack, Group, Button } from '@mantine/core';
import { IconRestore, IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import { useItems, useRepo } from '../lib/data-mode';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';

export default function Trash() {
  const items = useItems().filter((i) => i.trashed);
  const repo = useRepo();

  const emptyTrash = () => {
    if (items.length === 0) return;
    modals.openConfirmModal({
      title: (
        <Group gap={6} wrap="nowrap">
          <IconAlertTriangle size={18} color="var(--mantine-color-red-5)" />
          <Text fw={600}>Empty trash?</Text>
        </Group>
      ),
      children: (
        <Stack gap="xs">
          <Text size="sm">
            This will permanently delete <strong>{items.length}</strong>{' '}
            {items.length === 1 ? 'item' : 'items'}.
          </Text>
          <Text size="sm" c="red.5">
            This cannot be undone. Trashed notes and collections will be lost forever.
          </Text>
        </Stack>
      ),
      labels: { confirm: 'Empty trash', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        const count = items.length;
        items.forEach((i) => repo.hardDelete(i.id));
        notifications.show({
          message: `Emptied trash · ${count} ${count === 1 ? 'item' : 'items'} permanently deleted`,
          color: 'gray',
        });
      },
    });
  };

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" align="center" mb="lg" wrap="nowrap">
        <Title order={1}>🗑️ Trash</Title>
        {items.length > 0 && (
          <Button
            color="red"
            variant="light"
            leftSection={<IconTrash size={16} />}
            onClick={emptyTrash}
          >
            Empty trash
          </Button>
        )}
      </Group>
      <Text c="dimmed" size="sm" mb="md">
        Trashed items are kept for 30 days and then deleted automatically. You can restore them or empty the bin manually at any time.
      </Text>
      {items.length === 0 ? (
        <Text c="dimmed">
          Trash is empty. Notes and collections you delete from the sidebar will appear here for 30 days before they're removed for good.
        </Text>
      ) : (
        <Stack>
          {items.map((i) => (
            <Card key={i.id} withBorder>
              <Group justify="space-between">
                <Group gap={6}>
                  <span>{i.icon}</span>
                  <Text fw={600}>{i.title}</Text>
                  <Text size="xs" c="dimmed">{i.isFolder ? 'Collection' : 'Note'}</Text>
                </Group>
                <Group gap={4}>
                  <Button
                    size="xs"
                    variant="default"
                    leftSection={<IconRestore size={14} />}
                    onClick={() => {
                      repo.restore(i.id);
                      notifications.show({ message: 'Restored', color: 'green' });
                    }}
                  >
                    Restore
                  </Button>
                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => {
                      modals.openConfirmModal({
                        title: `Permanently delete “${i.title}”?`,
                        children: (
                          <Text size="sm">
                            This action can't be undone. The {i.isFolder ? 'collection and everything inside it' : 'note and its content'} will be removed for good.
                          </Text>
                        ),
                        labels: { confirm: 'Delete forever', cancel: 'Cancel' },
                        confirmProps: { color: 'red' },
                        onConfirm: () => {
                          repo.hardDelete(i.id);
                          notifications.show({ message: 'Deleted', color: 'gray' });
                        },
                      });
                    }}
                  >
                    Delete forever
                  </Button>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
