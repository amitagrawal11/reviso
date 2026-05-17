import {
  Avatar,
  Group,
  Text,
  UnstyledButton,
  ScrollArea,
  ActionIcon,
  Menu,
  Stack,
  Box,
  Drawer,
  Divider,
} from '@mantine/core';
import {
  Plus,
  Star,
  Trash2,
  ChevronRight,
  Ellipsis,
  Pencil,
  FilePlus,
  FolderPlus,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  pointerWithin,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core';
import { Item } from '../mock/data';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../lib/auth';
import { Icon } from './Icon';
import { useViewport } from '../lib/use-viewport';
import { supabase } from '../lib/supabase';
import { useNavigate as useNav } from 'react-router-dom';
import { useItems, useRepo, useModePath, useDataMode, usingSupabase } from '../lib/data-mode';
import { openQuickCapture } from '../lib/quick-capture-bridge';
import {
  openItemDialog,
  openConfirm,
  openRenameDialog,
  prefetchDialogs,
} from '../components/dialogs-lazy';
import { prefetchMarkdown } from '../components/LazyMarkdown';

// Passed down from Shell so note/collection clicks auto-close the mobile drawer.
const CloseMobileCtx = createContext<(() => void) | null>(null);
const useCloseMobile = () => useContext(CloseMobileCtx);

// Walk descendants of a folder via a precomputed children index — O(N) overall
// regardless of tree depth. Used both for DnD validation and tree rendering.
function isDescendantOrSelf(
  childrenByParent: Map<string | null, Item[]>,
  rootId: string,
  candidateId: string,
): boolean {
  if (rootId === candidateId) return true;
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === candidateId) return true;
    (childrenByParent.get(id) ?? []).forEach((c) => stack.push(c.id));
  }
  return false;
}

// Persist folder open/closed state across navigation in localStorage so
// expanding a deep tree doesn't reset every time the sidebar remounts.
const OPEN_STATE_KEY = 'notes-folder-open-v1';

function loadOpenState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(OPEN_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore malformed localStorage data and fall back to defaults.
  }
  return {};
}

function saveOpenState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(OPEN_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage write failures.
  }
}

export default function Sidebar({ closeMobile }: { closeMobile?: () => void }) {
  const all = useItems();
  const { class: vpClass } = useViewport();
  const isCompact = vpClass === 'compact';

  // Precompute everything we need per `all` snapshot:
  // - filtered (non-trashed) items
  // - parent → children index
  // - root list
  // - badge counts
  // Avoids re-filtering at every CollectionNode render (was O(N × depth)).
  const { items, childrenByParent, roots } = useMemo(() => {
    const items = all.filter((i) => !i.trashed);
    const childrenByParent = new Map<string | null, Item[]>();
    for (const i of items) {
      const list = childrenByParent.get(i.parentId);
      if (list) list.push(i);
      else childrenByParent.set(i.parentId, [i]);
    }
    return {
      items,
      childrenByParent,
      roots: childrenByParent.get(null) ?? [],
    };
  }, [all]);

  const path = useModePath();
  // Folder open/closed state lives at the Sidebar level + persists.
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(loadOpenState);
  const isOpen = useCallback(
    (id: string) => (id in openMap ? openMap[id] : false), // default collapsed
    [openMap],
  );
  const toggleOpen = useCallback((id: string) => {
    setOpenMap((prev) => {
      const wasOpen = id in prev ? prev[id] : false;
      const next = { ...prev, [id]: !wasOpen };
      saveOpenState(next);
      return next;
    });
  }, []);

  // Auto-expand ancestors of the active note/folder so the active item
  // is always visible in the tree without the user having to open folders.
  const location = useLocation();
  useEffect(() => {
    // Extract the active id from /n/:id, /n/:id/edit, or /c/:id routes.
    const match = location.pathname.match(/\/(?:n|c)\/([^/]+)/);
    if (!match) return;
    const activeId = match[1];
    const byId = new Map(items.map((i) => [i.id, i]));
    // Walk up the ancestor chain collecting folder ids to open.
    const toOpen: string[] = [];
    let cur = byId.get(activeId);
    while (cur?.parentId) {
      toOpen.push(cur.parentId);
      cur = byId.get(cur.parentId);
    }
    if (toOpen.length === 0) return;
    setOpenMap((prev) => {
      // Only update if any ancestor isn't already open — avoids infinite loop.
      if (toOpen.every((id) => prev[id])) return prev;
      const next = { ...prev };
      for (const id of toOpen) next[id] = true;
      saveOpenState(next);
      return next;
    });
  }, [location.pathname, items]);

  // Mouse: 5 px movement disambiguates drag from click.
  // Touch: 250 ms long-press to start dragging — this lets the user
  // scroll the sidebar with a normal swipe without accidentally
  // picking up rows.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const repo = useRepo();

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const draggedId = String(e.active.id);
    const overId = e.over?.id != null ? String(e.over.id) : undefined;
    if (!overId) return;

    // overId is either "root" or a folder id.
    const newParent = overId === 'root' ? null : overId;
    const dragged = items.find((i) => i.id === draggedId);
    if (!dragged) return;

    // Prevent invalid moves.
    if (
      newParent &&
      dragged.isFolder &&
      isDescendantOrSelf(childrenByParent, draggedId, newParent)
    ) {
      notifications.show({ message: "Can't move a folder into itself", color: 'yellow' });
      return;
    }
    if (dragged.parentId === newParent) return; // no-op

    repo.update(draggedId, { parentId: newParent });
    const target = newParent ? items.find((i) => i.id === newParent)?.title : 'top level';
    notifications.show({ message: `Moved "${dragged.title}" to ${target}`, color: 'green' });
  }

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  return (
    <CloseMobileCtx.Provider value={closeMobile ?? null}>
      <Stack gap="xs" h="100%">
        <Group justify="space-between" px={6}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">
            Notes
          </Text>
          <Group gap={4}>
            <ActionIcon
              size="sm"
              variant="default"
              onMouseEnter={prefetchDialogs}
              onClick={() => openItemDialog({ isFolder: true, repo, path })}
              title="New collection"
              aria-label="New collection"
            >
              <Icon icon={FolderPlus} size={16} />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="default"
              onMouseEnter={prefetchDialogs}
              onClick={() =>
                isCompact ? openQuickCapture() : openItemDialog({ isFolder: false, repo, path })
              }
              title="New note"
              aria-label="New note"
            >
              <Icon icon={Plus} size={16} />
            </ActionIcon>
          </Group>
        </Group>

        <ScrollArea style={{ flex: 1 }} type="hover">
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={(e) => setActiveId(e.active.id as string)}
            onDragCancel={() => setActiveId(null)}
            onDragEnd={handleDragEnd}
          >
            <RootDropZone>
              <Stack gap={2}>
                {roots.map((r) =>
                  r.isFolder ? (
                    <CollectionNode
                      key={r.id}
                      item={r}
                      childrenByParent={childrenByParent}
                      depth={0}
                      activeId={activeId}
                      isOpen={isOpen}
                      toggleOpen={toggleOpen}
                    />
                  ) : (
                    <NoteRow key={r.id} item={r} depth={0} />
                  ),
                )}
                {roots.length === 0 && (
                  <Text size="xs" c="dimmed" px={6}>
                    No collections or notes yet. Click + to create one.
                  </Text>
                )}
              </Stack>
            </RootDropZone>
            <DragOverlay>
              {activeItem ? (
                <Box
                  px={8}
                  py={4}
                  style={{
                    background: 'var(--mantine-color-default)',
                    border: '1px solid var(--mantine-color-default-border)',
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                >
                  <Group gap={6} wrap="nowrap">
                    <span>{activeItem.icon}</span>
                    <Text size="sm">{activeItem.title}</Text>
                  </Group>
                </Box>
              ) : null}
            </DragOverlay>
          </DndContext>
        </ScrollArea>

        {/* Recent / Starred / Trash nav rows were removed — they cluttered the
          sidebar without earning their slot. Folder tree above is the primary
          surface; Trash is still reachable via the command palette (⌘K) so
          users can restore deleted notes. */}
        <ProfileMenu />
      </Stack>
    </CloseMobileCtx.Provider>
  );
}

function ProfileMenu() {
  const { session, profile } = useAuth();
  const { mode } = useDataMode();
  const nav = useNav();
  const { isTouch } = useViewport();

  // In demo mode the DemoBanner up top handles the sign-in / sign-up CTAs.
  // No profile footer here — the demo isn't tied to any account.
  if (mode === 'demo') return null;

  const email = session?.user.email ?? '';
  const display =
    profile?.name?.trim() ||
    (session?.user.user_metadata?.full_name as string | undefined)?.trim() ||
    email.split('@')[0] ||
    'User';
  const initial = (display[0] ?? 'U').toUpperCase();

  const signOut = async () => {
    if (!usingSupabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      notifications.show({ message: error.message, color: 'red' });
      return;
    }
    nav('/', { replace: true });
  };

  return (
    <Menu shadow="md" width={220} position="top-start" withArrow withinPortal={false}>
      <Menu.Target>
        <UnstyledButton
          className="profile-trigger"
          px="sm"
          py={10}
          style={{
            borderTop: '1px solid var(--mantine-color-default-border)',
            borderRadius: 0,
            display: 'block',
          }}
        >
          <Group gap="sm" wrap="nowrap" align="center">
            <Avatar radius="xl" color="blue" size={isTouch ? 'lg' : 'md'}>
              {initial}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={600} truncate lh={1.2}>
                {display}
              </Text>
              <Text size="xs" c="dimmed" truncate lh={1.2} mt={2}>
                {email}
              </Text>
            </div>
            <Icon icon={ChevronRight} size={16} style={{ flexShrink: 0, opacity: 0.6 }} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Account</Menu.Label>
        <Menu.Item leftSection={<Icon icon={User} size={16} />} onClick={() => nav('/profile')}>
          Profile
        </Menu.Item>
        <Menu.Item
          leftSection={<Icon icon={Settings} size={16} />}
          onClick={() => nav('/settings')}
        >
          Settings
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<Icon icon={LogOut} size={16} />} onClick={signOut}>
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function RootDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'root' });
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: '100%',
        background: isOver ? 'var(--mantine-color-default-hover)' : 'transparent',
        borderRadius: 6,
        transition: 'background-color 120ms',
      }}
    >
      {children}
    </div>
  );
}

function CollectionNode({
  item,
  childrenByParent,
  depth,
  activeId,
  isOpen,
  toggleOpen,
}: {
  item: Item;
  childrenByParent: Map<string | null, Item[]>;
  depth: number;
  activeId: string | null;
  isOpen: (id: string) => boolean;
  toggleOpen: (id: string) => void;
}) {
  const open = isOpen(item.id);
  const children = childrenByParent.get(item.id) ?? [];
  const nav = useNavigate();
  const path = useModePath();
  const closeMobile = useCloseMobile();

  // This folder accepts drops, unless the active drag is itself or a descendant.
  const canDrop =
    !!activeId && !isDescendantOrSelf(childrenByParent, item.id, activeId) && activeId !== item.id;
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: item.id,
    disabled: !canDrop,
  });

  return (
    <div
      ref={setDropRef}
      style={{
        background: isOver && canDrop ? 'var(--mantine-color-blue-light)' : 'transparent',
        borderRadius: 6,
      }}
    >
      <Row
        item={item}
        depth={depth}
        open={open}
        onToggle={() => toggleOpen(item.id)}
        onOpen={() => {
          nav(path(`/c/${item.id}`));
          closeMobile?.();
        }}
      />
      {open &&
        children.map((c) =>
          c.isFolder ? (
            <CollectionNode
              key={c.id}
              item={c}
              childrenByParent={childrenByParent}
              depth={depth + 1}
              activeId={activeId}
              isOpen={isOpen}
              toggleOpen={toggleOpen}
            />
          ) : (
            <NoteRow key={c.id} item={c} depth={depth + 1} />
          ),
        )}
    </div>
  );
}

function Row({
  item,
  depth,
  open,
  onToggle,
  onOpen,
}: {
  item: Item;
  depth: number;
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  const { isTouch } = useViewport();
  const path = useModePath();
  const { pathname } = useLocation();
  // Active when the user is viewing this collection.
  const isActive = pathname === path(`/c/${item.id}`);
  return (
    <Group
      ref={setNodeRef}
      gap={2}
      pl={depth * 12}
      // Touch devices: bump vertical padding for WCAG 2.5.5 (≥ 44×44 target).
      py={isTouch ? 8 : 2}
      pr={4}
      className={`row${isActive ? ' row--active' : ''}`}
      wrap="nowrap"
      style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}
      {...attributes}
      {...listeners}
    >
      <ActionIcon
        variant="transparent"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Icon
          icon={ChevronRight}
          size="sm"
          style={{
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 120ms',
            opacity: 0.7,
          }}
        />
      </ActionIcon>
      <UnstyledButton style={{ flex: 1 }} onClick={onOpen}>
        <Group gap={6} wrap="nowrap">
          <span style={{ fontSize: 14 }}>{item.icon}</span>
          <Text size="sm" truncate fw={isActive ? 600 : 400}>
            {item.title}
          </Text>
        </Group>
      </UnstyledButton>
      <div onPointerDown={(e) => e.stopPropagation()}>
        <RowMenu item={item} />
      </div>
    </Group>
  );
}

function NoteRow({ item, depth }: { item: Item; depth: number }) {
  const nav = useNavigate();
  const { isTouch } = useViewport();
  const path = useModePath();
  const { pathname } = useLocation();
  const closeMobile = useCloseMobile();
  const repo = useRepo();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  const viewPath = path(`/n/${item.id}`);
  const editPath = path(`/n/${item.id}/edit`);
  const isActive = pathname === viewPath || pathname === editPath;

  // Swipe gesture state — only active on touch devices.
  const swipeRef = useRef<{ startX: number; startY: number; handled: boolean } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0); // px, clamped -80..80

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isTouch) return;
      swipeRef.current = { startX: e.clientX, startY: e.clientY, handled: false };
    },
    [isTouch],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!swipeRef.current || swipeRef.current.handled) return;
    const dx = e.clientX - swipeRef.current.startX;
    const dy = e.clientY - swipeRef.current.startY;
    // Only track horizontal swipes; bail if vertical scroll is dominant.
    if (Math.abs(dy) > Math.abs(dx)) {
      swipeRef.current = null;
      return;
    }
    setSwipeOffset(Math.max(-80, Math.min(80, dx)));
  }, []);

  const onPointerUp = useCallback(() => {
    if (!swipeRef.current) return;
    const dx = swipeOffset;
    swipeRef.current.handled = true;
    swipeRef.current = null;
    if (dx > 48) {
      // Swipe right → star toggle
      repo.update(item.id, { starred: !item.starred });
      notifications.show({ message: item.starred ? 'Unstarred' : 'Starred', color: 'yellow' });
    } else if (dx < -48) {
      // Swipe left → trash with undo
      repo.trash(item.id);
      notifications.show({
        message: `"${item.title}" moved to Trash`,
        color: 'red',
        autoClose: 4000,
      });
    }
    setSwipeOffset(0);
  }, [swipeOffset, item, repo]);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-sm)' }}>
      {/* Swipe hint backgrounds — visible as the row slides */}
      {isTouch && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--color-accent-subtle)',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 12,
              opacity: Math.max(0, swipeOffset / 80),
            }}
          >
            <Icon icon={Star} size="md" color="gold" />
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 12,
              opacity: Math.max(0, -swipeOffset / 80),
            }}
          >
            <Icon icon={Trash2} size="md" style={{ color: 'var(--color-danger)' }} />
          </div>
        </>
      )}
      <Group
        ref={setNodeRef}
        gap={2}
        pl={depth * 12 + 22}
        py={isTouch ? 8 : 2}
        pr={4}
        className={`row${isActive ? ' row--active' : ''}`}
        wrap="nowrap"
        onMouseEnter={prefetchMarkdown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setSwipeOffset(0)}
        style={{
          opacity: isDragging ? 0.4 : 1,
          cursor: isTouch ? 'default' : 'grab',
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 200ms' : 'none',
          position: 'relative',
          background: 'var(--app-shell-bg, var(--mantine-color-body))',
        }}
        {...attributes}
        {...(isTouch && swipeOffset !== 0 ? {} : listeners)}
      >
        <UnstyledButton
          style={{ flex: 1 }}
          onClick={() => {
            nav(viewPath);
            closeMobile?.();
          }}
        >
          <Group gap={6} wrap="nowrap">
            <span style={{ fontSize: 13 }}>{item.icon}</span>
            <Text size="sm" truncate fw={isActive ? 600 : 400}>
              {item.title}
            </Text>
            {item.starred && <Icon icon={Star} size="sm" fill="gold" strokeWidth={0} />}
          </Group>
        </UnstyledButton>
        <div onPointerDown={(e) => e.stopPropagation()}>
          <RowMenu item={item} />
        </div>
      </Group>
    </div>
  );
}

const RowMenu = memo(function RowMenu({ item }: { item: Item }) {
  const [opened, setOpened] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const repo = useRepo();
  const path = useModePath();
  const { class: vpClass } = useViewport();
  const isCompact = vpClass === 'compact';

  // Drag-to-expand / drag-to-close gesture on the grabber (compact only).
  const dragStartY = useRef<number>(0);
  const isDragging = useRef(false);

  function onGrabberTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  }

  function onGrabberTouchEnd(e: React.TouchEvent) {
    if (!isDragging.current) return;
    isDragging.current = false;
    const dy = dragStartY.current - e.changedTouches[0].clientY;
    if (!expanded && dy > 60) setExpanded(true);
    else if (expanded && dy < -60) setExpanded(false);
    else if (!expanded && dy < -40) setOpened(false);
  }

  function close() {
    setOpened(false);
    setExpanded(false);
  }

  // ── Desktop / tablet: plain dropdown Menu ──────────────────────────────────
  // keepMounted={false} on the Dropdown prevents Mantine from leaving an idle
  // portal <div> in the DOM for every closed row menu (would be one per row).
  if (!isCompact) {
    return (
      <Menu
        shadow="md"
        width={200}
        position="bottom-start"
        opened={opened}
        onChange={setOpened}
        keepMounted={false}
      >
        <Menu.Target>
          <ActionIcon
            size="sm"
            variant="subtle"
            className="row-menu"
            aria-label={`Actions for ${item.title}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpened((o) => !o);
            }}
          >
            <Icon icon={Ellipsis} size={16} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {item.isFolder && (
            <>
              <Menu.Item
                leftSection={<Icon icon={FilePlus} size={16} />}
                onClick={() => openItemDialog({ isFolder: false, parentId: item.id, repo, path })}
              >
                New note inside
              </Menu.Item>
              <Menu.Item
                leftSection={<Icon icon={FolderPlus} size={16} />}
                onClick={() => openItemDialog({ isFolder: true, parentId: item.id, repo, path })}
              >
                New subfolder inside
              </Menu.Item>
              <Menu.Divider />
            </>
          )}
          <Menu.Item
            leftSection={<Icon icon={Pencil} size={16} />}
            onClick={() => openRenameDialog(item, repo)}
          >
            Rename
          </Menu.Item>
          {!item.isFolder && (
            <Menu.Item
              leftSection={<Icon icon={Star} size={16} />}
              onClick={() => repo.update(item.id, { starred: !item.starred })}
            >
              {item.starred ? 'Unstar' : 'Star'}
            </Menu.Item>
          )}
          <Menu.Item
            color="red"
            leftSection={<Icon icon={Trash2} size={16} />}
            onClick={() => openConfirm(item, repo)}
          >
            Move to Trash
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
  }

  // ── Compact (mobile): bottom drawer ────────────────────────────────────────
  return (
    <>
      <ActionIcon
        size="xl"
        variant="subtle"
        className="row-menu"
        aria-label={`Actions for ${item.title}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpened(true);
        }}
      >
        <Icon icon={Ellipsis} size={16} />
      </ActionIcon>

      <Drawer
        opened={opened}
        onClose={close}
        position="bottom"
        radius="12px 12px 0 0"
        size="auto"
        withCloseButton={false}
        keepMounted={false}
        styles={{
          inner: { alignItems: 'flex-end' },
          content: {
            height: expanded ? '90vh !important' : 'fit-content !important',
            maxHeight: '90vh',
            transition: 'height 280ms cubic-bezier(0.32, 0.72, 0, 1)',
          },
          body: { padding: 0, paddingBottom: 'env(safe-area-inset-bottom)' },
        }}
      >
        {/* Grabber */}
        <Box
          onTouchStart={onGrabberTouchStart}
          onTouchEnd={onGrabberTouchEnd}
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 10,
            paddingBottom: 4,
            cursor: 'grab',
            touchAction: 'none',
          }}
        >
          <Box
            style={{
              width: expanded ? 56 : 36,
              height: 4,
              borderRadius: 2,
              background: 'var(--app-border)',
              transition: 'width 200ms ease',
            }}
          />
        </Box>

        {/* Header */}
        <Box px="md" py="sm" style={{ borderBottom: '1px solid var(--app-border)' }}>
          <Group gap={8}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <Text size="sm" fw={600} truncate>
              {item.title}
            </Text>
          </Group>
        </Box>

        <Stack gap={0} py="xs">
          {item.isFolder && (
            <>
              <UnstyledButton
                className="sheet-action-row"
                onClick={() => {
                  close();
                  openQuickCapture(item.id);
                }}
              >
                <Icon icon={FilePlus} size="md" />
                <Text size="sm">New note inside</Text>
              </UnstyledButton>
              <UnstyledButton
                className="sheet-action-row"
                onClick={() => {
                  close();
                  openItemDialog({ isFolder: true, parentId: item.id, repo, path });
                }}
              >
                <Icon icon={FolderPlus} size="md" />
                <Text size="sm">New subfolder inside</Text>
              </UnstyledButton>
              <Divider />
            </>
          )}
          <UnstyledButton
            className="sheet-action-row"
            onClick={() => {
              close();
              openRenameDialog(item, repo);
            }}
          >
            <Icon icon={Pencil} size="md" />
            <Text size="sm">Rename</Text>
          </UnstyledButton>
          {!item.isFolder && (
            <UnstyledButton
              className="sheet-action-row"
              onClick={() => {
                close();
                repo.update(item.id, { starred: !item.starred });
              }}
            >
              <Icon icon={Star} size="md" />
              <Text size="sm">{item.starred ? 'Unstar' : 'Star'}</Text>
            </UnstyledButton>
          )}
          <Divider />
          <UnstyledButton
            className="sheet-action-row sheet-action-row--danger"
            onClick={() => {
              close();
              openConfirm(item, repo);
            }}
          >
            <Icon icon={Trash2} size="md" />
            <Text size="sm">Move to Trash</Text>
          </UnstyledButton>
        </Stack>
      </Drawer>
    </>
  );
});
