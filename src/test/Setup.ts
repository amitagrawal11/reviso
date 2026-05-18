import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mockSupabase } from './SupabaseMock';

// jsdom polyfills (must come before module mocks that may touch them).
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-ignore jsdom polyfill
window.ResizeObserver = ResizeObserverMock;

class IntersectionObserverMock {
  root = null;
  rootMargin = '';
  thresholds: number[] = [];
  callback: any;
  constructor(cb: any) {
    this.callback = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
// @ts-ignore jsdom polyfill
window.IntersectionObserver = IntersectionObserverMock;

if (!('scrollTo' in window)) {
  // @ts-ignore jsdom polyfill
  window.scrollTo = vi.fn();
}
// @ts-ignore jsdom polyfill
Element.prototype.scrollTo = vi.fn();
// @ts-ignore jsdom polyfill
Element.prototype.scrollIntoView = vi.fn();

if (!('randomUUID' in crypto)) {
  Object.defineProperty(crypto, 'randomUUID', {
    value: () => 'uuid-' + Math.random().toString(36).slice(2),
  });
}

if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
}

// ── Module mocks ──────────────────────────────────────────────────────────
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg></svg>' }),
    parse: vi.fn(),
  },
}));

vi.mock('@uiw/react-md-editor', () => {
  const Editor: any = (props: any) =>
    React.createElement('textarea', {
      'data-testid': 'md-editor',
      className: 'w-md-editor-text-input',
      value: props.value ?? '',
      onChange: (e: any) => props.onChange?.(e.currentTarget.value),
    });
  const Markdown = (props: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'md-view', className: 'markdown' },
      props.source ?? '',
    );
  Editor.Markdown = Markdown;
  return { default: Editor };
});

vi.mock('@uiw/react-md-editor/nohighlight', () => {
  const Editor: any = (props: any) =>
    React.createElement('textarea', {
      'data-testid': 'md-editor',
      value: props.value ?? '',
      onChange: (e: any) => props.onChange?.(e.currentTarget.value),
    });
  const Markdown = (props: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'md-view', className: 'markdown' },
      props.source ?? '',
    );
  Editor.Markdown = Markdown;
  return { default: Editor };
});

// supabase-js: createClient returns our shared mock.
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// react-i18next stub.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { changeLanguage: () => Promise.resolve() },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// @mantine/spotlight stub.
vi.mock('@mantine/spotlight', () => ({
  Spotlight: () => React.createElement('div', { 'data-testid': 'spotlight' }),
  spotlight: { open: vi.fn(), close: vi.fn() },
}));

vi.mock('@mantine/spotlight/styles.css', () => ({}));

// Quiet expected console noise during tests.
const origError = console.error;
console.error = (...args: unknown[]) => {
  const msg = String(args[0] ?? '');
  if (
    msg.includes('not wrapped in act') ||
    msg.includes('MantineProvider') ||
    msg.includes('inside a test was not wrapped')
  )
    return;
  origError(...args);
};
const origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = String(args[0] ?? '');
  if (msg.includes('[supabase]')) return;
  origWarn(...args);
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
