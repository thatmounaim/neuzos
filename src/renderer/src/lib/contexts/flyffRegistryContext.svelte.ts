import { getContext, setContext } from 'svelte';
import type { FlyffRegistry } from '$lib/flyff/jobs';

const REGISTRY_CONTEXT_KEY = Symbol('flyffRegistry');

export interface FlyffRegistryContext {
  readonly registry: FlyffRegistry | null;
  readonly ready: boolean;
  setRegistry: (r: FlyffRegistry) => void;
}

export function createFlyffRegistryContext(): FlyffRegistryContext {
  let registry = $state<FlyffRegistry | null>(null);

  return {
    get registry() { return registry; },
    get ready() { return registry !== null; },
    setRegistry(r: FlyffRegistry) { registry = r; },
  };
}

export function setFlyffRegistryContext(ctx: FlyffRegistryContext) {
  setContext(REGISTRY_CONTEXT_KEY, ctx);
}

export function getFlyffRegistryContext(): FlyffRegistryContext {
  const ctx = getContext<FlyffRegistryContext>(REGISTRY_CONTEXT_KEY);
  if (!ctx) throw new Error('FlyffRegistryContext not found');
  return ctx;
}
