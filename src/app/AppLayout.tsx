import {
  AppShell,
  Burger,
  Group,
  ActionIcon,
  Tooltip,
  useMantineColorScheme,
  UnstyledButton,
  Kbd,
  Text,
} from '@mantine/core';
import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { PanelLeftClose, PanelLeftOpen, Moon, Search, Sun } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import NotesSidebar from '@/features/notes/sidebar/NotesSidebar';
import {
  requestSpotlight,
  subscribeSpotlight,
} from '@/features/command-palette/CommandPaletteIntent';
import { useDataMode } from '@/features/notes/repository/NoteRepositoryContext';
import { DEMO_BANNER_HEIGHT, DemoModeBanner } from '@/shared/components/DemoModeBanner';
import { BrandLogo } from '@/shared/components/BrandLogo';
import { OfflineStatusIndicator } from '@/shared/components/OfflineStatusIndicator';
import { PwaInstallPrompt } from '@/shared/components/PwaInstallPrompt';
import { ItemIcon } from '@/shared/components/ItemIcon';
import {
  MobileBottomNavigationBar,
  BOTTOM_NAV_HEIGHT,
} from '@/shared/components/MobileBottomNavigationBar';
import { AdaptiveDialogHost } from '@/shared/components/AdaptiveDialog';

// NoteQuickCaptureButton carries rehype + highlight.js. Lazy-load it so those chunks
// stay out of the AppLayout bundle. The bridge (openQuickCapture) is a separate
// tiny module imported directly by NotesSidebar, so the FAB can open on demand
// even before this chunk has loaded (the listener just fires once it mounts).
const NoteQuickCaptureButton = lazy(() =>
  import('@/features/notes/quick-capture/NoteQuickCaptureButton').then((m) => ({
    default: m.NoteQuickCaptureButton,
  })),
);
import { useViewport } from '@/shared/hooks/UseViewport';

const HEADER_HEIGHT = 56;

// Reads the condensed note title set by NoteView's IntersectionObserver.
// On mobile, when the user scrolls past the large title, this replaces
// the brand name in the header with a compact one-line note title.
function CondensedTitle() {
  const title = useSyncExternalStore(
    (onChange) => {
      const mo = new MutationObserver(onChange);
      mo.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-condensed-title'],
      });
      return () => mo.disconnect();
    },
    () => document.documentElement.getAttribute('data-condensed-title') ?? null,
  );

  if (title) {
    return (
      <Text
        size="sm"
        fw={600}
        truncate
        hiddenFrom="sm"
        style={{ letterSpacing: '-0.01em', maxWidth: '55vw' }}
      >
        {title}
      </Text>
    );
  }

  return (
    <a
      href="/"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <BrandLogo size={24} />
      <strong>Reviso</strong>
    </a>
  );
}

const CommandPaletteSearch = lazy(() => import('@/features/command-palette/CommandPaletteSearch'));

export default function AppLayout() {
  const [isMobileOpen, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  const [isDesktopOpen, { toggle: toggleDesktop }] = useDisclosure(true);
  const [readMode, setReadMode] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [spotlightLive, setSpotlightLive] = useState(false);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { mode } = useDataMode();
  const showBanner = mode === 'demo';
  const totalHeaderH = HEADER_HEIGHT + (showBanner ? DEMO_BANNER_HEIGHT : 0);
  const viewport = useViewport();
  // Two navigation patterns:
  //   compact (<600)    — bottom nav + burger-drawer sidebar
  //   medium+ (≥600)    — 280px full sidebar (always visible by default;
  //                       toggleable on ≥sm via header button)
  // The 72px tablet nav rail was removed — it added complexity for a window
  // size users don't dwell at; the full sidebar at medium width is fine.
  const showBottomNav = viewport.class === 'compact';
  const location = useLocation();
  // Hide the quick-capture FAB on edit pages — user is already editing.
  const isEditRoute = location.pathname.endsWith('/edit');

  useHotkeys([
    ['mod+\\', () => toggleDesktop()],
    ['mod+.', () => setReadMode((r) => !r)],
    ['mod+K', () => requestSpotlight()],
  ]);

  useEffect(() => {
    const unsub = subscribeSpotlight(() => setSpotlightLive(true));
    return unsub;
  }, []);

  return (
    <>
      {/* Skip-to-content — visually hidden until keyboard focus. WCAG 2.4.1. */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {spotlightLive && (
        <Suspense fallback={null}>
          <CommandPaletteSearch />
        </Suspense>
      )}
      <AppShell
        // Extend header height by env(safe-area-inset-top) so the header
        // background extends behind the notch / status bar in PWA standalone
        // mode. The inner banner / header-row absorb the inset via their
        // own padding (see below) so visible content stays clear of the notch.
        header={{ height: `calc(${totalHeaderH}px + env(safe-area-inset-top))` }}
        // Bottom nav on compact only. The footer extends behind the home
        // indicator via env(safe-area-inset-bottom) inside the nav itself.
        footer={
          showBottomNav
            ? { height: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))` }
            : undefined
        }
        navbar={{
          width: { base: 260, md: 280, lg: 300, xl: 320 },
          breakpoint: 'sm',
          collapsed: {
            mobile: !isMobileOpen,
            desktop: !isDesktopOpen || readMode,
          },
        }}
        padding={0}
      >
        <AppShell.Header p={0} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          {showBanner && <DemoModeBanner />}
          <div
            className="app-header-row"
            style={{
              padding:
                '0 max(16px, env(safe-area-inset-left)) 0 max(16px, env(safe-area-inset-right))',
              height: HEADER_HEIGHT,
            }}
          >
            {/* Left */}
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
              <Burger
                opened={isMobileOpen}
                onClick={toggleMobile}
                hiddenFrom="sm"
                size="sm"
                style={{ flexShrink: 0 }}
                aria-label={isMobileOpen ? 'Close navigation' : 'Open navigation'}
              />
              {/* On mobile: when the note title has scrolled off-screen, show a
                  condensed version of it in place of the brand. Reads the value
                  from the data-condensed-title attribute set by NoteView. */}
              <CondensedTitle />
            </Group>

            {/* Center: full search bar on tablet+; icon-only on mobile */}
            <UnstyledButton
              onClick={requestSpotlight}
              className="app-header-search"
              visibleFrom="sm"
              style={{
                width: '100%',
                border: '1px solid var(--app-border, var(--mantine-color-default-border))',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                fontSize: 'var(--text-sm)',
                background: 'var(--app-surface, var(--mantine-color-default))',
                transition: 'border-color 120ms, background 120ms',
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap={8} c="dimmed" wrap="nowrap">
                  <ItemIcon icon={Search} size="md" />
                  <Text size="sm" c="dimmed" truncate>
                    Search notes & collections…
                  </Text>
                </Group>
                <Kbd size="xs">⌘ K</Kbd>
              </Group>
            </UnstyledButton>

            {/* Right — view controls grouped together. flex:1 mirrors the left
                group so the center search bar sits exactly in the middle. */}
            <Group gap={4} wrap="nowrap" justify="flex-end" style={{ flex: 1 }}>
              <PwaInstallPrompt />
              <OfflineStatusIndicator />
              <Tooltip label="Search" withinPortal={false}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Search"
                  onClick={requestSpotlight}
                  hiddenFrom="sm"
                >
                  <ItemIcon icon={Search} size="lg" />
                </ActionIcon>
              </Tooltip>
              <Tooltip
                label={isDesktopOpen ? 'Hide sidebar (⌘\\)' : 'Show sidebar (⌘\\)'}
                withinPortal={false}
              >
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={isDesktopOpen ? 'Hide sidebar' : 'Show sidebar'}
                  onClick={toggleDesktop}
                  visibleFrom="sm"
                >
                  {isDesktopOpen ? (
                    <ItemIcon icon={PanelLeftClose} size="lg" />
                  ) : (
                    <ItemIcon icon={PanelLeftOpen} size="lg" />
                  )}
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Theme" withinPortal={false}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Toggle theme"
                  onClick={toggleColorScheme}
                >
                  {colorScheme === 'dark' ? (
                    <ItemIcon icon={Sun} size="lg" />
                  ) : (
                    <ItemIcon icon={Moon} size="lg" />
                  )}
                </ActionIcon>
              </Tooltip>
            </Group>
          </div>
        </AppShell.Header>

        <AppShell.Navbar p="xs">
          <NotesSidebar closeMobile={closeMobile} />
        </AppShell.Navbar>

        <AppShell.Main id="main-content">
          <Outlet context={{ readMode, setReadMode, tocOpen, setTocOpen }} />
        </AppShell.Main>

        {showBottomNav && (
          <AppShell.Footer p={0} withBorder={false}>
            <MobileBottomNavigationBar onOpenDrawer={toggleMobile} />
          </AppShell.Footer>
        )}

        {/* NoteQuickCaptureButton is always mounted (even on desktop) so the bridge
            listener is active and the sidebar + button can open the drawer.
            The FAB button itself only renders on compact. Lazy-loaded so
            rehype/highlight.js stay out of the AppLayout chunk. */}
        {!isEditRoute && (
          <Suspense fallback={null}>
            <NoteQuickCaptureButton showFab={showBottomNav} bottomOffset={BOTTOM_NAV_HEIGHT + 16} />
          </Suspense>
        )}
        <AdaptiveDialogHost />
      </AppShell>
    </>
  );
}
