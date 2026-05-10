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
} from "@mantine/core";
import { useDisclosure, useHotkeys } from "@mantine/hooks";
import {
  IconBook,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLayoutSidebarRightExpand,
  IconLayoutSidebarRightCollapse,
  IconMoon,
  IconSearch,
  IconSun,
} from "@tabler/icons-react";
import { Outlet, useLocation, useMatch, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import { requestSpotlight, subscribeSpotlight } from "../lib/spotlight-bridge";
import { useDataMode } from "../lib/data-mode";
import { DEMO_BANNER_HEIGHT, DemoBanner } from "./DemoBanner";

const HEADER_HEIGHT = 56;

const SpotlightSearch = lazy(() => import("./SpotlightSearch"));

export default function Shell() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const [readMode, setReadMode] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [spotlightLive, setSpotlightLive] = useState(false);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const nav = useNavigate();
  const { mode } = useDataMode();
  const showBanner = mode === "demo";
  const totalHeaderH = HEADER_HEIGHT + (showBanner ? DEMO_BANNER_HEIGHT : 0);
  useLocation(); // re-render on route change

  useHotkeys([
    ["mod+\\", () => toggleDesktop()],
    ["mod+.", () => setReadMode((r) => !r)],
    ["mod+K", () => requestSpotlight()]
  ]);

  useEffect(() => {
    const unsub = subscribeSpotlight(() => setSpotlightLive(true));
    return unsub;
  }, []);

  return (
    <>
      {spotlightLive && (
        <Suspense fallback={null}>
          <SpotlightSearch />
        </Suspense>
      )}
      <AppShell
        header={{ height: totalHeaderH }}
        navbar={{
          width: 280,
          breakpoint: "sm",
          collapsed: {
            mobile: !mobileOpened,
            desktop: !desktopOpened || readMode,
          },
        }}
        padding={0}
      >
        <AppShell.Header p={0}>
          {showBanner && <DemoBanner />}
          <div
            className="app-header-row"
            style={{ padding: "0 16px", height: HEADER_HEIGHT }}
          >
            {/* Left */}
            <Group gap="xs" wrap="nowrap">
              <Burger
                opened={mobileOpened}
                onClick={toggleMobile}
                hiddenFrom="sm"
                size="sm"
              />
              {/* Brand always routes to "/" — landing for guests, real Home for
                  signed-in users. From demo mode this also exits the demo. */}
              <Group
                gap={6}
                style={{ cursor: "pointer" }}
                onClick={() => nav("/")}
                wrap="nowrap"
              >
                <IconBook size={20} />
                <strong>Notes</strong>
              </Group>
            </Group>

            {/* Center: full search bar on tablet+; icon-only on mobile */}
            <UnstyledButton
              onClick={requestSpotlight}
              className="app-header-search"
              visibleFrom="sm"
              style={{
                width: "100%",
                border:
                  "1px solid var(--app-border, var(--mantine-color-default-border))",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 13,
                background: "var(--app-surface, var(--mantine-color-default))",
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap={6} c="dimmed" wrap="nowrap">
                  <IconSearch size={16} />
                  <Text size="sm" c="dimmed" truncate>
                    Search notes & collections…
                  </Text>
                </Group>
                <Kbd size="xs">⌘ K</Kbd>
              </Group>
            </UnstyledButton>

            {/* Right — view controls grouped together */}
            <Group gap={4} wrap="nowrap" justify="flex-end">
              <Tooltip label="Search">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={requestSpotlight}
                  hiddenFrom="sm"
                >
                  <IconSearch size={20} />
                </ActionIcon>
              </Tooltip>
              <Tooltip
                label={
                  desktopOpened ? "Hide sidebar (⌘\\)" : "Show sidebar (⌘\\)"
                }
              >
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={toggleDesktop}
                  visibleFrom="sm"
                >
                  {desktopOpened ? (
                    <IconLayoutSidebarLeftCollapse size={20} />
                  ) : (
                    <IconLayoutSidebarLeftExpand size={20} />
                  )}
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Show outline">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={() => setTocOpen(prev => !prev)}
                  >
                    {tocOpen ? (
                    <IconLayoutSidebarRightCollapse size={20} />
                  ) : (
                    <IconLayoutSidebarRightExpand  size={20} />
                  )}
                    
                  </ActionIcon>
                </Tooltip>
              <Tooltip label="Theme">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={toggleColorScheme}
                >
                  {colorScheme === "dark" ? (
                    <IconSun size={20} />
                  ) : (
                    <IconMoon size={20} />
                  )}
                </ActionIcon>
              </Tooltip>
            </Group>
          </div>
        </AppShell.Header>

        <AppShell.Navbar p="xs">
          <Sidebar />
        </AppShell.Navbar>

        <AppShell.Main>
          <Outlet context={{ readMode, setReadMode, tocOpen, setTocOpen }} />
        </AppShell.Main>
      </AppShell>
    </>
  );
}
