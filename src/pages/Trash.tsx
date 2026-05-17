import { Container, Title, Card, Text, Stack, Group, Button } from '@mantine/core';
import { RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { useItems, useRepo } from '../lib/data-mode';
import { notifications } from '@mantine/notifications';
import { Icon } from '../components/Icon';
import { openAdaptiveDialog } from '../components/AdaptiveDialog';

export default function Trash() {
  const items = useItems().filter((i) => i.trashed);
  const repo = useRepo();

  const emptyTrash = () => {
    if (items.length === 0) return;
    openAdaptiveDialog({
      title: 'Empty trash?',
      children: (close) => (
        <Stack gap="md">
          <Group gap={6} wrap="nowrap">
            <Icon icon={AlertTriangle} size="md" color="var(--mantine-color-red-5)" />
            <Stack gap={4}>
              <Text size="sm">
                This will permanently delete <strong>{items.length}</strong>{' '}
                {items.length === 1 ? 'item' : 'items'}.
              </Text>
              <Text size="sm" c="red.5">
                This cannot be undone.
              </Text>
            </Stack>
          </Group>
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => {
                const count = items.length;
                items.forEach((i) => repo.hardDelete(i.id));
                notifications.show({
                  message: `Emptied trash · ${count} ${count === 1 ? 'item' : 'items'} permanently deleted`,
                  color: 'gray',
                });
                close();
              }}
            >
              Empty trash
            </Button>
          </Group>
        </Stack>
      ),
    });
  };

  const deleteForever = (i: (typeof items)[number]) => {
    openAdaptiveDialog({
      title: 'Delete forever?',
      children: (close) => (
        <Stack gap="md">
          <Text size="sm">
            <strong>{i.title}</strong> and {i.isFolder ? 'everything inside it' : 'its content'}{' '}
            will be removed permanently. This can&apos;t be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => {
                repo.hardDelete(i.id);
                notifications.show({ message: 'Deleted', color: 'gray' });
                close();
              }}
            >
              Delete forever
            </Button>
          </Group>
        </Stack>
      ),
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
            leftSection={<Icon icon={Trash2} size={16} />}
            onClick={emptyTrash}
          >
            Empty trash
          </Button>
        )}
      </Group>
      <Text c="dimmed" size="sm" mb="md">
        Trashed items are kept for 30 days and then deleted automatically. You can restore them or
        empty the bin manually at any time.
      </Text>
      {items.length === 0 ? (
        <Text c="dimmed">
          Trash is empty. Notes and collections you delete from the sidebar will appear here for 30
          days before they&apos;re removed for good.
        </Text>
      ) : (
        <Stack>
          {items.map((i) => (
            <Card key={i.id} withBorder>
              <Group justify="space-between">
                <Group gap={6}>
                  <span>{i.icon}</span>
                  <Text fw={600}>{i.title}</Text>
                  <Text size="xs" c="dimmed">
                    {i.isFolder ? 'Collection' : 'Note'}
                  </Text>
                </Group>
                <Group gap={4}>
                  <Button
                    size="xs"
                    variant="default"
                    leftSection={<Icon icon={RotateCcw} size="sm" />}
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
                    leftSection={<Icon icon={Trash2} size="sm" />}
                    onClick={() => deleteForever(i)}
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
