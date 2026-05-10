// Lightweight auth modal used by the Landing page until Chunk 3 introduces
// the global modal helper. Wraps the Login form in a Mantine <Modal>.
import { lazy, Suspense } from 'react';
import { Modal, Center, Loader } from '@mantine/core';

const Login = lazy(() => import('../pages/Login'));

export function AuthModalSimple({
  opened,
  onClose,
  initialMode,
}: {
  opened: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      centered
      size="auto"
      padding={0}
      overlayProps={{ backgroundOpacity: 0.6, blur: 2 }}
    >
      <Suspense
        fallback={
          <Center p="xl">
            <Loader />
          </Center>
        }
      >
        <Login embedded initialMode={initialMode} onSuccess={onClose} />
      </Suspense>
    </Modal>
  );
}
