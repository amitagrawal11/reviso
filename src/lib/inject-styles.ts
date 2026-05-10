// Tiny app-specific stylesheet — small enough that inlining beats a
// separate <link rel="stylesheet"> roundtrip. Mantine's larger CSS stays
// as a normal stylesheet to keep it cacheable across pages.
import css from '../styles.css?inline';

if (typeof document !== 'undefined' && !document.getElementById('app-inline-css')) {
  const el = document.createElement('style');
  el.id = 'app-inline-css';
  el.textContent = css;
  document.head.appendChild(el);
}
