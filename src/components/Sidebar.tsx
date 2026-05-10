import {
  Avatar,
  Group,
  Text,
  UnstyledButton,
  Badge,
  ScrollArea,
  ActionIcon,
  Menu,
  Stack,
  Box,
} from "@mantine/core";
import {
  IconPlus,
  IconStar,
  IconClock,
  IconTrash,
  IconChevronRight,
  IconDots,
  IconPencil,
  IconFilePlus,
  IconFolderPlus,
  IconUser,
  IconSettings,
  IconLogout,
} from "@tabler/icons-react";
import { NavLink, useNavigate } from "react-router-dom";
import { memo, useCallback, useMemo, useState } from "react";
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
} from "@dnd-kit/core";
import { Item } from "../mock/data";
import { notifications } from "@mantine/notifications";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { useNavigate as useNav } from "react-router-dom";
import {
  useItems,
  useRepo,
  useModePath,
  useDataMode,
  usingSupabase,
} from "../lib/data-mode";
import {
  openItemDialog,
  openConfirm,
  openRenameDialog,
  prefetchDialogs,
} from "../components/dialogs-lazy";
import { prefetchMarkdown } from "../components/LazyMarkdown";

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
  } catch {}
  return {};
}

function saveOpenState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(OPEN_STATE_KEY, JSON.stringify(state));
  } catch {}
}

export default function Sidebar() {
  const all = useItems();

  // Precompute everything we need per `all` snapshot:
  // - filtered (non-trashed) items
  // - parent → children index
  // - root list
  // - badge counts
  // Avoids re-filtering at every CollectionNode render (was O(N × depth)).
  const { items, childrenByParent, roots, counts } = useMemo(() => {
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
      counts: {
        // Match what the Recent page actually shows (top 20).
        recent: Math.min(items.filter((i) => !i.isFolder).length, 20),
        starred: items.filter((i) => i.starred).length,
        trash: all.filter((i) => i.trashed).length,
      },
    };
  }, [all]);

  const path = useModePath();
  // Folder open/closed state lives at the Sidebar level + persists.
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(loadOpenState);
  const isOpen = useCallback(
    (id: string) => (id in openMap ? openMap[id] : true), // default open
    [openMap],
  );
  const toggleOpen = useCallback((id: string) => {
    setOpenMap((prev) => {
      const wasOpen = id in prev ? prev[id] : true;
      const next = { ...prev, [id]: !wasOpen };
      saveOpenState(next);
      return next;
    });
  }, []);

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
    const newParent = overId === "root" ? null : overId;
    const dragged = items.find((i) => i.id === draggedId);
    if (!dragged) return;

    // Prevent invalid moves.
    if (newParent && dragged.isFolder && isDescendantOrSelf(childrenByParent, draggedId, newParent)) {
      notifications.show({ message: "Can't move a folder into itself", color: "yellow" });
      return;
    }
    if (dragged.parentId === newParent) return; // no-op

    repo.update(draggedId, { parentId: newParent });
    const target = newParent ? items.find((i) => i.id === newParent)?.title : "top level";
    notifications.show({ message: `Moved "${dragged.title}" to ${target}`, color: "green" });
  }

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  return (
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
            <IconFolderPlus size={16} stroke={2} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            variant="default"
            onMouseEnter={prefetchDialogs}
            onClick={() => openItemDialog({ isFolder: false, repo, path })}
            title="New note"
            aria-label="New note"
          >
            <IconPlus size={16} stroke={2} />
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

      <Stack
        gap={2}
        mt="auto"
        pt="xs"
        style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
      >
        <NavRow
          to={path("/recent")}
          icon={<IconClock size={18} />}
          label="Recent"
          badge={counts.recent}
        />
        <NavRow
          to={path("/starred")}
          icon={<IconStar size={18} />}
          label="Starred"
          badge={counts.starred}
        />
        <NavRow
          to={path("/trash")}
          icon={<IconTrash size={18} />}
          label="Trash"
          badge={counts.trash || undefined}
        />
      </Stack>

      <ProfileMenu />
    </Stack>
  );
}

function ProfileMenu() {
  const { session, profile, loading: _loading } = useAuth();
  const { mode } = useDataMode();
  const nav = useNav();

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
    <Menu shadow="md" width={220} position="top-start" withArrow>
      <Menu.Target>
        <UnstyledButton
          className="profile-trigger"
          px="sm"
          py={10}
          style={{
            borderTop: "1px solid var(--mantine-color-default-border)",
            borderRadius: 0,
            display: "block",
          }}
        >
          <Group gap="sm" wrap="nowrap" align="center">
            <Avatar radius="xl" color="blue" size="md">{initial}</Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={600} truncate lh={1.2}>
                {display}
              </Text>
              <Text size="xs" c="dimmed" truncate lh={1.2} mt={2}>
                {email}
              </Text>
            </div>
            <IconChevronRight size={16} style={{ flexShrink: 0, opacity: 0.6 }} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Account</Menu.Label>
        <Menu.Item leftSection={<IconUser size={16} />} onClick={() => nav('/profile')}>
          Profile
        </Menu.Item>
        <Menu.Item leftSection={<IconSettings size={16} />} onClick={() => nav('/settings')}>
          Settings
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={signOut}>
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function NavRow({
  to,
  icon,
  label,
  badge,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <NavLink to={to} style={{ textDecoration: "none" }}>
      {({ isActive }) => (
        <Box
          px={8}
          py={6}
          style={{
            borderRadius: 6,
            background: isActive
              ? "var(--mantine-color-default-hover)"
              : "transparent",
          }}
        >
          <Group justify="space-between">
            <Group gap={8}>
              {icon}
              <Text size="sm">{label}</Text>
            </Group>
            {badge ? (
              <Badge size="xs" variant="filled" radius="xl">
                {badge}
              </Badge>
            ) : null}
          </Group>
        </Box>
      )}
    </NavLink>
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

  // This folder accepts drops, unless the active drag is itself or a descendant.
  const canDrop =
    !!activeId &&
    !isDescendantOrSelf(childrenByParent, item.id, activeId) &&
    activeId !== item.id;
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
        onOpen={() => nav(path(`/c/${item.id}`))}
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
  return (
    <Group
      ref={setNodeRef}
      gap={2}
      pl={depth * 12}
      py={2}
      pr={4}
      className="row"
      wrap="nowrap"
      style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}
      {...attributes}
      {...listeners}
    >
      <ActionIcon
        variant="transparent"
        size="sm"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <IconChevronRight
          size={16}
          style={{
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 120ms",
          }}
        />
      </ActionIcon>
      <UnstyledButton style={{ flex: 1 }} onClick={onOpen}>
        <Group gap={6} wrap="nowrap">
          <span style={{ fontSize: 14 }}>{item.icon}</span>
          <Text size="sm" truncate>
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
  const path = useModePath();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  return (
    <Group
      ref={setNodeRef}
      gap={2}
      pl={depth * 12 + 22}
      py={2}
      pr={4}
      className="row"
      wrap="nowrap"
      onMouseEnter={prefetchMarkdown}
      style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}
      {...attributes}
      {...listeners}
    >
      <UnstyledButton style={{ flex: 1 }} onClick={() => nav(path(`/n/${item.id}`))}>
        <Group gap={6} wrap="nowrap">
          <span style={{ fontSize: 13 }}>{item.icon}</span>
          <Text size="sm" truncate>
            {item.title}
          </Text>
          {item.starred && <IconStar size={14} fill="gold" stroke={0} />}
        </Group>
      </UnstyledButton>
      <div onPointerDown={(e) => e.stopPropagation()}>
        <RowMenu item={item} />
      </div>
    </Group>
  );
}

const RowMenu = memo(function RowMenu({ item }: { item: Item }) {
  // Controlled `opened` state so the trigger click reliably opens the dropdown
  // on the very first interaction (Mantine's Menu renders Dropdown lazily, so
  // there is no perf cost to keeping <Menu> mounted from the start).
  const [opened, setOpened] = useState(false);
  const repo = useRepo();
  const path = useModePath();
  return (
    <Menu
      shadow="md"
      width={200}
      position="right-start"
      opened={opened}
      onChange={setOpened}
    >
      <Menu.Target>
        <ActionIcon
          size="sm"
          variant="subtle"
          className="row-menu"
          onClick={(e) => {
            e.stopPropagation();
            setOpened((o) => !o);
          }}
        >
          <IconDots size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {item.isFolder && (
          <>
            <Menu.Item
              leftSection={<IconFilePlus size={16} />}
              onClick={() =>
                openItemDialog({ isFolder: false, parentId: item.id, repo, path })
              }
            >
              New note
            </Menu.Item>
            <Menu.Divider />
          </>
        )}
        <Menu.Item
          leftSection={<IconPencil size={16} />}
          onClick={() => openRenameDialog(item, repo)}
        >
          Rename
        </Menu.Item>
        {!item.isFolder && (
          <Menu.Item
            leftSection={<IconStar size={16} />}
            onClick={() => repo.update(item.id, { starred: !item.starred })}
          >
            {item.starred ? "Unstar" : "Star"}
          </Menu.Item>
        )}
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={() => openConfirm(item, repo)}
        >
          Move to Trash
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
});
