/**
 * Pub/sub bridge for the NoteQuickCaptureButton drawer.
 * Kept in its own module so AppLayout.tsx can import just this tiny file
 * without pulling in the heavy rehype/highlight.js chunk that lives in
 * NoteQuickCaptureButton.tsx.
 *
 * Usage (imperative, from anywhere):
 *   openQuickCapture(parentId?)   // opens the drawer, optionally pre-selecting a collection
 */

type CaptureListener = (parentId?: string | null) => void;
const listeners = new Set<CaptureListener>();

export function openQuickCapture(parentId?: string | null) {
  listeners.forEach((l) => l(parentId));
}

export function subscribeQuickCapture(listener: CaptureListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
