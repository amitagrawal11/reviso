import {
  TextInput,
  Text,
  Button,
  Group,
  Stack,
  Combobox,
  InputBase,
  useCombobox,
  CloseButton,
} from '@mantine/core';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Repo } from '../lib/repo';
import { Item } from '../mock/data';
import { notifications } from '@mantine/notifications';
import { openAdaptiveDialog } from './AdaptiveDialog';

// Modals are portalled by Mantine's ModalsProvider, which lives ABOVE the
// route tree's DataModeProvider — so calling useRepo()/useModePath() inside
// a modal would read default (real-mode) values, not the active mode.
// We thread `repo` and `path` in as props from the call site instead.
type PathFn = (p: string) => string;

// Curated emoji sets — note-taking-specific imagery for notes,
// container/category imagery for collections.
const NOTE_EMOJIS = [
  '📝',
  '📓',
  '📔',
  '📒',
  '📕',
  '📗',
  '📘',
  '📙',
  '📖',
  '🗒️',
  '📋',
  '✏️',
  '✍️',
  '💡',
  '🧠',
  '💭',
  '📌',
  '🔖',
  '🏷️',
  '✅',
  '📅',
  '🎯',
  '⭐',
  '❤️',
  '🔍',
];

const COLLECTION_EMOJIS = [
  '📁',
  '📂',
  '🗂️',
  '🗃️',
  '📚',
  '📑',
  '📔',
  '📓',
  '📒',
  '📕',
  '📗',
  '📘',
  '📙',
  '💼',
  '📋',
  '📊',
  '📌',
  '🔖',
  '🏷️',
  '⭐',
  '🎯',
  '✅',
  '💡',
  '🧰',
  '📦',
];

type ParentChoice =
  | { kind: 'none' }
  | { kind: 'existing'; id: string }
  | { kind: 'new'; name: string };

function CollectionPicker({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: ParentChoice;
  onChange: (v: ParentChoice) => void;
}) {
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });
  const [search, setSearch] = useState('');

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase().trim()),
  );
  const exactMatch = options.some(
    (o) => o.label.toLowerCase().trim() === search.toLowerCase().trim(),
  );

  const displayValue =
    value.kind === 'existing'
      ? (options.find((o) => o.id === value.id)?.label ?? '')
      : value.kind === 'new'
        ? `+ Create "${value.name}"`
        : '';

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(val) => {
        if (val.startsWith('__new__:')) {
          onChange({ kind: 'new', name: val.slice('__new__:'.length) });
        } else {
          onChange({ kind: 'existing', id: val });
        }
        setSearch('');
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          label="Parent collection (optional)"
          placeholder="None — top level"
          rightSection={
            value.kind !== 'none' ? (
              <CloseButton
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onChange({ kind: 'none' })}
                aria-label="Clear"
              />
            ) : (
              <Combobox.Chevron />
            )
          }
          rightSectionPointerEvents={value.kind !== 'none' ? 'all' : 'none'}
          value={combobox.dropdownOpened ? search : displayValue}
          onChange={(e) => {
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
            setSearch(e.currentTarget.value);
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
            combobox.closeDropdown();
            setSearch('');
          }}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {filtered.map((o) => (
            <Combobox.Option key={o.id} value={o.id}>
              {o.label}
            </Combobox.Option>
          ))}
          {!exactMatch && search.trim() && (
            <Combobox.Option value={`__new__:${search.trim()}`}>
              <Text size="sm" c="blue">
                + Create collection "{search.trim()}"
              </Text>
            </Combobox.Option>
          )}
          {filtered.length === 0 && !search.trim() && (
            <Combobox.Empty>No collections yet — type to create one</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

function ItemForm({
  isFolder,
  parentId,
  onClose,
  repo,
  path,
}: {
  isFolder: boolean;
  parentId: string | null;
  onClose: () => void;
  repo: Repo;
  path: PathFn;
}) {
  const emojiSet = isFolder ? COLLECTION_EMOJIS : NOTE_EMOJIS;
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState(emojiSet[0]);
  // Read items directly from the passed repo so we always reflect the right
  // data mode (real or demo), regardless of where this modal renders.
  const items = useSyncExternalStore(repo.subscribe, repo.getAll, repo.getAll);

  const collectionOptions = useMemo(() => {
    const folders = items.filter((i) => i.isFolder && !i.trashed);
    const labelFor = (id: string): string => {
      const chain: string[] = [];
      let cur: string | null = id;
      while (cur) {
        const f = folders.find((x) => x.id === cur);
        if (!f) break;
        chain.unshift(`${f.icon} ${f.title}`);
        cur = f.parentId;
      }
      return chain.join(' / ');
    };
    return folders.map((f) => ({ id: f.id, label: labelFor(f.id) }));
  }, [items]);

  const [parent, setParent] = useState<ParentChoice>(
    parentId ? { kind: 'existing', id: parentId } : { kind: 'none' },
  );
  const nav = useNavigate();

  function submit() {
    if (!title.trim()) return;
    let resolvedParentId: string | null = null;
    if (parent.kind === 'existing') resolvedParentId = parent.id;
    if (parent.kind === 'new') {
      const folder = repo.create({
        title: parent.name,
        icon: '📁',
        isFolder: true,
        parentId: null,
      });
      resolvedParentId = folder.id;
    }
    const item = repo.create({
      title: title.trim(),
      icon,
      isFolder,
      parentId: resolvedParentId,
    });
    notifications.show({
      message:
        parent.kind === 'new'
          ? `Note created in new collection "${parent.name}"`
          : `${isFolder ? 'Collection' : 'Note'} created`,
      color: 'green',
    });
    onClose();
    if (!isFolder) nav(path(`/n/${item.id}/edit`) + '?new=1');
  }

  return (
    <Stack>
      <TextInput
        label="Name"
        placeholder={isFolder ? 'Work, Recipes, …' : 'Untitled note'}
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        data-autofocus
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <CollectionPicker
        options={collectionOptions.filter((o) => (isFolder ? o.id !== parentId : true))}
        value={parent}
        onChange={setParent}
      />
      <div>
        <Text size="sm" fw={500} mb={4}>
          Icon
        </Text>
        <Group gap={6}>
          {emojiSet.map((e) => (
            <Button
              key={e}
              variant={icon === e ? 'filled' : 'default'}
              size="compact-sm"
              onClick={() => setIcon(e)}
              styles={{ root: { padding: '0 8px', fontSize: 16 } }}
              aria-label={`Icon ${e}`}
              aria-pressed={icon === e}
            >
              {e}
            </Button>
          ))}
        </Group>
      </div>
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit}>Create</Button>
      </Group>
    </Stack>
  );
}

export function openItemDialog({
  isFolder,
  parentId = null,
  repo,
  path,
}: {
  isFolder: boolean;
  parentId?: string | null;
  repo: Repo;
  path: PathFn;
}) {
  openAdaptiveDialog({
    title: isFolder ? 'New collection' : 'New note',
    children: (close) => (
      <ItemForm isFolder={isFolder} parentId={parentId} repo={repo} path={path} onClose={close} />
    ),
  });
}

function RenameForm({ item, onClose, repo }: { item: Item; onClose: () => void; repo: Repo }) {
  const emojiSet = item.isFolder ? COLLECTION_EMOJIS : NOTE_EMOJIS;
  const [title, setTitle] = useState(item.title);
  const [icon, setIcon] = useState(item.icon);
  function submit() {
    if (!title.trim()) return;
    repo.update(item.id, { title: title.trim(), icon });
    notifications.show({ message: 'Renamed', color: 'green' });
    onClose();
  }
  return (
    <Stack>
      <TextInput
        label="Name"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        data-autofocus
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <div>
        <Text size="sm" fw={500} mb={4}>
          Icon
        </Text>
        <Group gap={6}>
          {emojiSet.map((e) => (
            <Button
              key={e}
              variant={icon === e ? 'filled' : 'default'}
              size="compact-sm"
              onClick={() => setIcon(e)}
              styles={{ root: { padding: '0 8px', fontSize: 16 } }}
            >
              {e}
            </Button>
          ))}
        </Group>
      </div>
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit}>Save</Button>
      </Group>
    </Stack>
  );
}

export function openRenameDialog(item: Item, repo: Repo) {
  openAdaptiveDialog({
    title: `Rename ${item.isFolder ? 'collection' : 'note'}`,
    children: (close) => <RenameForm item={item} repo={repo} onClose={close} />,
  });
}

// Caller passes the active repo from useRepo() — confirm is imperative and
// runs outside React, so it can't read context itself.
export function openConfirm(item: Item, repo: Repo) {
  openAdaptiveDialog({
    title: `Move to Trash?`,
    children: (close) => (
      <Stack>
        <Text size="sm">
          {item.isFolder
            ? `"${item.title}" and every note inside it will be moved to Trash. You can restore them within 30 days.`
            : `"${item.title}" will be moved to Trash. You can restore it within 30 days.`}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={close}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => {
              repo.trash(item.id);
              notifications.show({ message: 'Moved to Trash', color: 'gray' });
              close();
            }}
          >
            Move to Trash
          </Button>
        </Group>
      </Stack>
    ),
  });
}
