<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import FloatingWindow from '../../../Shared/FloatingWindow.svelte';
  import SkillButton from './SkillButton.svelte';
  import SetupDialog from './SetupDialog.svelte';
  import { Timer } from '@lucide/svelte';
  import type { MainWindowState, CooldownOverlayConfig } from '$lib/types';
  import { getCooldownsContext } from '$lib/contexts/cooldownsContext';
  import { getFlyffRegistryContext } from '$lib/contexts/flyffRegistryContext.svelte';
  import { getElectronContext } from '$lib/contexts/electronContext';

  interface Props {
    visible?: boolean;
    onClose?: () => void;
    onHide?: () => void;
    data?: { overlayId: string };
  }

  let { visible = true, onClose, onHide, data }: Props = $props();

  const mainWindowState = getContext<MainWindowState>('mainWindowState');
  const cooldownsContext = getCooldownsContext();
  const registryContext = getFlyffRegistryContext();
  const electronApi = getElectronContext();

  const overlayId = data?.overlayId ?? '';
  const PERSIST_ID = `widget.builtin.cooldown_overlay-${overlayId}`;
  const LOCK_KEY = `${PERSIST_ID}-locked`;

  const overlayConfig = $derived(
    mainWindowState.config.cooldownOverlays?.find(c => c.id === overlayId) ?? null
  );

  const sessionId = $derived(overlayConfig?.sessionId ?? '');
  const session = $derived(mainWindowState.config.sessions.find(s => s.id === sessionId));
  const sessionLabel = $derived(session?.label ?? 'Unknown');

  const registryClass = $derived(
    registryContext.registry?.classes.find(c => c.id === overlayConfig?.classId) ?? null
  );

  const enrichedSkills = $derived.by(() => {
    if (!overlayConfig || !registryClass) return [];
    return overlayConfig.skills.map(s => {
      const regSkill = registryClass.skills.find(rs => rs.id === s.skillId);
      return { ...s, name: regSkill?.name ?? `Skill ${s.skillId}`, icon: regSkill?.icon ?? '' };
    });
  });

  // Session pane bounds
  let bounds = $state<{ left: number; top: number; right: number; bottom: number } | null>(null);
  $effect(() => {
    mainWindowState.doCalculationUpdatesRng;
    if (!sessionId) return;
    const el = document.querySelector(`[data-session-id="${sessionId}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      bounds = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    } else {
      bounds = null;
    }
  });

  // Lock state (persisted in localStorage)
  let locked = $state(false);
  // Opacity comes from the saved config (set in Setup/Edit dialog)
  const opacity = $derived(overlayConfig?.opacity ?? 80);
  // Position read from FloatingWindow's stored state when switching to locked mode
  const FW_STORAGE_KEY = `floating-window-${PERSIST_ID}`;
  let lockedX = $state(100);
  let lockedY = $state(100);

  onMount(() => {
    locked = localStorage.getItem(LOCK_KEY) === 'true';
    readLockedPos();

    const lockHandler = (e: Event) => {
      const { overlayId: evtId, locked: newLocked } = (e as CustomEvent<{ overlayId: string; locked: boolean }>).detail;
      if (evtId !== overlayId) return;
      if (newLocked) readLockedPos(); // capture current FW position before locking
      locked = newLocked;
      localStorage.setItem(LOCK_KEY, String(newLocked));
    };
    document.addEventListener('neuz:overlay-lock', lockHandler);
    return () => document.removeEventListener('neuz:overlay-lock', lockHandler);
  });
  function readLockedPos() {
    try {
      const stored = localStorage.getItem(FW_STORAGE_KEY);
      if (stored) {
        const s = JSON.parse(stored);
        lockedX = s.x ?? 100;
        lockedY = s.y ?? 100;
      }
    } catch {}
  }

  // Setup dialog
  let setupOpen = $state(!(mainWindowState.config.cooldownOverlays?.find(c => c.id === overlayId)));

  function saveConfig(config: CooldownOverlayConfig, lock = false) {
    const overlays = mainWindowState.config.cooldownOverlays ?? [];
    const idx = overlays.findIndex(c => c.id === config.id);
    if (idx >= 0) { overlays[idx] = config; } else { overlays.push(config); }
    mainWindowState.config.cooldownOverlays = overlays;
    electronApi.invoke('config.save', JSON.stringify(mainWindowState.config));
    setupOpen = false;
    if (lock) {
      readLockedPos();
      locked = true;
      localStorage.setItem(LOCK_KEY, 'true');
    }
  }

  // ── Listen for keydown events forwarded from the webview via preload ──────
  // NeuzClient dispatches 'neuz:keydown' on document when the game webview's
  // preload script detects a key press.
  onMount(() => {
    const handler = (e: Event) => {
      const { sessionId: evtSession, key } = (e as CustomEvent<{ sessionId: string; key: string }>).detail;
      if (evtSession !== sessionId) return;
      const skill = enrichedSkills.find(
        s => s.ingameKey && s.ingameKey.toLowerCase() === key.toLowerCase()
      );
      if (skill) triggerCooldownOnly(skill);
    };
    document.addEventListener('neuz:keydown', handler);
    return () => document.removeEventListener('neuz:keydown', handler);
  });

  function triggerSkill(skill: typeof enrichedSkills[number]) {
    if (!sessionId) return;
    const skillKey = String(skill.skillId);
    if (!cooldownsContext.canUseAction(sessionId, skillKey)) return;

    const sessionLayouts = mainWindowState.sessionsLayoutsRef[sessionId]?.layouts;
    if (sessionLayouts) {
      Object.keys(sessionLayouts).forEach(layoutId => {
        const nc = sessionLayouts[layoutId] as any;
        if (nc?.sendKey && skill.ingameKey) nc.sendKey(skill.ingameKey);
      });
    }
    startCooldownForSkill(skill);
  }

  // Called when we detect the key was pressed externally (no need to re-send key)
  function triggerCooldownOnly(skill: typeof enrichedSkills[number]) {
    if (!sessionId) return;
    const skillKey = String(skill.skillId);
    if (!cooldownsContext.canUseAction(sessionId, skillKey)) return;
    startCooldownForSkill(skill);
  }

  function startCooldownForSkill(skill: typeof enrichedSkills[number]) {
    const skillKey = String(skill.skillId);
    if (skill.castTime > 0) {
      cooldownsContext.startCast(sessionId, skillKey, skill.castTime);
      setTimeout(() => {
        if (skill.cooldown > 0) cooldownsContext.startCooldown(sessionId, skillKey, skill.cooldown);
      }, skill.castTime * 1000);
    } else if (skill.cooldown > 0) {
      cooldownsContext.startCooldown(sessionId, skillKey, skill.cooldown);
    }
  }

  const orientationClass = $derived.by(() => {
    const o = overlayConfig?.orientation ?? 'horizontal';
    if (o === 'horizontal') return 'flex flex-row flex-wrap gap-1.5';
    if (o === 'vertical') return 'flex flex-col gap-1.5';
    const cols = overlayConfig?.gridCols ?? 4;
    return `grid gap-1.5 grid-cols-${cols}`;
  });
</script>

{#snippet titleBar()}
  <div class="flex items-center gap-2 flex-1 min-w-0">
    <Timer class="h-3.5 w-3.5 shrink-0" />
    <span class="truncate text-xs">Cooldowns — {sessionLabel}</span>
  </div>
{/snippet}

<div style="display: {visible ? 'block' : 'none'};">
  {#if locked}
    <!-- Locked / click-through mode: no chrome, no background, configurable opacity.
         pointer-events:none on the wrapper makes the entire overlay click-through.
         The unlock button explicitly restores pointer-events so it stays interactive. -->
    <div
      class="absolute z-40 flex flex-col gap-1"
      style="left: {lockedX}px; top: {lockedY}px; opacity: {opacity / 100}; pointer-events: none;"
    >
      <!-- Skills: fully click-through, no interactive elements in locked mode -->
      <div class={orientationClass}>
        {#each enrichedSkills as skill (skill.skillId)}
          <SkillButton
            {sessionId}
            skillId={String(skill.skillId)}
            icon={skill.icon}
            name={skill.name}
            ingameKey={skill.ingameKey}
            castTime={skill.castTime}
            cooldown={skill.cooldown}
            onTrigger={() => {}}
          />
        {/each}
      </div>
    </div>
  {:else}
    <FloatingWindow
      persistId={PERSIST_ID}
      title="Cooldowns — {sessionLabel}"
      defaultWidth={220}
      defaultHeight={100}
      minWidth={80}
      minHeight={60}
      maxHeight={600}
      {bounds}
      {onClose}
      {onHide}
      resizable={true}
      titleSnippet={titleBar}
    >
      <div class="p-1.5">
        {#if !overlayConfig}
          <div class="flex flex-col items-center justify-center gap-2 py-4 text-center">
            <Timer class="h-8 w-8 text-muted-foreground opacity-50" />
            <p class="text-xs text-muted-foreground">No config — click Setup</p>
            <button
              class="text-xs px-3 py-1.5 rounded border border-border hover:bg-accent transition-colors"
              onclick={() => { setupOpen = true; }}
            >Setup</button>
          </div>
        {:else if enrichedSkills.length === 0}
          <p class="text-xs text-muted-foreground py-4 text-center">No skills configured</p>
        {:else}
          <div class={orientationClass}>
            {#each enrichedSkills as skill (skill.skillId)}
              <SkillButton
                {sessionId}
                skillId={String(skill.skillId)}
                icon={skill.icon}
                name={skill.name}
                ingameKey={skill.ingameKey}
                castTime={skill.castTime}
                cooldown={skill.cooldown}
                onTrigger={() => triggerSkill(skill)}
              />
            {/each}
          </div>
        {/if}
      </div>
    </FloatingWindow>
  {/if}
</div>

<SetupDialog bind:open={setupOpen} {overlayId} existingConfig={overlayConfig} onSave={saveConfig} onCancel={() => { if (!overlayConfig) onClose?.(); }} />
