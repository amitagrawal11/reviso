import { useEffect, useState } from 'react';
import {
  Container,
  Stack,
  Group,
  Title,
  Text,
  Card,
  Breadcrumbs,
  Anchor,
  SegmentedControl,
  PasswordInput,
  Button,
  Divider,
  Switch,
  Select,
  useMantineColorScheme,
} from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CloudUpload } from 'lucide-react';
import { Alert } from '@mantine/core';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/auth';
import { updateUserPassword } from '../lib/profile';
import { supabase } from '../lib/supabase';
import { usingSupabase, useItems } from '../lib/data-mode';
import { usePreferences, setPreference, type Density, type DefaultView } from '../lib/preferences';
import {
  countLocalImportable,
  importLocalNotesToSupabase,
  clearLocalNotes,
} from '../lib/import-from-local';

// Text-size button options. The slider was too granular for the visual
// affordance the user wants ("make text bigger / smaller"); 4 quantized
// buckets give a clearer choice. Each option's icon is an "A" rendered at
// `iconPx` so the button visually previews the result.
const TEXT_SIZE_OPTIONS: { scale: number; iconPx: number; label: string }[] = [
  { scale: 85, iconPx: 11, label: 'Smaller' },
  { scale: 100, iconPx: 14, label: 'Default' },
  { scale: 115, iconPx: 17, label: 'Larger' },
  { scale: 130, iconPx: 20, label: 'Largest' },
];

/** Round any stored scale to the nearest bucket — protects against legacy
 *  values left behind by the original slider (which allowed 85–130 step 5). */
function closestTextSize(scale: number): number {
  return TEXT_SIZE_OPTIONS.reduce(
    (closest, opt) =>
      Math.abs(opt.scale - scale) < Math.abs(closest - scale) ? opt.scale : closest,
    TEXT_SIZE_OPTIONS[1].scale,
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { session } = useAuth();
  const items = useItems();
  const nav = useNavigate();
  const prefs = usePreferences();

  // ── Sync (local → remote) state ──
  // The Sync card is visible only to signed-in users (they have a target
  // account). The count is read once on mount and refreshed after a
  // successful import / clear. We don't subscribe to localStorage events —
  // the mock store only mutates on this device, and the user can manually
  // refresh by re-navigating to Settings.
  const [localCount, setLocalCount] = useState<number>(() => countLocalImportable());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setLocalCount(countLocalImportable());
  }, []);

  const refreshLocalCount = () => setLocalCount(countLocalImportable());

  /**
   * Single-button sync: import every local item into the user's account
   * and then clear the local copy. The warning surfaced above the button
   * tells the user exactly what will happen, so we don't need a second
   * confirmation modal.
   *
   * Failure path leaves the local copy intact so the user can retry.
   */
  async function handleSyncLocal() {
    setImporting(true);
    try {
      const result = await importLocalNotesToSupabase();
      if (result.error) {
        notifications.show({
          message: `Sync failed: ${result.error}`,
          color: 'red',
          autoClose: 6000,
        });
        return;
      }
      if (result.imported === 0) {
        notifications.show({ message: 'No local notes to sync.', color: 'gray' });
        refreshLocalCount();
        return;
      }
      // Server accepted everything — safe to wipe local now.
      clearLocalNotes();
      refreshLocalCount();
      notifications.show({
        message: `Synced ${result.imported} ${result.imported === 1 ? 'item' : 'items'} to your account`,
        color: 'green',
      });
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' });
    } finally {
      setImporting(false);
    }
  }

  // Password change (existing functionality preserved).
  const [pw, setPw] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  async function changePassword() {
    if (pw.length < 8) {
      notifications.show({ message: 'Password must be at least 8 characters', color: 'yellow' });
      return;
    }
    if (pw !== pwConfirm) {
      notifications.show({ message: 'Passwords do not match', color: 'yellow' });
      return;
    }
    setPwBusy(true);
    try {
      await updateUserPassword(pw);
      setPw('');
      setPwConfirm('');
      notifications.show({ message: 'Password updated', color: 'green' });
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' });
    } finally {
      setPwBusy(false);
    }
  }

  async function signOut() {
    if (!usingSupabase) return;
    await supabase.auth.signOut();
    nav('/login', { replace: true });
  }

  // Rough storage estimate. Mock repo reads raw localStorage bytes; Supabase
  // repo counts items (per-row size not readily available).
  const storageNote = (() => {
    if (usingSupabase) {
      const noteCount = items.filter((i) => !i.isFolder && !i.trashed).length;
      const folderCount = items.filter((i) => i.isFolder && !i.trashed).length;
      return `${noteCount} ${noteCount === 1 ? 'note' : 'notes'} · ${folderCount} ${
        folderCount === 1 ? 'collection' : 'collections'
      }`;
    }
    try {
      const raw = localStorage.getItem('notes-demo-items-v1') ?? '';
      // UTF-16 ≈ 2 bytes per char.
      const kb = Math.max(1, Math.round((raw.length * 2) / 1024));
      return `${kb} KB local · ${items.filter((i) => !i.trashed).length} items`;
    } catch {
      return `${items.filter((i) => !i.trashed).length} items`;
    }
  })();

  return (
    <Container size="sm" py="xl">
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/" size="sm" c="dimmed">
          {t('nav.home')}
        </Anchor>
        <Text size="sm" c="dimmed" component="span">
          {t('nav.settings')}
        </Text>
      </Breadcrumbs>

      <Title order={2} mb="lg">
        {t('nav.settings')}
      </Title>

      <Stack gap="lg">
        {/* ── Appearance ── */}
        <Card withBorder p="lg" radius="md">
          <Stack gap="md">
            <div>
              <Text fw={600}>Appearance</Text>
              <Text size="sm" c="dimmed" mt={4}>
                Saved per device. Density and text size affect the UI only — markdown content always
                honors browser zoom.
              </Text>
            </div>

            <SettingsRow label="Theme">
              <SegmentedControl
                value={colorScheme}
                onChange={(v) => setColorScheme(v as 'light' | 'dark' | 'auto')}
                data={[
                  { label: 'Light', value: 'light' },
                  { label: 'Dark', value: 'dark' },
                  { label: 'System', value: 'auto' },
                ]}
              />
            </SettingsRow>

            <SettingsRow label="Density">
              <SegmentedControl
                value={prefs.density}
                onChange={(v) => setPreference('density', v as Density)}
                data={[
                  { label: 'Cozy', value: 'cozy' },
                  { label: 'Compact', value: 'compact' },
                ]}
              />
            </SettingsRow>

            <SettingsRow label="Text size">
              <SegmentedControl
                value={String(closestTextSize(prefs.textScale))}
                onChange={(v) => setPreference('textScale', parseInt(v, 10))}
                data={TEXT_SIZE_OPTIONS.map((opt) => ({
                  value: String(opt.scale),
                  label: (
                    <span
                      aria-label={opt.label}
                      title={opt.label}
                      style={{
                        fontSize: opt.iconPx,
                        fontWeight: 600,
                        letterSpacing: '-0.02em',
                        // Fixed height + flex centering keeps all four "A"s
                        // on the same baseline regardless of font size.
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 24,
                      }}
                    >
                      A
                    </span>
                  ),
                }))}
              />
            </SettingsRow>
          </Stack>
        </Card>

        {/* ── Language ── */}
        <Card withBorder p="lg" radius="md">
          <Stack gap="md">
            <div>
              <Text fw={600}>Language</Text>
              <Text size="sm" c="dimmed" mt={4}>
                Additional languages are coming soon.
              </Text>
            </div>
            <SettingsRow label="Display language">
              <Select
                data={[{ value: 'en', label: 'English (US)' }]}
                value="en"
                onChange={() => {
                  /* only English for v1 */
                }}
                style={{ width: 240 }}
                allowDeselect={false}
              />
            </SettingsRow>
          </Stack>
        </Card>

        {/* ── Editor ── */}
        <Card withBorder p="lg" radius="md">
          <Stack gap="md">
            <div>
              <Text fw={600}>Editor</Text>
              <Text size="sm" c="dimmed" mt={4}>
                Defaults applied when opening a note for editing.
              </Text>
            </div>

            <SettingsRow label="Default view">
              <SegmentedControl
                value={prefs.defaultView}
                onChange={(v) => setPreference('defaultView', v as DefaultView)}
                data={[
                  { label: 'Edit', value: 'edit' },
                  { label: 'Split', value: 'split' },
                  { label: 'Preview', value: 'preview' },
                ]}
              />
            </SettingsRow>

            <SettingsRow label="Show line numbers">
              <Switch
                checked={prefs.lineNumbers}
                onChange={(e) => setPreference('lineNumbers', e.currentTarget.checked)}
              />
            </SettingsRow>

            <SettingsRow label="Spell check">
              <Switch
                checked={prefs.spellcheck}
                onChange={(e) => setPreference('spellcheck', e.currentTarget.checked)}
              />
            </SettingsRow>
          </Stack>
        </Card>

        {/* ── Sync (signed-in only) ──
            Visible when a Supabase session exists. Lets users who took notes
            anonymously (in /demo or local mode) migrate them into their
            account after signing up so they show up on other devices. */}
        {usingSupabase && session && (
          <Card withBorder p="lg" radius="md">
            <Stack gap="md">
              <div>
                <Text fw={600}>Sync</Text>
                <Text size="sm" c="dimmed" mt={4}>
                  Move notes saved on this device into your account so they show up across all your
                  devices. Useful if you started in the demo, then signed up.
                </Text>
              </div>
              {localCount > 0 ? (
                <>
                  <Alert
                    variant="light"
                    color="yellow"
                    icon={<Icon icon={AlertTriangle} size="md" />}
                    title={`${localCount} local ${localCount === 1 ? 'item' : 'items'} not in your account`}
                  >
                    <Text size="sm">
                      These notes only exist on this device. Sync will copy them into your account
                      so they appear on every device you sign in on, then{' '}
                      <Text component="span" fw={600}>
                        remove the local copy
                      </Text>{' '}
                      from this browser. This can&rsquo;t be undone — if you want a local backup,
                      export them first.
                    </Text>
                  </Alert>
                  <Group justify="flex-end">
                    <Button
                      onClick={handleSyncLocal}
                      loading={importing}
                      leftSection={<Icon icon={CloudUpload} size={16} />}
                    >
                      Sync to my account
                    </Button>
                  </Group>
                </>
              ) : (
                <Text size="sm" c="dimmed">
                  No local notes to sync. Anything you create now is saved to your account
                  automatically.
                </Text>
              )}
            </Stack>
          </Card>
        )}

        {/* ── App ── */}
        <Card withBorder p="lg" radius="md">
          <Stack gap="md">
            <div>
              <Text fw={600}>App</Text>
              <Text size="sm" c="dimmed" mt={4}>
                Local storage and install state.
              </Text>
            </div>
            <SettingsRow label="Storage used">
              <Text size="sm" c="dimmed">
                {storageNote}
              </Text>
            </SettingsRow>
          </Stack>
        </Card>

        {/* ── Account (existing — preserved) ── */}
        {usingSupabase && session && (
          <Card withBorder p="lg" radius="md">
            <Stack gap="md">
              <div>
                <Text fw={600}>Change password</Text>
                <Text size="sm" c="dimmed" mt={4}>
                  Use at least 8 characters. You'll stay signed in after the change.
                </Text>
              </div>
              <PasswordInput
                label="New password"
                value={pw}
                onChange={(e) => setPw(e.currentTarget.value)}
                autoComplete="new-password"
              />
              <PasswordInput
                label="Confirm new password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.currentTarget.value)}
                autoComplete="new-password"
              />
              <Group justify="flex-end">
                <Button onClick={changePassword} loading={pwBusy} disabled={!pw || !pwConfirm}>
                  Update password
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        {usingSupabase && session && (
          <Card withBorder p="lg" radius="md">
            <Stack gap="md">
              <div>
                <Text fw={600} c="red">
                  {t('nav.signOut')}
                </Text>
                <Text size="sm" c="dimmed" mt={4}>
                  Ends your session on this device.
                </Text>
              </div>
              <Divider />
              <Group justify="flex-end">
                <Button color="red" variant="light" onClick={signOut}>
                  {t('nav.signOut')}
                </Button>
              </Group>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
}

/** Aligns a label + control on one row, stacks gracefully on narrow widths. */
function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Group justify="space-between" wrap="wrap" gap="md" align="center">
      <Text size="sm" fw={500} style={{ minWidth: 180 }}>
        {label}
      </Text>
      <div>{children}</div>
    </Group>
  );
}
