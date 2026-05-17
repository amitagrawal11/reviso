import {
  Container,
  Title,
  Group,
  Button,
  Card,
  Text,
  SimpleGrid,
  Breadcrumbs,
  Anchor,
} from '@mantine/core';
import { FilePlus } from 'lucide-react';
import { Icon } from '../components/Icon';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useItems, useModePath, useRepo } from '../lib/data-mode';
import { openItemDialog } from '../components/dialogs-lazy';

export default function CollectionView() {
  const { id } = useParams();
  const allItems = useItems();
  const items = allItems.filter((i) => !i.trashed);
  const path = useModePath();
  const repo = useRepo();
  const nav = useNavigate();
  const rawCollection = allItems.find((i) => i.id === id);
  const collection = rawCollection && !rawCollection.trashed ? rawCollection : null;
  const children = items.filter((i) => i.parentId === id);

  // If the collection is gone or trashed (e.g. deleted from the sidebar while
  // we're viewing it), bail back to home in the same data-mode tree.
  useEffect(() => {
    if (!collection) {
      nav(path('/'), { replace: true });
    }
  }, [collection, nav, path]);

  if (!collection) return null; // redirect effect above takes us home

  const crumbs: { id: string; title: string }[] = [];
  let cur = collection.parentId;
  while (cur) {
    const p = items.find((i) => i.id === cur);
    if (!p) break;
    crumbs.unshift({ id: p.id, title: p.title });
    cur = p.parentId;
  }

  return (
    <Container size="md" py="xl">
      <Breadcrumbs mb="md">
        <Anchor component={Link} to={path('/')} size="sm" c="dimmed">
          Home
        </Anchor>
        {crumbs.map((c) => (
          <Anchor key={c.id} component={Link} to={path(`/c/${c.id}`)} size="sm" c="dimmed">
            {c.title}
          </Anchor>
        ))}
        <Text size="sm" fw={600} component="span">
          {collection.title}
        </Text>
      </Breadcrumbs>
      <Group justify="space-between" mb="lg">
        <Title order={1}>
          <span style={{ marginRight: 8 }}>{collection.icon}</span>
          {collection.title}
        </Title>
        <Button
          leftSection={<Icon icon={FilePlus} size={16} />}
          onClick={() => openItemDialog({ isFolder: false, parentId: collection.id, repo, path })}
        >
          New note
        </Button>
      </Group>

      {children.length === 0 ? (
        <Card withBorder>
          <Text c="dimmed">This collection is empty. Create a note to get started.</Text>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {children.map((c) => (
            <Card
              key={c.id}
              withBorder
              component={Link}
              to={path(c.isFolder ? `/c/${c.id}` : `/n/${c.id}`)}
              style={{ textDecoration: 'none' }}
            >
              <Group gap={6}>
                <span style={{ fontSize: 18 }}>{c.icon}</span>
                <Text fw={600}>{c.title}</Text>
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                {c.isFolder
                  ? 'Collection'
                  : `Updated ${new Date(c.updatedAt).toLocaleDateString()}`}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}
