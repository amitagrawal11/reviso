import { describe, it, expect } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/Utils';
import {
  AdaptiveDialogHost,
  closeAdaptiveDialog,
  openAdaptiveDialog,
} from '@/shared/components/AdaptiveDialog';

describe('AdaptiveDialog', () => {
  it('opens and closes a dialog via the bridge', async () => {
    const { container } = renderWithProviders(<AdaptiveDialogHost />);
    let id = '';
    act(() => {
      id = openAdaptiveDialog({
        title: 'Test',
        children: (close) => <button onClick={close}>X</button>,
      });
    });
    await waitFor(() => expect(document.body.textContent).toContain('Test'));
    act(() => {
      closeAdaptiveDialog(id);
    });
    await waitFor(() => {
      expect(container.textContent).not.toContain('Test');
    });
  });
});
