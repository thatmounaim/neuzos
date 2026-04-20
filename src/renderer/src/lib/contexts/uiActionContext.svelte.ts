import {getContext, setContext} from 'svelte';
import type {NeuzKeybind, UIActionHandler} from '$lib/types';

const UI_ACTION_CONTEXT_KEY = Symbol('uiAction');

export interface UIActionContext {
  register: (actionId: string, handler: UIActionHandler) => void;
  unregister: (actionId: string) => void;
  dispatch: (actionId: string) => void;
  startGamepadPoll: (binds: NeuzKeybind[]) => void;
  stopGamepadPoll: () => void;
}

export function createUIActionContext(): UIActionContext {
  let handlers = $state<Map<string, UIActionHandler>>(new Map());
  let gamepadRafId: number | null = null;
  let pressedButtons = new Set<string>();

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
    startGamepadPoll(binds: NeuzKeybind[]) {
      const gamepadBinds = binds.filter(bind => bind.key.startsWith('Gamepad') && bind.event.startsWith('ui.'));
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
              this.dispatch(bind.event);
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
