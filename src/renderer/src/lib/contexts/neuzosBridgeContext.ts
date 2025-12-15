import { getContext, setContext } from "svelte";
import type { NeuzosBridge } from "$lib/core";

const NEUZOS_BRIDGE_CONTEXT_KEY = Symbol("neuzosBridge");

export function setNeuzosBridgeContext(bridge: NeuzosBridge): void {
  setContext(NEUZOS_BRIDGE_CONTEXT_KEY, bridge);
}

export function getNeuzosBridgeContext(): NeuzosBridge {
  const context = getContext<NeuzosBridge>(NEUZOS_BRIDGE_CONTEXT_KEY);
  if (!context) {
    throw new Error(
      "NeuzosBridgeContext not found. Make sure setNeuzosBridgeContext is called in a parent component.",
    );
  }
  return context;
}
