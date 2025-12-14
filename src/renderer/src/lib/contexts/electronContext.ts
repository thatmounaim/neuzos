import { getContext, setContext } from "svelte";
import type { IpcRenderer } from "@electron-toolkit/preload";

const ELECTRON_CONTEXT_KEY = Symbol("electron");

export function setElectronContext(ipcRenderer: IpcRenderer): void {
  setContext(ELECTRON_CONTEXT_KEY, ipcRenderer);
}

export function getElectronContext(): IpcRenderer {
  const context = getContext<IpcRenderer>(ELECTRON_CONTEXT_KEY);
  if (!context) {
    throw new Error(
      "ElectronContext not found. Make sure setElectronContext is called in a parent component.",
    );
  }
  return context;
}
