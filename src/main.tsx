import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider, createTheme, localStorageColorSchemeManager } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './lib/inject-styles';
import './lib/i18n';
// Import for module-load side effect: reads persisted prefs from localStorage
// and applies them to <html> (data-density, --text-scale) before React mounts,
// so the user never sees a flash of default density / size.
import './lib/preferences';
import App from './App';
import { AuthProvider } from './lib/auth';

const theme = createTheme({
  primaryColor: 'blue',
  // UI: Inter (loaded in index.html, display=swap). Falls back through system
  // stack until Inter is available. Mono: JetBrains Mono, same loading model.
  fontFamily: 'var(--font-ui)',
  fontFamilyMonospace: 'var(--font-mono)',
  defaultRadius: 'md',
  // Heading sizes pulled from token scale. Mantine <Title> rendering uses
  // Inter (the UI font), not the display serif — display tier is reserved
  // for hero / note-title surfaces that opt in via the .display-title class
  // (NoteView, Landing hero). Generic page titles (Settings, Trash, etc.)
  // stay sans for consistency with their content.
  headings: {
    fontFamily: 'var(--font-ui)',
    sizes: {
      h1: { fontSize: 'var(--text-h1)', lineHeight: 'var(--lh-tight)', fontWeight: '700' },
      h2: { fontSize: 'var(--text-h2)', lineHeight: 'var(--lh-snug)', fontWeight: '600' },
      h3: { fontSize: 'var(--text-h3)', lineHeight: 'var(--lh-snug)', fontWeight: '600' },
      h4: { fontSize: 'var(--text-body-lg)', lineHeight: 'var(--lh-snug)', fontWeight: '600' },
      h5: { fontSize: 'var(--text-body)', lineHeight: 'var(--lh-base)', fontWeight: '600' },
      h6: { fontSize: 'var(--text-sm)', lineHeight: 'var(--lh-base)', fontWeight: '600' },
    },
  },
});

const colorSchemeManager = localStorageColorSchemeManager({ key: 'notes-color-scheme' });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider
      theme={theme}
      defaultColorScheme="auto"
      colorSchemeManager={colorSchemeManager}
    >
      <Notifications position="bottom-center" />
      <BrowserRouter>
        <AuthProvider>
          <ModalsProvider>
            <App />
          </ModalsProvider>
        </AuthProvider>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>,
);
