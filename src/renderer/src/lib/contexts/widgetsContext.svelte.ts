import {getContext, setContext} from 'svelte';

const WIDGETS_CONTEXT_KEY = Symbol('widgets');

// Fully qualified widget type names with namespaces
export type WidgetType =
  | 'widget.builtin.fcoin_calculator'
  | 'widget.builtin.notepad'
  | 'widget.builtin.mini_browser'
  | 'widget.builtin.action_pad'
  | 'widget.builtin.action_pin'
  | 'widget.builtin.floating_session'
  | 'widget.custom.example'
  | string
// Add more widget types here following the pattern: widget.namespace.name

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  visible: boolean;
  data?: any; // Initialization data for instanced widgets
  createdAt: number;
}

export interface WidgetsContext {
  widgets: WidgetInstance[];
  createWidget: (type: WidgetType, data?: any) => string;
  destroyWidget: (id: string) => void;
  showWidget: (id: string) => void;
  hideWidget: (id: string) => void;
  toggleWidget: (id: string) => void;
  getWidget: (id: string) => WidgetInstance | undefined;
  getWidgetsByType: (type: WidgetType) => WidgetInstance[];
  resetFloatingSessionPosition: (sessionId: string) => void;
  triggerWidgetReset: (widgetId: string) => void;
  widgetResetSignal: { value: string | null };
}

export function createWidgetsContext(): WidgetsContext {
  let widgets = $state<WidgetInstance[]>([]);
  let widgetResetSignal = $state<{ value: string | null }>({ value: null });

  return {
    get widgets() {
      return widgets;
    },

    get widgetResetSignal() {
      return widgetResetSignal;
    },

    createWidget(type: WidgetType, data?: any): string {
      const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newWidget: WidgetInstance = {
        id,
        type,
        visible: true,
        data,
        createdAt: Date.now()
      };
      widgets = [...widgets, newWidget];
      return id;
    },

    destroyWidget(id: string) {
      widgets = widgets.filter(w => w.id !== id);
    },

    showWidget(id: string) {
      widgets = widgets.map(w =>
        w.id === id ? {...w, visible: true} : w
      );
    },

    hideWidget(id: string) {
      widgets = widgets.map(w =>
        w.id === id ? {...w, visible: false} : w
      );
    },

    toggleWidget(id: string) {
      widgets = widgets.map(w =>
        w.id === id ? {...w, visible: !w.visible} : w
      );
    },

    getWidget(id: string): WidgetInstance | undefined {
      return widgets.find(w => w.id === id);
    },

    getWidgetsByType(type: WidgetType): WidgetInstance[] {
      return widgets.filter(w => w.type === type);
    },

    // ...existing code...
    resetFloatingSessionPosition(sessionId: string) {
      // Clear the stored position from localStorage
      const storageKey = `floating-window-widget.builtin.floating_session.session-${sessionId}`;
      localStorage.removeItem(storageKey);
    },

    triggerWidgetReset(widgetId: string) {
      widgetResetSignal.value = widgetId;
      // Clear the signal after a tick so it can be triggered again
      setTimeout(() => {
        widgetResetSignal.value = null;
      }, 50);
    }
  };
}

export function setWidgetsContext(context: WidgetsContext) {
  setContext(WIDGETS_CONTEXT_KEY, context);
}

export function getWidgetsContext(): WidgetsContext {
  const context = getContext<WidgetsContext>(WIDGETS_CONTEXT_KEY);
  if (!context) {
    throw new Error('WidgetsContext not found. Make sure WidgetControlPanel is used within WidgetsManager.');
  }
  return context;
}

