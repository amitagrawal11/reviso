import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  Card,
  Center,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Anchor,
  Alert,
} from '@mantine/core';
import { AlertCircle, BookOpen } from 'lucide-react';
import { supabase } from '@/features/authentication/api/SupabaseClient';
import { useAuth } from '@/features/authentication/context/AuthContext';
import { ItemIcon } from '@/shared/components/ItemIcon';

type Props = {
  /** Render without the full-viewport Center wrapper (e.g., when shown inside a modal). */
  embedded?: boolean;
  initialMode?: 'signin' | 'signup';
  /** Called after a successful auth response. The session itself comes through onAuthStateChange. */
  onSuccess?: () => void;
};

export default function SignInPage({ embedded = false, initialMode = 'signin', onSuccess }: Props) {
  const { session, loading } = useAuth();
  const location = useLocation() as { state?: { from?: string } };
  const from = location.state?.from ?? '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Keep mode in sync if the parent flips initialMode (e.g., switching CTAs).
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Standalone-page redirect once a session arrives. Embedded variant lets the
  // parent (modal) handle dismiss via onSuccess.
  if (!loading && session && !embedded) return <Navigate to={from} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setErr(error.message);
          return;
        }
      } else {
        const trimmed = name.trim();
        if (!trimmed) {
          setErr('Please enter your name.');
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: trimmed } },
        });
        if (error) {
          setErr(error.message);
          return;
        }
      }
      onSuccess?.();
    } finally {
      setBusy(false);
    }
  }

  const card = (
    <Card withBorder shadow="sm" radius="md" w={400} p="lg">
      <Stack gap="md">
        <Stack gap={4} align="center">
          <ItemIcon icon={BookOpen} size={28} />
          <Title order={3}>{mode === 'signin' ? 'Welcome back' : 'Create your free account'}</Title>
          <Text size="sm" c="dimmed" ta="center">
            {mode === 'signin'
              ? 'Sign in to your synced workspace.'
              : 'No credit card. No email confirmation. Your notes start syncing as soon as you’re in.'}
          </Text>
        </Stack>
        <form onSubmit={submit}>
          <Stack gap="sm">
            {mode === 'signup' && (
              <TextInput
                label="Name"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                placeholder="Your name"
              />
            )}
            <TextInput
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="you@example.com"
            />
            <PasswordInput
              label="Password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              placeholder="At least 8 characters"
            />
            {err && (
              <Alert color="red" variant="light" icon={<ItemIcon icon={AlertCircle} size={16} />}>
                {err}
              </Alert>
            )}
            <Button type="submit" loading={busy} fullWidth>
              {mode === 'signin' ? 'Sign in' : 'Sign up'}
            </Button>
          </Stack>
        </form>
        <Text size="sm" ta="center" c="dimmed">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <Anchor
            component="button"
            type="button"
            onClick={() => {
              setErr(null);
              setMode(mode === 'signin' ? 'signup' : 'signin');
            }}
          >
            {mode === 'signin' ? 'Create one' : 'Sign in'}
          </Anchor>
        </Text>
      </Stack>
    </Card>
  );

  if (embedded) return card;
  return (
    <Center h="100vh" px="md">
      {card}
    </Center>
  );
}
