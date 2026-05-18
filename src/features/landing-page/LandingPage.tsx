import { useState } from 'react';
import {
  Container,
  Stack,
  Title,
  Text,
  Button,
  Group,
  SimpleGrid,
  Card,
  ThemeIcon,
  Box,
  Anchor,
  ActionIcon,
  Tooltip,
  useMantineColorScheme,
  useComputedColorScheme,
} from '@mantine/core';
import { LandingPageDemoPreview } from '@/features/landing-page/LandingPageDemoPreview';
import {
  Check,
  FileText,
  FolderOpen,
  Palette,
  Sun,
  Moon,
  Zap,
  Lock,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SignInModal } from '@/features/authentication/modal/SignInModal';
import { BrandLogo } from '@/shared/components/BrandLogo';
import { ItemIcon } from '@/shared/components/ItemIcon';

// SEO-aware copy. Tone: honest, specific, no AI-bro adjectives. Headings are
// kept semantic (h1 → h2 → h3) so search engines can follow the outline.

const TAGLINE = 'Reviso Notes stay yours.';
const SUBTITLE =
  'A free, privacy-friendly notes app for markdown writers. Reviso Notes gives you live preview, mermaid diagrams, nested folders, syntax highlighting, dark mode and offline support — all in your browser.';

const FEATURES: { title: string; body: string; ItemIcon: LucideIcon }[] = [
  {
    ItemIcon: FileText,
    title: 'Real markdown, live preview',
    body: 'Write in plain GitHub-Flavored Markdown and watch it render side-by-side. Code blocks pick up syntax highlighting in 190+ languages. Mermaid flowcharts, sequence diagrams and gantt charts render as you type. Inline tables, task lists, footnotes and quotes — all standard.',
  },
  {
    ItemIcon: FolderOpen,
    title: 'Organize without rigidity',
    body: 'Group notes into nested collections — fold them as deep as your brain wants. Drag-and-drop to reparent, star the ones you reach for, and soft-delete to a Trash bin you can review or empty later. The whole tree is searchable from a single keyboard shortcut.',
  },
  {
    ItemIcon: Palette,
    title: 'Built for long sessions',
    body: 'Read mode collapses every distraction for Kindle-like reading. An auto-generated outline tracks your scroll position. Dark and light themes, both tuned for hours of writing. Installs as a Progressive Web App on macOS, Windows, Linux, iOS and Android.',
  },
];

// Secondary value props — short, scannable, keyword-rich.
const TRUST_POINTS: { ItemIcon: LucideIcon; label: string }[] = [
  { ItemIcon: Lock, label: 'Browser-local by default — no account required' },
  { ItemIcon: Zap, label: 'Offline-first — works on planes and bad Wi-Fi' },
  { ItemIcon: Globe, label: 'Plain markdown — yours to export at any time' },
  { ItemIcon: Check, label: 'Free for personal use — no card, no email confirmation' },
];

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('dark');

  const openAuth = (m: 'signin' | 'signup') => {
    setAuthMode(m);
    setAuthOpen(true);
  };

  return (
    <Box mih="100vh" style={{ background: 'var(--mantine-color-body)' }}>
      {/* ── Top navigation (header landmark) ── */}
      <Container size="lg" py="md" component="header">
        <Group justify="space-between">
          <Group gap={6}>
            <BrandLogo />
            <Text fw={700} component="span">
              Reviso
            </Text>
          </Group>
          <Group gap="xs">
            <Tooltip label="Toggle theme">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => setColorScheme(computed === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle dark / light theme"
              >
                {computed === 'dark' ? (
                  <ItemIcon icon={Sun} size="md" />
                ) : (
                  <ItemIcon icon={Moon} size="md" />
                )}
              </ActionIcon>
            </Tooltip>
            <Button variant="subtle" onClick={() => openAuth('signin')}>
              Sign in
            </Button>
            <Button onClick={() => openAuth('signup')}>Create free account</Button>
          </Group>
        </Group>
      </Container>

      {/* ── Main landmark wrapping all primary content ── */}
      <Box component="main">
        {/* ── Hero ── */}
        <Container size="lg" pt={48} pb={32} component="section" aria-label="Hero">
          <Stack align="center" gap="lg">
            <Title
              order={1}
              ta="center"
              maw={760}
              fw={800}
              style={{
                // Use the redesigned display token so the hero respects
                // OS text-size scaling and Inter's tighter tracking.
                fontSize: 'var(--text-display)',
                lineHeight: 'var(--lh-display)',
                letterSpacing: 'var(--ls-display)',
              }}
            >
              {TAGLINE}
            </Title>
            <Text ta="center" c="dimmed" maw={680} size="lg">
              {SUBTITLE}
            </Text>
          </Stack>
        </Container>

        {/* ── Demo frame ── */}
        <Container fluid pb={48} px="md" style={{ maxWidth: 1600, margin: '0 auto' }}>
          <LandingPageDemoPreview />
        </Container>

        {/* ── Feature highlights (semantic h2 + h3 for SEO) ── */}
        <Container size="lg" pb={64} component="section" aria-labelledby="features-h">
          <Title id="features-h" order={2} ta="center" mb={8}>
            Everything you need to write seriously in markdown
          </Title>
          <Text ta="center" c="dimmed" maw={680} mx="auto" mb="xl">
            Reviso Notes is a focused app for technical writers, developers, students and anyone who
            would rather own their content than rent it.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {FEATURES.map(({ ItemIcon: FeatIcon, title, body }) => (
              <Card key={title} withBorder p="lg" radius="md">
                <Stack gap="sm">
                  <ThemeIcon variant="light" size="lg" radius="md">
                    <ItemIcon icon={FeatIcon} size="lg" />
                  </ThemeIcon>
                  <Title order={3} fz="md" fw={600} m={0}>
                    {title}
                  </Title>
                  <Text size="sm" c="dimmed">
                    {body}
                  </Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Container>

        {/* ── Why / philosophy ── */}
        <Container size="md" pb={64} component="section" aria-labelledby="why-h">
          <Card withBorder p="xl" radius="md">
            <Stack gap="md">
              <Title id="why-h" order={2} fz="xl">
                Why Reviso Notes?
              </Title>
              <Text size="sm" c="dimmed">
                Most notes apps trade your content for convenience. They lock you into a proprietary
                format, charge a subscription for features that should be table-stakes, or store
                everything in a cloud you can't audit. Reviso Notes is the opposite:{' '}
                <strong>plain markdown files</strong>, <strong>browser-local by default</strong>,{' '}
                <strong>optional cloud sync</strong>, and <strong>full export</strong> any time you
                want to leave.
              </Text>
              <Text size="sm" c="dimmed">
                It's a small, focused tool — not a wiki, not an everything-app. It's good at
                writing, reading, and finding markdown notes. That's it.
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" mt="xs">
                {TRUST_POINTS.map(({ ItemIcon: TrustIcon, label }) => (
                  <Group gap={8} key={label} wrap="nowrap">
                    <ItemIcon icon={TrustIcon} size={16} color="var(--mantine-color-green-5)" />
                    <Text size="sm">{label}</Text>
                  </Group>
                ))}
              </SimpleGrid>
            </Stack>
          </Card>
        </Container>

        {/* ── How it works (3 steps) ── */}
        <Container size="lg" pb={64} component="section" aria-labelledby="how-h">
          <Title id="how-h" order={2} ta="center" mb={8}>
            How it works
          </Title>
          <Text ta="center" c="dimmed" maw={680} mx="auto" mb="xl">
            From zero to your first synced note in under a minute.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {[
              {
                n: '1',
                title: 'Try it in the demo',
                body: 'Click the screenshot above to open a real, working copy of the app. Create notes, drag folders around, write a mermaid diagram. Everything stays in your browser.',
              },
              {
                n: '2',
                title: 'Create a free account',
                body: 'When you decide to keep your notes, sign up with email and password. No credit card. No email-confirmation hoops to jump through during onboarding.',
              },
              {
                n: '3',
                title: 'Sync across devices',
                body: 'Reviso Notes synchronizes automatically through Supabase. Open a note on your phone in the morning, finish it on your laptop after lunch.',
              },
            ].map((s) => (
              <Card key={s.n} withBorder p="lg" radius="md">
                <Stack gap="sm">
                  <ThemeIcon variant="light" size="lg" radius="xl">
                    <Text fw={700} size="sm">
                      {s.n}
                    </Text>
                  </ThemeIcon>
                  <Title order={3} fz="md" fw={600} m={0}>
                    {s.title}
                  </Title>
                  <Text size="sm" c="dimmed">
                    {s.body}
                  </Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Container>

        {/* ── Final CTA ── */}
        <Container size="lg" pb={64} component="section" aria-labelledby="cta-h">
          <Card withBorder p="xl" radius="md">
            <Stack align="center" gap="sm">
              <Title id="cta-h" order={2} fz="xl">
                Start writing in two clicks
              </Title>
              <Text c="dimmed" size="sm" ta="center" maw={520}>
                The demo runs entirely in your browser — no signup required. When you're ready,
                create a free account and we'll move your demo notes into your synced workspace.
              </Text>
              <Group mt="xs">
                <Button component={Link} to="/demo">
                  Open the demo
                </Button>
                <Button variant="default" onClick={() => openAuth('signup')}>
                  Create free account
                </Button>
              </Group>
            </Stack>
          </Card>
        </Container>
      </Box>
      {/* end <main> */}

      {/* ── Footer ── */}
      <Container size="lg" pb="xl" component="footer">
        <Group justify="center" gap="xs">
          <Text size="xs" c="dimmed">
            Made with React, Mantine, and Supabase. Released as an open-source personal project.
          </Text>
          <Text size="xs" c="dimmed">
            ·
          </Text>
          <Anchor href="https://github.com" target="_blank" rel="noreferrer" size="xs">
            GitHub
          </Anchor>
        </Group>
      </Container>

      <SignInModal opened={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </Box>
  );
}
