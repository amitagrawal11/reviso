import { useEffect, useState } from 'react';
import { Text, Button } from '@mantine/core';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthModalSimple } from './AuthModalSimple';
import { useAuth } from '../lib/auth';
import { Icon } from './Icon';

export const DEMO_BANNER_HEIGHT = 44;

// Compact full-width caution banner shown across the top of every demo page.
// Designed to live inside AppShell.Header so it spans sidebar + main columns.
// Always visible in demo mode — not dismissable on purpose: the trade-off
// (you'll lose your notes) is significant enough to warrant the persistent
// reminder while a visitor is exploring.
export function DemoBanner() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const { session } = useAuth();
  const nav = useNavigate();

  // Auto-route to the real app once auth lands.
  useEffect(() => {
    if (session) nav('/', { replace: true });
  }, [session, nav]);

  return (
    <>
      <div className="demo-banner" role="status" aria-live="polite">
        <div className="demo-banner__msg">
          <Icon icon={AlertTriangle} size={16} className="demo-banner__icon" />
          <Text size="sm" truncate>
            <Text span fw={600}>
              You're in the public demo.
            </Text>{' '}
            <Text span c="dimmed">
              Notes are stored in this browser only and won't sync across devices. Create a free
              account to keep them safe.
            </Text>
          </Text>
        </div>
        <div className="demo-banner__actions">
          <Button
            size="compact-sm"
            variant="primary"
            onClick={() => {
              setAuthMode('signup');
              setAuthOpen(true);
            }}
          >
            Create Account
          </Button>
        </div>
      </div>

      <AuthModalSimple
        opened={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
