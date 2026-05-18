import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';

beforeEach(() => {
  mockRepo.reset();
});

describe('mockRepo', () => {
  it('getAll returns seed items after reset', () => {
    expect(mockRepo.getAll().length).toBeGreaterThan(0);
  });

  it('get returns an item by id', () => {
    const all = mockRepo.getAll();
    expect(mockRepo.get(all[0]!.id)).toEqual(all[0]);
    expect(mockRepo.get('nope')).toBeUndefined();
  });

  it('create adds a note with defaults', () => {
    const n = mockRepo.create({ title: 'x', isFolder: false });
    expect(n.id).toBeTruthy();
    expect(n.icon).toBe('📄');
    expect(n.content).toContain('# x');
    expect(mockRepo.get(n.id)).toEqual(n);
  });

  it('create adds a folder with folder icon', () => {
    const f = mockRepo.create({ title: 'F', isFolder: true });
    expect(f.icon).toBe('📁');
    expect(f.content).toBe('');
  });

  it('create respects provided icon, parentId, content', () => {
    const n = mockRepo.create({
      title: 't',
      isFolder: false,
      icon: '🎯',
      parentId: 'p',
      content: 'body',
    });
    expect(n.icon).toBe('🎯');
    expect(n.parentId).toBe('p');
    expect(n.content).toBe('body');
  });

  it('update patches fields and bumps updatedAt', () => {
    const n = mockRepo.create({ title: 'a', isFolder: false });
    const before = n.updatedAt;
    mockRepo.update(n.id, { title: 'b' });
    const after = mockRepo.get(n.id)!;
    expect(after.title).toBe('b');
    expect(after.updatedAt >= before).toBe(true);
  });

  it('trash cascades to descendants', () => {
    const root = mockRepo.create({ title: 'r', isFolder: true });
    const child = mockRepo.create({ title: 'c', isFolder: false, parentId: root.id });
    mockRepo.trash(root.id);
    expect(mockRepo.get(root.id)?.trashed).toBe(true);
    expect(mockRepo.get(child.id)?.trashed).toBe(true);
  });

  it('restore unsets trashed', () => {
    const n = mockRepo.create({ title: 'a', isFolder: false });
    mockRepo.trash(n.id);
    mockRepo.restore(n.id);
    expect(mockRepo.get(n.id)?.trashed).toBe(false);
  });

  it('hardDelete removes the item', () => {
    const n = mockRepo.create({ title: 'a', isFolder: false });
    mockRepo.hardDelete(n.id);
    expect(mockRepo.get(n.id)).toBeUndefined();
  });

  it('subscribe / unsubscribe', () => {
    const cb = vi.fn();
    const off = mockRepo.subscribe(cb);
    mockRepo.create({ title: 'x', isFolder: false });
    expect(cb).toHaveBeenCalled();
    off();
    cb.mockClear();
    mockRepo.create({ title: 'y', isFolder: false });
    expect(cb).not.toHaveBeenCalled();
  });

  it('emit writes to localStorage', () => {
    mockRepo.create({ title: 'persistent', isFolder: false });
    const raw = localStorage.getItem('notes-demo-items-v1');
    expect(raw).toContain('persistent');
  });

  it('emit tolerates localStorage failure', () => {
    const orig = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('full');
    };
    expect(() => mockRepo.create({ title: 'x', isFolder: false })).not.toThrow();
    localStorage.setItem = orig;
  });

  it('clearAll wipes items', () => {
    mockRepo.clearAll();
    expect(mockRepo.getAll()).toEqual([]);
  });
});
