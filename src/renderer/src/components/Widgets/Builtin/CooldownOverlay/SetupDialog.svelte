<script lang="ts">
  import { getContext } from 'svelte';
  import type { MainWindowState, CooldownOverlayConfig, CooldownOverlaySkill } from '$lib/types';
  import { getFlyffRegistryContext } from '$lib/contexts/flyffRegistryContext.svelte';
  import { classIconUrl } from '$lib/flyff/jobs';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';

  interface Props {
    open: boolean;
    existingConfig?: CooldownOverlayConfig | null;
    overlayId: string;
    onSave: (config: CooldownOverlayConfig, lock?: boolean) => void;
    onCancel: () => void;
  }

  let { open = $bindable(), existingConfig, overlayId, onSave, onCancel }: Props = $props();

  const mainWindowState = getContext<MainWindowState>('mainWindowState');
  const registryContext = getFlyffRegistryContext();

  const classes = $derived(registryContext.registry?.classes ?? []);
  const sessions = $derived(mainWindowState.config.sessions);

  // Form state
  let selectedSessionId = $state(existingConfig?.sessionId ?? '');
  let selectedClassId = $state<number | ''>(existingConfig?.classId ?? '');
  let orientation = $state<'horizontal' | 'vertical' | 'grid'>(existingConfig?.orientation ?? 'horizontal');
  let gridCols = $state(existingConfig?.gridCols ?? 4);
  let opacity = $state(existingConfig?.opacity ?? 80);

  type SkillDraft = {
    enabled: boolean;
    ingameKey: string;
    castTime: number;
    cooldown: number;
  };
  let skillDrafts = $state<Record<number, SkillDraft>>({});

  function buildDrafts(classId: number | '') {
    const cls = classes.find(c => c.id === classId) ?? null;
    if (!cls) { skillDrafts = {}; return; }
    const newDrafts: Record<number, SkillDraft> = {};
    for (const skill of cls.skills) {
      const existing = existingConfig?.skills.find(s => s.skillId === skill.id);
      newDrafts[skill.id] = {
        enabled: existing != null,
        ingameKey: existing?.ingameKey ?? '',
        castTime: existing?.castTime ?? skill.defaultCastTime,
        cooldown: existing?.cooldown ?? skill.defaultCooldown,
      };
    }
    skillDrafts = newDrafts;
  }

  // Re-sync form state whenever the dialog opens (handles the edit case where
  // form was initialized before existingConfig was available)
  $effect(() => {
    if (open && existingConfig && classes.length > 0) {
      selectedSessionId = existingConfig.sessionId;
      selectedClassId = existingConfig.classId;
      buildDrafts(existingConfig.classId);
    }
  });

  const selectedClass = $derived(classes.find(c => c.id === selectedClassId) ?? null);

  function buildConfig(): CooldownOverlayConfig | null {
    if (!selectedSessionId || selectedClassId === '' || !selectedClass) return null;
    const skills: CooldownOverlaySkill[] = selectedClass.skills
      .filter(skill => skillDrafts[skill.id]?.enabled)
      .map(skill => ({
        skillId: skill.id,
        ingameKey: skillDrafts[skill.id].ingameKey,
        castTime: skillDrafts[skill.id].castTime,
        cooldown: skillDrafts[skill.id].cooldown,
      }));
    if (skills.length === 0) return null;
    return {
      id: overlayId,
      sessionId: selectedSessionId,
      classId: selectedClassId as number,
      skills,
      orientation,
      gridCols: orientation === 'grid' ? gridCols : undefined,
      opacity,
    };
  }

  function handleSave() {
    const config = buildConfig();
    if (!config) return;
    onSave(config);
    open = false;
  }

  function handleSaveAndLock() {
    const config = buildConfig();
    if (!config) return;
    onSave(config, true);
    open = false;
  }

  function handleCancel() {
    open = false;
    onCancel();
  }

  const canSave = $derived(
    selectedSessionId !== '' &&
    selectedClassId !== '' &&
    selectedClass !== null &&
    selectedClass.skills.some(s => skillDrafts[s.id]?.enabled)
  );
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-lg max-h-[85vh] flex flex-col">
    <Dialog.Header>
      <Dialog.Title>Cooldown Overlay Setup</Dialog.Title>
      <Dialog.Description>Choose a session, job class, and which skills to track.</Dialog.Description>
    </Dialog.Header>

    {#if !registryContext.ready}
      <div class="py-8 text-center text-sm text-muted-foreground">
        Skill registry not loaded. Build it from the main menu first.
      </div>
    {:else}
      <div class="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
        <!-- Session picker -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium">Session</label>
          <select
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            bind:value={selectedSessionId}
          >
            <option value="" disabled>Select a session…</option>
            {#each sessions as session}
              <option value={session.id}>{session.label}</option>
            {/each}
          </select>
        </div>

        <!-- Class picker -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium">Job Class</label>
          <select
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedClassId}
            onchange={(e) => {
              const id = Number(e.currentTarget.value);
              selectedClassId = id;
              buildDrafts(id);
            }}
          >
            <option value="" disabled>Select a class…</option>
            {#each classes as cls}
              <option value={cls.id}>{cls.name}</option>
            {/each}
          </select>
        </div>

        <!-- Skills -->
        {#if selectedClass}
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium">Skills</label>
              <div class="flex gap-1">
                <button
                  class="text-xs px-2 py-0.5 rounded border border-border hover:bg-accent transition-colors"
                  onclick={() => { for (const id of Object.keys(skillDrafts)) skillDrafts[Number(id)].enabled = true; }}
                >All</button>
                <button
                  class="text-xs px-2 py-0.5 rounded border border-border hover:bg-accent transition-colors"
                  onclick={() => { for (const id of Object.keys(skillDrafts)) skillDrafts[Number(id)].enabled = false; }}
                >None</button>
              </div>
            </div>
            <div class="flex flex-col gap-2 border border-border rounded-md p-2 max-h-56 overflow-y-auto">
              {#each selectedClass.skills as skill}
                <div class="flex flex-col gap-1">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      class="rounded"
                      bind:checked={skillDrafts[skill.id].enabled}
                    />
                    <span class="text-sm font-medium flex-1 truncate">{skill.name}</span>
                    {#if skill.passive}
                      <span class="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">passive</span>
                    {/if}
                    <span class="text-xs text-muted-foreground shrink-0">
                      {skill.defaultCastTime > 0 ? `${skill.defaultCastTime}s cast · ` : ''}{skill.defaultCooldown}s cd
                    </span>
                  </label>
                  {#if skillDrafts[skill.id]?.enabled}
                    <div class="flex gap-2 pl-6">
                      <div class="flex flex-col gap-0.5 flex-1">
                        <label class="text-xs text-muted-foreground">In-game key</label>
                        <input
                          type="text"
                          class="rounded border border-input bg-background px-2 py-1 text-xs"
                          placeholder="e.g. F1, 1, Ctrl+A"
                          bind:value={skillDrafts[skill.id].ingameKey}
                        />
                      </div>
                      <div class="flex flex-col gap-0.5 w-16">
                        <label class="text-xs text-muted-foreground">Cast (s)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          class="rounded border border-input bg-background px-2 py-1 text-xs"
                          bind:value={skillDrafts[skill.id].castTime}
                        />
                      </div>
                      <div class="flex flex-col gap-0.5 w-16">
                        <label class="text-xs text-muted-foreground">CD (s)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          class="rounded border border-input bg-background px-2 py-1 text-xs"
                          bind:value={skillDrafts[skill.id].cooldown}
                        />
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Orientation -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium">Orientation</label>
          <div class="flex gap-2">
            {#each (['horizontal', 'vertical', 'grid'] as const) as opt}
              <button
                class="flex-1 py-1.5 text-sm rounded-md border transition-colors capitalize
                  {orientation === opt
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-accent'}"
                onclick={() => { orientation = opt; }}
              >
                {opt}
              </button>
            {/each}
          </div>
          {#if orientation === 'grid'}
            <div class="flex items-center gap-2 mt-1">
              <label class="text-sm">Columns:</label>
              <input
                type="number"
                min="2"
                max="8"
                class="w-16 rounded border border-input bg-background px-2 py-1 text-sm"
                bind:value={gridCols}
              />
            </div>
          {/if}
        </div>

        <!-- Locked overlay opacity -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium">Locked Overlay Opacity</label>
            <span class="text-sm font-medium">{opacity}%</span>
          </div>
          <input
            type="range" min="10" max="100" step="5"
            bind:value={opacity}
            class="w-full accent-primary"
          />
          <p class="text-xs text-muted-foreground">Controls how transparent the overlay appears when locked (click-through mode).</p>
        </div>
      </div>
    {/if}

    <Dialog.Footer class="mt-4">
      {#if selectedClass && !canSave}
        <span class="text-xs text-muted-foreground mr-auto">Check at least one skill to continue.</span>
      {/if}
      <Button variant="outline" onclick={handleCancel}>Cancel</Button>
      <Button variant="outline" onclick={handleSave} disabled={!canSave}>Save</Button>
      <Button onclick={handleSaveAndLock} disabled={!canSave}>Save & Lock</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
