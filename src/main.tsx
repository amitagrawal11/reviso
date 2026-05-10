import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider, createTheme, localStorageColorSchemeManager } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './lib/inject-styles';
import App from './App';
import { AuthProvider } from './lib/auth';

const theme = createTheme({
  primaryColor: 'blue',
  // System font stack — zero network cost, zero FOUT.
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif',
  defaultRadius: 'md',
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
