import { useSyncExternalStore } from 'react';
import { Badge } from '@mantine/core';
import { WifiOff } from 'lucide-react';
import { Icon } from './Icon';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

export function OfflineIndicator() {
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
      leftSection={<Icon icon={WifiOff} size="sm" />}
      style={{ flexShrink: 0 }}
    >
      Offline
    </Badge>
  );
}
