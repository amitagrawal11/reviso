import { Spotlight, SpotlightActionData, spotlight } from '@mantine/spotlight';
import '@mantine/spotlight/styles.css';
import { IconSearch, IconFile, IconFolder } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useItems, useModePath } from '../lib/data-mode';
import { consumePendingSpotlight, subscribeSpotlight } from '../lib/spotlight-bridge';

export default function SpotlightSearch() {
  const items = useItems();
  const nav = useNavigate();
  const path = useModePath();

  // Drain any intent queued before this chunk loaded, plus respond to
  // every subsequent request from the bridge.
  useEffect(() => {
    if (consumePendingSpotlight()) spotlight.open();
    return subscribeSpotlight(() => {
      consumePendingSpotlight();
      spotlight.open();
    });
  }, []);

  const actions: SpotlightActionData[] = useMemo(
    () =>
      items
        .filter((i) => !i.trashed)
        .map((i) => ({
          id: i.id,
          label: i.title,
          description: i.isFolder ? 'Collection' : (i.content.split('\n')[1] ?? '').slice(0, 80),
          leftSection: i.isFolder ? <IconFolder size={18} /> : <IconFile size={18} />,
          onClick: () => nav(path(i.isFolder ? `/c/${i.id}` : `/n/${i.id}`)),
        })),
    [items, nav, path],
  );

  return (
    <Spotlight
      actions={actions}
      shortcut={['mod + K', 'mod + P']}
      nothingFound="Nothing found…"
      highlightQuery
      searchProps={{ leftSection: <IconSearch size={18} />, placeholder: 'Search notes & collections…' }}
    />
  );
}
