import { useEffect, useState } from 'react';
import { Button } from '@mantine/core';
import { Download } from 'lucide-react';
import { Icon } from './Icon';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa-install-dismissed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(DISMISSED_KEY));

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'dismissed') {
      localStorage.setItem(DISMISSED_KEY, '1');
      setDismissed(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <Button
      size="xs"
      variant="light"
      leftSection={<Icon icon={Download} size="sm" />}
      onClick={handleInstall}
      visibleFrom="sm"
      style={{ flexShrink: 0 }}
    >
      Install app
    </Button>
  );
}
