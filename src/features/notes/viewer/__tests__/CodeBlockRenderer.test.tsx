import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/Utils';
import userEvent from '@testing-library/user-event';
import { CodeBlockRenderer } from '@/features/notes/viewer/CodeBlockRenderer';

describe('CodeBlockRenderer', () => {
  it('renders a pre with copy button for plain code', async () => {
    const { container } = renderWithProviders(
      <CodeBlockRenderer>
        <code>hello world</code>
      </CodeBlockRenderer>,
    );
    const pre = container.querySelector('pre')!;
    Object.defineProperty(pre, 'innerText', { configurable: true, value: 'hello world' });
    expect(pre).toBeTruthy();
    const btn = container.querySelector('.codeblock-copy')!;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    await userEvent.click(btn);
    expect(writeText).toHaveBeenCalled();
  });

  it('renders MermaidDiagramRenderer for language-mermaid', () => {
    const { container } = renderWithProviders(
      <CodeBlockRenderer>
        <code className="language-mermaid">flowchart TD</code>
      </CodeBlockRenderer>,
    );
    expect(container.querySelector('.mermaid-block')).toBeTruthy();
  });

  it('detects mermaid by text keywords', () => {
    const { container } = renderWithProviders(
      <CodeBlockRenderer>
        <code>sequenceDiagram\n A-&gt;&gt;B: hi</code>
      </CodeBlockRenderer>,
    );
    expect(container.querySelector('.mermaid-block')).toBeTruthy();
  });

  it('handles clipboard failure silently', async () => {
    const { container } = renderWithProviders(
      <CodeBlockRenderer>
        <code>x</code>
      </CodeBlockRenderer>,
    );
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('nope')) },
    });
    await userEvent.click(container.querySelector('.codeblock-copy')!);
  });
});
