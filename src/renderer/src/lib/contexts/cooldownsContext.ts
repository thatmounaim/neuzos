import { getContext, setContext } from 'svelte';

const COOLDOWNS_CONTEXT_KEY = Symbol('cooldowns');

export interface ActionCooldownState {
  isCasting: boolean;
  cooldownProgress: number; // 0 to 1, where 1 is full cooldown
  cooldownEndTime: number; // timestamp when cooldown ends
  castStartTime: number; // timestamp when cast started
}

export interface CooldownsContext {
  getActionState: (sessionId: string, actionId: string) => ActionCooldownState;
  startCast: (sessionId: string, actionId: string, castTime: number) => void;
  startCooldown: (sessionId: string, actionId: string, cooldown: number) => void;
  isActionReady: (sessionId: string, actionId: string) => boolean;
  canUseAction: (sessionId: string, actionId: string) => boolean;
  resetAction: (sessionId: string, actionId: string) => void;
  resetAllActions: () => void;
  subscribe: (callback: () => void) => () => void;
}

// Create a key for state storage
function getStateKey(sessionId: string, actionId: string): string {
  return `${sessionId}::${actionId}`;
}

class CooldownsManager {
  private cooldownStates = new Map<string, ActionCooldownState>();
  private activeTimers = new Map<string, number>();
  private subscribers = new Set<() => void>();

  subscribe(callback: () => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach(callback => callback());
  }

  getActionState(sessionId: string, actionId: string): ActionCooldownState {
    const key = getStateKey(sessionId, actionId);
    let state = this.cooldownStates.get(key);

    if (!state) {
      state = {
        isCasting: false,
        cooldownProgress: 0,
        cooldownEndTime: 0,
        castStartTime: 0,
      };
      this.cooldownStates.set(key, state);
    }

    return state;
  }

  private updateState(sessionId: string, actionId: string, updates: Partial<ActionCooldownState>) {
    const key = getStateKey(sessionId, actionId);
    const currentState = this.getActionState(sessionId, actionId);
    const newState = { ...currentState, ...updates };
    this.cooldownStates.set(key, newState);
    // Trigger reactivity
    this.notify();
  }

  private clearTimer(sessionId: string, actionId: string) {
    const key = getStateKey(sessionId, actionId);
    const timerId = this.activeTimers.get(key);
    if (timerId) {
      clearInterval(timerId);
      this.activeTimers.delete(key);
    }
  }

  startCast(sessionId: string, actionId: string, castTime: number) {
    if (castTime <= 0) return;

    const key = getStateKey(sessionId, actionId);
    this.clearTimer(sessionId, actionId);

    const castStartTime = Date.now();
    this.updateState(sessionId, actionId, {
      isCasting: true,
      castStartTime,
    });

    // Clear casting state after cast time
    const castTimer = setTimeout(() => {
      this.updateState(sessionId, actionId, {
        isCasting: false,
        castStartTime: 0,
      });
      this.activeTimers.delete(key);
    }, castTime * 1000);

    this.activeTimers.set(key, castTimer as any);
  }

  startCooldown(sessionId: string, actionId: string, cooldown: number) {
    if (cooldown <= 0) return;

    const key = getStateKey(sessionId, actionId);
    this.clearTimer(sessionId, actionId);

    const endTime = Date.now() + (cooldown * 1000);
    this.updateState(sessionId, actionId, {
      cooldownEndTime: endTime,
      cooldownProgress: 1,
      isCasting: false,
    });

    // Update cooldown progress every 0.2 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        this.updateState(sessionId, actionId, {
          cooldownProgress: 0,
          cooldownEndTime: 0,
        });
        clearInterval(interval);
        this.activeTimers.delete(key);
      } else {
        const progress = remaining / (cooldown * 1000);
        this.updateState(sessionId, actionId, {
          cooldownProgress: progress,
        });
      }
    }, 200); // 0.2 second ticks

    this.activeTimers.set(key, interval as any);
  }

  isActionReady(sessionId: string, actionId: string): boolean {
    const state = this.getActionState(sessionId, actionId);
    return !state.isCasting && state.cooldownProgress === 0;
  }

  canUseAction(sessionId: string, actionId: string): boolean {
    return this.isActionReady(sessionId, actionId);
  }

  resetAction(sessionId: string, actionId: string) {
    this.clearTimer(sessionId, actionId);
    this.updateState(sessionId, actionId, {
      isCasting: false,
      cooldownProgress: 0,
      cooldownEndTime: 0,
      castStartTime: 0,
    });
  }

  resetAllActions() {
    // Clear all timers
    this.activeTimers.forEach((timerId) => clearInterval(timerId));
    this.activeTimers.clear();

    // Reset all states
    this.cooldownStates = new Map();
  }
}

export function createCooldownsContext(): CooldownsContext {
  const manager = new CooldownsManager();

  return {
    getActionState: manager.getActionState.bind(manager),
    startCast: manager.startCast.bind(manager),
    startCooldown: manager.startCooldown.bind(manager),
    isActionReady: manager.isActionReady.bind(manager),
    canUseAction: manager.canUseAction.bind(manager),
    resetAction: manager.resetAction.bind(manager),
    resetAllActions: manager.resetAllActions.bind(manager),
    subscribe: manager.subscribe.bind(manager),
  };
}

export function setCooldownsContext(context: CooldownsContext) {
  setContext(COOLDOWNS_CONTEXT_KEY, context);
}

export function getCooldownsContext(): CooldownsContext {
  return getContext<CooldownsContext>(COOLDOWNS_CONTEXT_KEY);
}

