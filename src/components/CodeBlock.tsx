import { isValidElement, ReactNode, useRef, useState } from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { MermaidBlock } from './MermaidBlock';

// Recursively flatten React children into plain text for clipboard / mermaid source.
function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement(node)) return nodeText((node.props as { children?: ReactNode }).children);
  return '';
}

// Detect a fenced ```mermaid block by the className react-markdown puts on <code>.
// Recursively scan because plugins (e.g. rehype-highlight) may wrap or relocate the
// className-bearing element before it reaches the <pre> renderer.
function isMermaid(node: ReactNode): boolean {
  if (node == null || typeof node === 'boolean') return false;
  if (Array.isArray(node)) return node.some(isMermaid);
  if (isValidElement(node)) {
    const props = node.props as { className?: string; children?: ReactNode };
    if (typeof props.className === 'string' && /\blanguage-mermaid\b/.test(props.className)) return true;
    return isMermaid(props.children);
  }
  return false;
}

// Wraps a markdown <pre> with a "copy code" button overlay.
// If the block is mermaid, render a MermaidBlock instead.
export function CodeBlock(props: React.HTMLAttributes<HTMLPreElement>) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const text = nodeText(props.children);
  // Also sniff common mermaid keywords in case the className got stripped.
  const mermaidByText = /^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|C4Context)\b/.test(text);

  if (isMermaid(props.children) || mermaidByText) {
    return <MermaidBlock source={text} />;
  }

  const handleCopy = async () => {
    const text = ref.current?.innerText ?? '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard not available — silently ignore.
    }
  };

  return (
    <div className="codeblock-wrap" style={{ position: 'relative' }}>
      <pre ref={ref} {...props} />
      <Tooltip label={copied ? 'Copied' : 'Copy code'} withArrow position="left">
        <ActionIcon
          className="codeblock-copy"
          variant="default"
          size="sm"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
        </ActionIcon>
      </Tooltip>
    </div>
  );
}
