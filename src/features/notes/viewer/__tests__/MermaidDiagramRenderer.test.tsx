import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/Utils';
import { MermaidDiagramRenderer } from '@/features/notes/viewer/MermaidDiagramRenderer';

describe('MermaidDiagramRenderer', () => {
  it('renders mermaid svg', async () => {
    const { container } = renderWithProviders(
      <MermaidDiagramRenderer source="flowchart TD\n A-->B" />,
    );
    await waitFor(() => {
      expect(container.querySelector('.mermaid-block')).toBeTruthy();
    });
  });
});
