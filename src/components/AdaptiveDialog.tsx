/**
 * AdaptiveDialog — renders as a bottom Drawer on compact viewports,
 * as a centred Modal on desktop. Follows the same pub/sub bridge
 * pattern as spotlight-bridge.ts so callers don't need React context.
 *
 * Usage (imperative, from anywhere):
 *   openAdaptiveDialog({ title: 'New note', children: (close) => <Form onClose={close} /> })
 *
 * The host <AdaptiveDialogHost /> must be mounted once inside Shell.tsx
 * (or any component that already has access to Mantine + viewport context).
 */

import { useEffect, useState } from 'react';
import { Drawer, Modal, ScrollArea } from '@mantine/core';
import { useViewport } from '../lib/use-viewport';

export type DialogRequest = {
  id: string;
  title: string;
  children: (close: () => void) => React.ReactNode;
};

// ── Internal pub/sub ────────────────────────────────────────────────────────
const listeners = new Set<(q: DialogRequest[]) => void>();
let queue: DialogRequest[] = [];

function notify() {
  listeners.forEach((l) => l([...queue]));
}

// ── Public imperative API ───────────────────────────────────────────────────
export function openAdaptiveDialog(req: Omit<DialogRequest, 'id'>): string {
  const id = crypto.randomUUID();
  queue = [...queue, { ...req, id }];
  notify();
  return id;
}

export function closeAdaptiveDialog(id: string) {
  queue = queue.filter((r) => r.id !== id);
  notify();
}

// ── Host component — mount once in Shell.tsx ────────────────────────────────
export function AdaptiveDialogHost() {
  const [requests, setRequests] = useState<DialogRequest[]>([]);
  const { class: vpClass } = useViewport();
  const isMobile = vpClass === 'compact';

  useEffect(() => {
    const listener = (q: DialogRequest[]) => setRequests(q);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <>
      {requests.map((req) => {
        const close = () => closeAdaptiveDialog(req.id);

        if (isMobile) {
          return (
            <Drawer
              key={req.id}
              opened
              onClose={close}
              position="bottom"
              radius="12px 12px 0 0"
              size="auto"
              title={req.title}
              keepMounted={false}
              styles={{
                content: { height: 'fit-content !important', maxHeight: '92vh' },
                header: {
                  padding: '16px 16px 8px',
                  fontWeight: 600,
                  fontSize: 16,
                  borderBottom: '1px solid var(--app-border)',
                },
                body: {
                  padding: '16px',
                  paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
                  overflowY: 'auto',
                },
              }}
            >
              {req.children(close)}
            </Drawer>
          );
        }

        return (
          <Modal
            key={req.id}
            opened
            onClose={close}
            title={req.title}
            keepMounted={false}
            scrollAreaComponent={ScrollArea.Autosize}
          >
            {req.children(close)}
          </Modal>
        );
      })}
    </>
  );
}
