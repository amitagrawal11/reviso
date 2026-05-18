import { useEffect, useState } from 'react';
import { Badge } from '@mantine/core';
import { WifiOff } from 'lucide-react';
import { ItemIcon } from '@/shared/components/ItemIcon';

const ONLINE_PROBE_PATH = '/favicon.svg';

async function verifyConnectivity(signal: AbortSignal) {
  const probeUrl = new URL(ONLINE_PROBE_PATH, window.location.origin);
  probeUrl.searchParams.set('online-check', String(Date.now()));

  const response = await fetch(probeUrl.toString(), {
    method: 'HEAD',
    cache: 'no-store',
    signal,
  });

  return response.ok;
}

export function OfflineStatusIndicator() {
  const [isOnline, setIsOnline] = useState<boolean | null>(() => (navigator.onLine ? true : null));

  useEffect(() => {
    let isDisposed = false;
    let probeController: AbortController | null = null;

    async function syncFromBrowserSignal() {
      if (navigator.onLine) {
        probeController?.abort();
        setIsOnline(true);
        return;
      }

      probeController?.abort();
      probeController = new AbortController();

      try {
        const reachable = await verifyConnectivity(probeController.signal);
        if (!isDisposed) setIsOnline(reachable);
      } catch {
        if (!isDisposed) setIsOnline(false);
      }
    }

    void syncFromBrowserSignal();
    window.addEventListener('online', syncFromBrowserSignal);
    window.addEventListener('offline', syncFromBrowserSignal);

    return () => {
      isDisposed = true;
      probeController?.abort();
      window.removeEventListener('online', syncFromBrowserSignal);
      window.removeEventListener('offline', syncFromBrowserSignal);
    };
  }, []);

  if (isOnline !== false) return null;

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
