import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { useHljsTheme } from '@/shared/lib/CodeHighlightTheme';
import { ReactNode } from 'react';

function wrapper({ children }: { children: ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

describe('useHljsTheme', () => {
  it('injects light and dark style tags', async () => {
    renderHook(() => useHljsTheme(), { wrapper });
    await waitFor(() => {
      expect(document.getElementById('hljs-light')).toBeTruthy();
      expect(document.getElementById('hljs-dark')).toBeTruthy();
    });
  });
});
