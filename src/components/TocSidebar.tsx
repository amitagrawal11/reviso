import { useEffect, useState } from 'react';
import { Text, Stack, Box } from '@mantine/core';
import { useLocation } from 'react-router-dom';

type Heading = { id: string; text: string; level: number };

export default function TocSidebar() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const { pathname } = useLocation();

  // Re-scan only when route changes or after a debounce when content mutates.
  useEffect(() => {
    let raf = 0;
    let timer: number | undefined;

    const scan = () => {
      const root = document.querySelector('.markdown');
      if (!root) {
        setHeadings([]);
        return;
      }
      const nodes = root.querySelectorAll<HTMLElement>('h1, h2, h3');
      setHeadings(
        Array.from(nodes).map((n) => {
          // rehype-slug supplies an id; if missing, synthesize one and write
          // it back to the DOM so the IntersectionObserver below + anchor
          // navigation can find it.
          if (!n.id) {
            n.id = (n.textContent ?? '')
              .toLowerCase()
              .trim()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-_]/g, '');
          }
          return {
            id: n.id,
            text: n.textContent ?? '',
            level: Number(n.tagName.slice(1)),
          };
        }),
      );
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(scan);
      }, 150);
    };

    scan();

    const root = document.querySelector('.markdown');
    if (!root) return;
    const obs = new MutationObserver(schedule);
    obs.observe(root, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  useEffect(() => {
    if (headings.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [headings]);

  if (headings.length === 0)
    return <Text size="xs" c="dimmed">On this page</Text>;

  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed" fw={600} tt="uppercase" mb={4}>On this page</Text>
      {headings.map((h) => (
        <Box key={h.id} pl={(h.level - 1) * 10}>
          <a
            href={`#${h.id}`}
            style={{
              fontSize: 13,
              color: active === h.id ? 'var(--mantine-color-blue-4)' : 'var(--mantine-color-dimmed)',
              textDecoration: 'none',
            }}
          >
            {h.text}
          </a>
        </Box>
      ))}
    </Stack>
  );
}
