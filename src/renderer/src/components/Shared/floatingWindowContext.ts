export const FLOATING_WINDOW_CONTEXT_KEY = Symbol('floatingWindow');

export interface FloatingWindowContext {
  isResizing: boolean;
  isDragging: boolean;
  activeWindowId: string | null;
  setActiveWindow: (id: string) => void;
}

