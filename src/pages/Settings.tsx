import { useState } from 'react';
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
} from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../lib/auth';
import { updateUserPassword } from '../lib/profile';
import { supabase } from '../lib/supabase';
import { usingSupabase } from '../lib/data-mode';

export default function Settings() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { session } = useAuth();
  const nav = useNavigate();

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

  return (
    <Container size="sm" py="xl">
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/" size="sm" c="dimmed">Home</Anchor>
        <Text size="sm" c="dimmed" component="span">Settings</Text>
      </Breadcrumbs>

      <Title order={2} mb="lg">Settings</Title>

      <Stack gap="lg">
        <Card withBorder p="lg" radius="md">
          <Stack gap="md">
            <div>
              <Text fw={600}>Appearance</Text>
              <Text size="sm" c="dimmed" mt={4}>
                Choose your preferred theme. Saved per device.
              </Text>
            </div>
            <SegmentedControl
              value={colorScheme}
              onChange={(v) => setColorScheme(v as 'light' | 'dark' | 'auto')}
              data={[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
                { label: 'System', value: 'auto' },
              ]}
            />
          </Stack>
        </Card>

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
                <Button
                  onClick={changePassword}
                  loading={pwBusy}
                  disabled={!pw || !pwConfirm}
                >
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
                <Text fw={600} c="red">Sign out</Text>
                <Text size="sm" c="dimmed" mt={4}>
                  Ends your session on this device.
                </Text>
              </div>
              <Divider />
              <Group justify="flex-end">
                <Button color="red" variant="light" onClick={signOut}>
                  Sign out
                </Button>
              </Group>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
