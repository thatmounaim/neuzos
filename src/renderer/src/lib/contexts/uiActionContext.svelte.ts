import {getContext, setContext} from 'svelte';
import type {NeuzKeybind, UIActionHandler} from '$lib/types';

const UI_ACTION_CONTEXT_KEY = Symbol('uiAction');

export interface UIActionContext {
  register: (actionId: string, handler: UIActionHandler) => void;
  unregister: (actionId: string) => void;
  dispatch: (actionId: string) => void;
  startGamepadPoll: (binds: NeuzKeybind[], onDispatch: (bind: NeuzKeybind) => void) => void;
  stopGamepadPoll: () => void;
  startMouseListener: (binds: NeuzKeybind[], onDispatch: (bind: NeuzKeybind) => void) => void;
  stopMouseListener: () => void;
}

function normalizeMouseButtonToKey(button: number): string | null {
  if (button === 1) return 'middle';
  if (button === 3) return 'mouse4';
  if (button === 4) return 'mouse5';
  return null;
}

export function createUIActionContext(): UIActionContext {
  let handlers = $state<Map<string, UIActionHandler>>(new Map());
  let gamepadRafId: number | null = null;
  let pressedButtons = new Set<string>();
  let mouseHandler: ((e: MouseEvent) => void) | null = null;

  return {
    register(actionId: string, handler: UIActionHandler) {
      const nextHandlers = new Map(handlers);
      nextHandlers.set(actionId, handler);
      handlers = nextHandlers;
    },
    unregister(actionId: string) {
      if (!handlers.has(actionId)) {
        return;
      }

      const nextHandlers = new Map(handlers);
      nextHandlers.delete(actionId);
      handlers = nextHandlers;
    },
    dispatch(actionId: string) {
      const handler = handlers.get(actionId);
      if (!handler) {
        console.warn(`[UIActionContext] No handler registered for ${actionId}`);
        return;
      }

      handler();
    },
    startGamepadPoll(binds: NeuzKeybind[], onDispatch: (bind: NeuzKeybind) => void) {
      const gamepadBinds = binds.filter(bind => bind.key.startsWith('Gamepad'));
      if (gamepadBinds.length === 0) {
        this.stopGamepadPoll();
        return;
      }

      this.stopGamepadPoll();

      const poll = () => {
        const gamepads = navigator.getGamepads();
        const activeKeys = new Set<string>();

        for (const gamepad of gamepads) {
          if (!gamepad) continue;

          for (let buttonIndex = 0; buttonIndex < gamepad.buttons.length; buttonIndex++) {
            const button = gamepad.buttons[buttonIndex];
            if (!button?.pressed) continue;

            const key = `Gamepad${gamepad.index}:Button${buttonIndex}`;
            activeKeys.add(key);

            if (pressedButtons.has(key)) {
              continue;
            }

            const bind = gamepadBinds.find(candidate => candidate.key === key);
            if (bind) {
              onDispatch(bind);
            }

            pressedButtons.add(key);
          }
        }

        for (const key of Array.from(pressedButtons)) {
          if (!activeKeys.has(key)) {
            pressedButtons.delete(key);
          }
        }

        gamepadRafId = requestAnimationFrame(poll);
      };

      gamepadRafId = requestAnimationFrame(poll);
    },
    stopGamepadPoll() {
      if (gamepadRafId !== null) {
        cancelAnimationFrame(gamepadRafId);
        gamepadRafId = null;
      }
      pressedButtons = new Set();
    },
    startMouseListener(binds: NeuzKeybind[], onDispatch: (bind: NeuzKeybind) => void) {
      this.stopMouseListener();
      const mouseBinds = binds.filter(b => {
        const k = b.key.toLowerCase();
        return k === 'middle' || k === 'mouse4' || k === 'mouse5';
      });
      if (mouseBinds.length === 0) return;

      mouseHandler = (event: MouseEvent) => {
        const key = normalizeMouseButtonToKey(event.button);
        if (!key) return;
        const bind = mouseBinds.find(b => b.key.toLowerCase() === key);
        if (bind) {
          onDispatch(bind);
        }
      };

      window.addEventListener('mousedown', mouseHandler, true);
    },
    stopMouseListener() {
      if (mouseHandler) {
        window.removeEventListener('mousedown', mouseHandler, true);
        mouseHandler = null;
      }
    }
  };
}

export function setUIActionContext(context: UIActionContext) {
  setContext(UI_ACTION_CONTEXT_KEY, context);
}

export function getUIActionContext(): UIActionContext {
  const context = getContext<UIActionContext>(UI_ACTION_CONTEXT_KEY);
  if (!context) {
    throw new Error('UIActionContext not found. Make sure App is used as the provider root.');
  }
  return context;
}
