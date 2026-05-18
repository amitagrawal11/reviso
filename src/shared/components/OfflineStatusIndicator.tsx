import { useSyncExternalStore } from 'react';
import { Badge } from '@mantine/core';
import { WifiOff } from 'lucide-react';
import { ItemIcon } from '@/shared/components/ItemIcon';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function OfflineStatusIndicator() {
  const isOnline = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  if (isOnline) return null;

  return (
    <Badge
      variant="light"
      color="orange"
      size="sm"
      leftSection={<ItemIcon icon={WifiOff} size="sm" />}
      style={{ flexShrink: 0 }}
    >
      Offline
    </Badge>
  );
}
