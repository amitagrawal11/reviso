import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  DataModeProvider,
  useDataMode,
  useItems,
  useModePath,
  useRepo,
} from '@/features/notes/repository/NoteRepositoryContext';

function wrap(mode: 'real' | 'demo') {
  return ({ children }: { children: ReactNode }) => (
    <DataModeProvider mode={mode}>{children}</DataModeProvider>
  );
}

describe('DataModeProvider', () => {
  it('provides repo + mode in demo', () => {
    const { result } = renderHook(() => useDataMode(), { wrapper: wrap('demo') });
    expect(result.current.mode).toBe('demo');
    expect(typeof result.current.repo.getAll).toBe('function');
  });

  it('useModePath prefixes /demo in demo tree', () => {
    const { result } = renderHook(() => useModePath(), { wrapper: wrap('demo') });
    expect(result.current('/n/abc')).toBe('/demo/n/abc');
    expect(result.current('/')).toBe('/demo');
    expect(result.current('')).toBe('/demo');
    expect(result.current('n/abc')).toBe('/demo/n/abc');
  });

  it('useModePath is identity outside any provider (defaults to real)', () => {
    const { result } = renderHook(() => useModePath());
    expect(result.current('/n/abc')).toBe('/n/abc');
  });

  it('useItems returns repo items', () => {
    const { result } = renderHook(() => useItems(), { wrapper: wrap('demo') });
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('useRepo returns repo', () => {
    const { result } = renderHook(() => useRepo(), { wrapper: wrap('demo') });
    expect(typeof result.current.create).toBe('function');
  });
});
