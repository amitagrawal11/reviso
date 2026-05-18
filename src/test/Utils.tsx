import { ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { MemoryRouter } from 'react-router-dom';
import { render, RenderOptions } from '@testing-library/react';

export function AllProviders({
  children,
  initialEntries = ['/'],
}: {
  children: ReactNode;
  initialEntries?: string[];
}) {
  return (
    <MantineProvider>
      <Notifications />
      <MemoryRouter initialEntries={initialEntries}>
        <ModalsProvider>{children}</ModalsProvider>
      </MemoryRouter>
    </MantineProvider>
  );
}

export function renderWithProviders(
  ui: ReactNode,
  { initialEntries, ...options }: RenderOptions & { initialEntries?: string[] } = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders initialEntries={initialEntries}>{children}</AllProviders>
    ),
    ...options,
  });
}

export * from '@testing-library/react';
