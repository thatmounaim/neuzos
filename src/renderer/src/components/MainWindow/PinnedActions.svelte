<script lang="ts">
  import {getContext} from 'svelte';
  import {Swords} from '@lucide/svelte';
  import {Separator} from '$lib/components/ui/separator';
  import {Button} from '$lib/components/ui/button';
  import type {MainWindowState} from '$lib/types';
  import {getCooldownsContext} from '$lib/contexts/cooldownsContext';
  import {getWidgetsContext} from '$lib/contexts/widgetsContext.svelte';

  const mainWindowState = getContext<MainWindowState>('mainWindowState');
  const cooldownsContext = getCooldownsContext();
  const widgetsContext = getWidgetsContext();

  // Force reactivity for cooldown updates
  let cooldownTrigger = $state(0);
  $effect(() => {
    const unsubscribe = cooldownsContext.subscribe(() => {
      cooldownTrigger++;
    });
    return () => unsubscribe();
  });

  // Helper to get action state that depends on cooldownTrigger for reactivity
  function getActionStateReactive(sessionId: string, actionId: string) {
    cooldownTrigger;
    return cooldownsContext.getActionState(sessionId, actionId);
  }

  // Helper to format cooldown time in mm:ss
  function formatCooldownTime(cooldownEndTime: number): string {
    if (!cooldownEndTime) return '';
    const remaining = Math.max(0, cooldownEndTime - Date.now());
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Get all pinned actions from sessions that have action pad widgets (even if hidden)
  const pinnedActionsToShow = $derived.by(() => {
    const actionPadWidgets = widgetsContext.widgets.filter(w =>
      w.type === 'widget.builtin.action_pad' && w.data?.sessionId
    );

    const result: Array<{
      sessionId: string;
      sessionLabel: string;
      actions: Array<any>;
    }> = [];

    actionPadWidgets.forEach(widget => {
      const sessionId = widget.data.sessionId;
      const sessionActions = mainWindowState.config.sessionActions?.find(sa => sa.sessionId === sessionId);

      if (sessionActions) {
        const pinnedActions = sessionActions.actions.filter(a => a.pinned);
        if (pinnedActions.length > 0) {
          const session = mainWindowState.config.sessions.find(s => s.id === sessionId);
          result.push({
            sessionId,
            sessionLabel: session?.label || 'Unknown',
            actions: pinnedActions
          });
        }
      }
    });

    return result;
  });

  function triggerPinnedAction(sessionId: string, actionId: string) {
    // Check if action is ready
    if (!cooldownsContext.canUseAction(sessionId, actionId)) {
      console.log("Action on cooldown, ignoring");
      return;
    }

    // Find the session actions for this session
    const sessionActionsData = mainWindowState.config.sessionActions?.find(sa => sa.sessionId === sessionId);
    if (!sessionActionsData) {
      console.warn("No session actions found for session:", sessionId);
      return;
    }

    // Find the specific action
    const action = sessionActionsData.actions.find(a => a.id === actionId);
    if (!action) {
      console.warn("Action not found:", actionId, "in session:", sessionId);
      return;
    }

    console.log("Executing pinned action:", action.label, "for session:", sessionId);

    // Start cast FIRST to mark action as "in use" and prevent double-triggering
    if (action.castTime > 0) {
      cooldownsContext.startCast(sessionId, actionId, action.castTime);
    }

    // Send the key immediately to buffer/queue the action in-game
    sendActionKeyToSession(sessionId, action);

    // After cast time, start cooldown
    if (action.castTime > 0) {
      setTimeout(() => {
        if (action.cooldown > 0) {
          cooldownsContext.startCooldown(sessionId, actionId, action.cooldown);

          // Trigger cooldowns for all actions in the same category
          if (action.cooldownCategory && action.cooldownCategory.trim() !== '') {
            triggerCategoryCooldowns(sessionId, action.cooldownCategory, action.cooldown, actionId);
          }
        }
      }, action.castTime * 1000);
    } else {
      // No cast time, start cooldown immediately
      if (action.cooldown > 0) {
        cooldownsContext.startCooldown(sessionId, actionId, action.cooldown);

        // Trigger cooldowns for all actions in the same category
        if (action.cooldownCategory && action.cooldownCategory.trim() !== '') {
          triggerCategoryCooldowns(sessionId, action.cooldownCategory, action.cooldown, actionId);
        }
      }
    }
  }

  function triggerCategoryCooldowns(sessionId: string, category: string, cooldown: number, excludeActionId: string) {
    // Find the session actions for this session
    const sessionActionsData = mainWindowState.config.sessionActions?.find(sa => sa.sessionId === sessionId);
    if (!sessionActionsData) return;

    // Find all actions with the same category (excluding the one that was just triggered)
    const categoryActions = sessionActionsData.actions.filter(
      a => a.id !== excludeActionId &&
           a.cooldownCategory &&
           a.cooldownCategory.trim() === category.trim()
    );

    // Start cooldown for each action in the category
    categoryActions.forEach(categoryAction => {
      cooldownsContext.startCooldown(sessionId, categoryAction.id, cooldown);
    });
  }

  function sendActionKeyToSession(sessionId: string, action: any) {
    // Send the action key to all neuz clients for this session across all layouts
    const sessionLayouts = mainWindowState.sessionsLayoutsRef[sessionId]?.layouts;
    if (sessionLayouts) {
      Object.keys(sessionLayouts).forEach(layoutId => {
        const neuzClient = sessionLayouts[layoutId] as any;
        if (neuzClient && neuzClient.sendKey && action.ingameKey) {
          console.log("Sending key", action.ingameKey, "to session", sessionId, "in layout", layoutId);
          neuzClient.sendKey(action.ingameKey);
        }
      });
    }
  }
</script>

<!-- Pinned Actions -->
{#each pinnedActionsToShow as sessionPinned, sessionIndex (sessionPinned.sessionId)}
  {#if sessionIndex > 0}
    <Separator orientation="vertical" class="h-4"/>
  {/if}
  {#snippet sessionGroup()}
    {@const session = mainWindowState.config.sessions.find(s => s.id === sessionPinned.sessionId)}
    <div class="flex items-center gap-1 px-1.5 rounded-md bg-accent/30">
      {#if session}
        <div class="relative size-5 p-0 flex items-center justify-center" title="{sessionPinned.sessionLabel}">
          <img
            src="icons/{session.icon.slug}.png"
            alt={sessionPinned.sessionLabel}
            class="h-full w-full object-contain"
          />
        </div>
      {/if}
      {#each sessionPinned.actions as action (action.id)}
      {@const state = getActionStateReactive(sessionPinned.sessionId, action.id)}
      {@const isOnCooldown = state.cooldownProgress > 0 || state.isCasting}
      {@const cooldownAngle = (1 - state.cooldownProgress) * 360}

        <Button
          variant="outline"
          size="icon-xs"
          class="relative size-7 p-0 overflow-hidden {isOnCooldown ? 'opacity-60' : ''}"
          onclick={() => !isOnCooldown && triggerPinnedAction(sessionPinned.sessionId, action.id)}
          title="{action.label} ({sessionPinned.sessionLabel}) - Key: {action.ingameKey || 'Not set'} - Cast: {action.castTime}s | CD: {action.cooldown}s"
          disabled={isOnCooldown}
        >
          {#if action.icon?.slug}
            <img
              src="icons/{action.icon.slug}.png"
              alt={action.label}
              class="w-full h-full object-cover {state.isCasting ? 'brightness-150' : ''}"
            />
          {:else}
            <Swords class="h-4 w-4 {state.isCasting ? 'brightness-150' : ''}"/>
          {/if}

        <!-- Radial cooldown overlay -->
        {#if state.cooldownProgress > 0}
          <div class="absolute inset-0 right-0 top-0 pointer-events-none">
            <svg class="size-7" viewBox="0 0 48 48">
              <defs>
                <mask id="cooldown-mask-mainbar-{action.id}">
                  <rect width="48" height="48" fill="white" />
                  <path
                    d="M24,24 L24,0 A24,24 0 {cooldownAngle > 180 ? '1' : '0'},1 {24 + 24 * Math.sin(cooldownAngle * Math.PI / 180)},{24 - 24 * Math.cos(cooldownAngle * Math.PI / 180)} Z"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="48"
                height="48"
                fill="rgba(0, 0, 0, 0.6)"
                mask="url(#cooldown-mask-mainbar-{action.id})"
              />
            </svg>
          </div>
        {/if}

        <!-- Casting overlay -->
        {#if state.isCasting}
          <div class="absolute inset-0 bg-white/30 pointer-events-none"></div>
        {/if}

        <!-- Cooldown Timer Display - positioned above overlays -->
        {#if state.cooldownProgress > 0 && state.cooldownEndTime > 0}
          <div class="absolute bottom-0 left-0 right-0 text-center text-[8px] font-bold text-white bg-black/60 px-0.5 pointer-events-none leading-tight z-10">
            {formatCooldownTime(state.cooldownEndTime)}
          </div>
        {/if}
      </Button>
      {/each}
    </div>
  {/snippet}
  {@render sessionGroup()}
{/each}

