// Decouples "request to open Spotlight" from the @mantine/spotlight package
// so neither Shell nor Sidebar pull spotlight into the critical chunk.

let pending = false;
const subs = new Set<() => void>();

export function requestSpotlight() {
  pending = true;
  subs.forEach((s) => s());
}

export function consumePendingSpotlight() {
  const was = pending;
  pending = false;
  return was;
}

export function subscribeSpotlight(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}
