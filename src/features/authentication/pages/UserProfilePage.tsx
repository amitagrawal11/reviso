import { useEffect, useState } from 'react';
import {
  Container,
  Stack,
  Group,
  Avatar,
  Title,
  Text,
  TextInput,
  Button,
  Card,
  Anchor,
  Breadcrumbs,
} from '@mantine/core';
import { Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/features/authentication/context/AuthContext';
import { updateProfileName } from '@/features/authentication/api/UserProfileApi';
import { usingSupabase } from '@/features/notes/repository/NoteRepositoryContext';

export default function UserProfilePage() {
  const { session, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (profile) setName(profile.name);
  }, [profile]);

  if (!usingSupabase) {
    return (
      <Container size="sm" py="xl">
        <Title order={2}>Profile</Title>
        <Text c="dimmed" mt="xs">
          Profile is only available when Supabase is configured. The local demo store does not have
          user accounts.
        </Text>
      </Container>
    );
  }

  const email = session?.user.email ?? '';
  const display = name.trim() || email.split('@')[0] || 'User';
  const initial = (display[0] ?? 'U').toUpperCase();
  const memberSince = session?.user.created_at
    ? new Date(session.user.created_at).toLocaleDateString()
    : '—';

  async function save() {
    if (!session) return;
    if (!name.trim()) {
      notifications.show({ message: 'Name cannot be empty', color: 'yellow' });
      return;
    }
    setBusy(true);
    try {
      await updateProfileName(session.user.id, name.trim());
      await refreshProfile();
      setDirty(false);
      notifications.show({ message: 'Profile updated', color: 'green' });
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container size="sm" py="xl">
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/" size="sm" c="dimmed">
          Home
        </Anchor>
        <Text size="sm" c="dimmed" component="span">
          Profile
        </Text>
      </Breadcrumbs>

      <Title order={2} mb="lg">
        Profile
      </Title>

      <Card withBorder p="lg" radius="md">
        <Stack gap="lg">
          <Group gap="md">
            <Avatar size="xl" radius="xl" color="blue">
              {initial}
            </Avatar>
            <div>
              <Title order={4}>{display}</Title>
              <Text size="sm" c="dimmed">
                {email}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Member since {memberSince}
              </Text>
            </div>
          </Group>

          <TextInput
            label="Name"
            description="Shown in the sidebar."
            value={name}
            onChange={(e) => {
              setName(e.currentTarget.value);
              setDirty(true);
            }}
          />
          <TextInput
            label="Email"
            value={email}
            disabled
            description="Email is your sign-in identifier and can't be changed here yet."
          />

          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={!dirty}
              onClick={() => {
                setName(profile?.name ?? '');
                setDirty(false);
              }}
            >
              Reset
            </Button>
            <Button onClick={save} loading={busy} disabled={!dirty}>
              Save changes
            </Button>
          </Group>
        </Stack>
      </Card>
    </Container>
  );
}
