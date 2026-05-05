<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { getContext } from 'svelte';
  import { X, Search, Plus, Minus, Settings2, Trash2, Pencil, Check, ChevronDown, ChevronRight, PanelLeft, PanelRight } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Popover from '$lib/components/ui/popover';
  import * as Command from '$lib/components/ui/command';
  import * as ContextMenu from '$lib/components/ui/context-menu';
  import { getQuestPanelContext, RECOMMENDATION_CATEGORIES, type FlyffClassName } from '$lib/contexts/questPanelContext.svelte';
  import { quests as allQuests, type Quest } from '$lib/data/quests';
  import { isQuestInFWCFilter, getRecommendationTextColor } from '$lib/data/questFilters';
  import type { MainWindowState, NeuzIcon } from '$lib/types';
  import QuestlineGroup from './QuestlineGroup.svelte';
  import TodoChecklist from './TodoChecklist.svelte';

  const questPanel = getQuestPanelContext();
  const mainWindowState = getContext<MainWindowState>('mainWindowState');

  let searchFilter = $state('');
  let collapsed = $state(false);
  let showSettings = $state(false);
  let createCharacterModalOpen = $state(false);
  let selectedSessionId = $state<string | null>(null);
  let sessionComboOpen = $state(false);
  let classComboOpen = $state(false);
  let newCharName = $state('');
  let newCharClass = $state<FlyffClassName | null>(null);
  let newCharIcon = $state<NeuzIcon | null>(null);
  let editingCharId = $state<string | null>(null);
  let editCharName = $state('');

  const FLYFF_CLASSES: { name: FlyffClassName; icon: string }[] = [
    { name: 'Mercenary', icon: 'jobs/mercenary' },
    { name: 'Assist', icon: 'jobs/assist' },
    { name: 'Magician', icon: 'jobs/magician' },
    { name: 'Acrobat', icon: 'jobs/acrobat' },
  ];

  function getClassIcon(className: FlyffClassName | null): string | null {
    if (!className) return null;
    const found = FLYFF_CLASSES.find(c => c.name === className);
    return found ? `icons/${found.icon}.png` : null;
  }

  function clearNewCharacterForm() {
    selectedSessionId = null;
    sessionComboOpen = false;
    classComboOpen = false;
    newCharName = '';
    newCharClass = null;
    newCharIcon = null;
  }

  function beginNewCharacter() {
    clearNewCharacterForm();
    createCharacterModalOpen = true;
  }

  function cancelNewCharacter() {
    clearNewCharacterForm();
    createCharacterModalOpen = false;
  }

  function selectSession(sessionId: string) {
    const session = mainWindowState.sessions.find((entry) => entry.id === sessionId);
    if (!session) return;

    selectedSessionId = session.id;
    newCharName = session.label;
    newCharIcon = session.icon ?? null;
    sessionComboOpen = false;
  }

  function matchesRecommendation(rec: string): boolean {
    const r = rec.toLowerCase();
    const filters = questPanel.recommendationFilters;
    const cat = RECOMMENDATION_CATEGORIES.find(c => r.includes(c.toLowerCase()));
    return cat ? (filters[cat] ?? true) : true;
  }

  const filteredQuestlines = $derived.by(() => {
    const level = questPanel.level;
    const fwcEnabled = questPanel.fwcFilterEnabled;
    let questsToShow: Quest[];

    if (level) {
      if (questPanel.levelAppropriateOnly) {
        questsToShow = allQuests.filter(q => q.level >= level - 5 && q.level <= level + 5);
      } else {
        questsToShow = allQuests.filter(q => q.level <= level);
      }
    } else {
      questsToShow = [...allQuests];
    }

    if (fwcEnabled) {
      questsToShow = questsToShow.filter(isQuestInFWCFilter);
    }

    questsToShow = questsToShow.filter(q => matchesRecommendation(q.recommendation));

    if (searchFilter.trim()) {
      const search = searchFilter.toLowerCase();
      questsToShow = questsToShow.filter(q =>
        q.name.toLowerCase().includes(search) ||
        q.questline.toLowerCase().includes(search) ||
        q.monstersToHunt.toLowerCase().includes(search)
      );
    }

    const map = new Map<string, Quest[]>();
    for (const q of questsToShow) {
      if (!map.has(q.questline)) map.set(q.questline, []);
      map.get(q.questline)!.push(q);
    }
    return map;
  });

  function switchCharacter(id: string) {
    questPanel.setActiveCharacter(id);
  }

  function submitNewCharacter() {
    const name = newCharName.trim();
    if (!name || !newCharClass) return;
    questPanel.addCharacter(name, newCharClass, newCharIcon);
    cancelNewCharacter();
  }

  function submitRename() {
    if (editingCharId && editCharName.trim()) {
      questPanel.renameCharacter(editingCharId, editCharName.trim());
      editingCharId = null;
      editCharName = '';
    }
  }

  function startRename(id: string, currentName: string) {
    editingCharId = id;
    editCharName = currentName;
  }
</script>

<div
  class="flex flex-col h-full w-80 border-border/60 bg-background absolute top-0 bottom-0 z-40 shadow-lg {questPanel.sidebarSide === 'right' ? 'left-0 right-auto border-r border-l-0' : 'right-0 left-auto border-l border-r-0'}"
  transition:fly={{ x: questPanel.sidebarSide === 'right' ? -320 : 320, duration: 250, easing: cubicOut }}
>
  <!-- TODO Checklist (character-specific) -->
  <TodoChecklist />

  <!-- Character Tabs (always visible) -->
  <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border overflow-x-auto">
    {#each questPanel.characters as char (char.id)}
      {#if editingCharId === char.id}
        <div class="flex items-center gap-0.5 shrink-0">
          <Input
            type="text"
            class="h-6 w-20 text-xs"
            bind:value={editCharName}
            onkeydown={(e) => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') { editingCharId = null; } }}
          />
          <Button size="icon" variant="ghost" class="size-5" onclick={submitRename}>
            <Check class="size-3" />
          </Button>
        </div>
      {:else}
        <ContextMenu.Root>
          <ContextMenu.Trigger class="shrink-0">
            <Button
              size="xs"
              variant={questPanel.activeCharacterId === char.id ? 'secondary' : 'ghost'}
              class="text-xs px-2 gap-1"
              onclick={() => switchCharacter(char.id)}
            >
              {#if char.icon?.slug}
                <img src="icons/{char.icon.slug}.png" alt={char.icon.slug} class="size-3.5" />
              {:else if char.flyffClass}
                {@const icon = getClassIcon(char.flyffClass)}
                {#if icon}
                  <img src={icon} alt={char.flyffClass} class="size-3.5" />
                {/if}
              {/if}
              {char.name}
            </Button>
          </ContextMenu.Trigger>
          <ContextMenu.Content class="w-32">
            <ContextMenu.Item onclick={() => startRename(char.id, char.name)}>
              <Pencil class="size-3 mr-2" />
              Rename
            </ContextMenu.Item>
            <ContextMenu.Item class="text-destructive" onclick={() => { questPanel.removeCharacter(char.id); }}>
              <Trash2 class="size-3 mr-2" />
              Delete
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
      {/if}
    {/each}

    <Dialog.Root bind:open={createCharacterModalOpen}>
      <Dialog.Trigger>
        <Button size="icon" variant="ghost" class="size-5 shrink-0" onclick={beginNewCharacter}>
          <Plus class="size-3" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
          <Dialog.Title>Add Character</Dialog.Title>
          <Dialog.Description>Create a quest log character from a session or manually.</Dialog.Description>
        </Dialog.Header>

        <div class="space-y-3 py-1">
          <div class="space-y-1.5">
            <span class="text-xs text-muted-foreground">Session (optional)</span>
            {#if mainWindowState.sessions.length > 0}
              <div class="flex items-center gap-1">
                <Popover.Root bind:open={sessionComboOpen}>
                  <Popover.Trigger class="h-8 w-full px-2 inline-flex items-center justify-between gap-1 rounded border border-input bg-background text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                    <span class="truncate">
                      {#if selectedSessionId}
                        {@const selectedSession = mainWindowState.sessions.find((session) => session.id === selectedSessionId)}
                        {selectedSession?.label ?? 'Select session'}
                      {:else}
                        Select session
                      {/if}
                    </span>
                    <ChevronDown class="size-3 shrink-0 opacity-60" />
                  </Popover.Trigger>
                  <Popover.Content class="w-64 p-0">
                    <Command.Root shouldFilter={true}>
                      <Command.Input placeholder="Search sessions..." class="h-10" />
                      <Command.Empty>No sessions found.</Command.Empty>
                      <Command.List class="max-h-56">
                        <Command.Group>
                          {#each mainWindowState.sessions as session (session.id)}
                            <Command.Item
                              value={session.label}
                              keywords={[session.label.toLowerCase()]}
                              class="py-2.5"
                              onSelect={() => selectSession(session.id)}
                            >
                              {#if session.icon?.slug}
                                <img class="size-5 mr-2" src="icons/{session.icon.slug}.png" alt={session.label} />
                              {/if}
                              <span class="text-xs truncate">{session.label}</span>
                            </Command.Item>
                          {/each}
                        </Command.Group>
                      </Command.List>
                    </Command.Root>
                  </Popover.Content>
                </Popover.Root>
                {#if selectedSessionId}
                  <Button size="icon" variant="ghost" class="size-7 shrink-0" onclick={() => { selectedSessionId = null; newCharName = ''; newCharIcon = null; }} title="Clear session">
                    <X class="size-3" />
                  </Button>
                {/if}
              </div>
            {:else}
              <div class="h-8 flex items-center rounded border border-dashed border-border px-2 text-xs text-muted-foreground">
                No sessions configured
              </div>
            {/if}
          </div>

          <div class="space-y-1.5">
            <span class="text-xs text-muted-foreground">Character name</span>
            <Input
              type="text"
              placeholder="Name"
              class="h-8 text-xs"
              bind:value={newCharName}
              onkeydown={(e) => { if (e.key === 'Enter') submitNewCharacter(); if (e.key === 'Escape') { cancelNewCharacter(); } }}
            />
          </div>

          <div class="space-y-1.5">
            <span class="text-xs text-muted-foreground">Class</span>
            <Popover.Root bind:open={classComboOpen}>
              <Popover.Trigger class={`h-8 w-full px-2 inline-flex items-center justify-between gap-1 rounded border border-input bg-background text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground ${!newCharClass ? 'text-muted-foreground' : 'text-foreground'}`}>
                {#if newCharClass}
                  {@const clsInfo = FLYFF_CLASSES.find(c => c.name === newCharClass)}
                  {#if clsInfo}
                    <img src="icons/{clsInfo.icon}.png" alt={newCharClass} class="size-3.5 shrink-0" />
                  {/if}
                  <span class="truncate">{newCharClass}</span>
                {:else}
                  <span class="truncate">Select class</span>
                {/if}
                <ChevronDown class="size-3 shrink-0 opacity-60 ml-auto" />
              </Popover.Trigger>
              <Popover.Content class="w-44 p-0">
                <Command.Root>
                  <Command.List>
                    <Command.Group>
                      {#each FLYFF_CLASSES as cls (cls.name)}
                        <Command.Item
                          value={cls.name}
                          class="py-2 cursor-pointer"
                          onSelect={() => { newCharClass = cls.name; classComboOpen = false; }}
                        >
                          <img src="icons/{cls.icon}.png" alt={cls.name} class="size-5 mr-2 shrink-0" />
                          <span class="text-xs">{cls.name}</span>
                        </Command.Item>
                      {/each}
                    </Command.Group>
                  </Command.List>
                </Command.Root>
              </Popover.Content>
            </Popover.Root>
          </div>
        </div>

        <Dialog.Footer class="gap-2">
          <Button variant="outline" size="sm" onclick={cancelNewCharacter}>Cancel</Button>
          <Button size="sm" onclick={submitNewCharacter} disabled={!newCharName.trim() || !newCharClass}>
            <Check class="size-3 mr-1" />
            Create Character
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </div>

  <!-- Header -->
  <div class="flex items-center justify-between px-3 py-2 border-b border-border">
    <button class="flex items-center gap-1 cursor-pointer" onclick={() => collapsed = !collapsed}>
      {#if collapsed}
        <ChevronRight class="size-3.5 text-muted-foreground" />
      {:else}
        <ChevronDown class="size-3.5 text-muted-foreground" />
      {/if}
      <span class="text-sm font-semibold">Quest Log</span>
    </button>
    <div class="flex items-center gap-1">
      <Button
        size="icon"
        variant="ghost"
        class="size-6"
        onclick={() => questPanel.setSidebarSide(questPanel.sidebarSide === 'left' ? 'right' : 'left')}
        title={questPanel.sidebarSide === 'left' ? 'Move sidebar to right' : 'Move sidebar to left'}
      >
        {#if questPanel.sidebarSide === 'left'}
          <PanelRight class="size-3.5" />
        {:else}
          <PanelLeft class="size-3.5" />
        {/if}
      </Button>
      <Button size="icon" variant={showSettings ? 'secondary' : 'ghost'} class="size-6" onclick={() => showSettings = !showSettings}>
        <Settings2 class="size-3.5" />
      </Button>
      <Button size="icon" variant="ghost" class="size-6" onclick={() => questPanel.close()}>
        <X class="size-3.5" />
      </Button>
    </div>
  </div>

  {#if !collapsed}
  <!-- Settings Panel -->
  {#if showSettings}
    <div class="px-3 py-2 border-b border-border space-y-2">
      <span class="text-xs font-medium text-muted-foreground">Show recommendations:</span>
      <div class="grid grid-cols-2 gap-1.5">
        {#each RECOMMENDATION_CATEGORIES as cat (cat)}
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={questPanel.recommendationFilters[cat] ?? false}
              onchange={(e) => questPanel.setRecommendationFilter(cat, (e.target as HTMLInputElement).checked)}
              class="rounded border-border"
            />
            <span class="text-xs {getRecommendationTextColor(cat)}">{cat}</span>
          </label>
        {/each}
      </div>
      <label class="flex items-center gap-2 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={questPanel.fwcFilterEnabled}
          onchange={(e) => questPanel.setFwcFilterEnabled((e.target as HTMLInputElement).checked)}
          class="rounded border-border"
        />
        <span class="text-xs text-amber-400">FWC Quest Filter</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={questPanel.levelAppropriateOnly}
          onchange={(e) => questPanel.setLevelAppropriateOnly((e.target as HTMLInputElement).checked)}
          class="rounded border-border"
        />
        <span class="text-xs text-muted-foreground">Level-appropriate only (&#177;5)</span>
      </label>
    </div>
  {/if}

  <!-- Level & Search Controls -->
  <div class="px-3 py-2 border-b border-border space-y-2">
    <div class="flex items-center gap-2">
      <span class="text-xs text-muted-foreground whitespace-nowrap">Lv.</span>
      <Button size="icon" variant="outline" class="size-6" onclick={() => questPanel.adjustLevel(-1)}>
        <Minus class="size-3" />
      </Button>
      <Input
        type="number"
        min="1"
        max="300"
        class="h-6 w-14 text-xs text-center font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        value={questPanel.level ?? ''}
        placeholder="--"
        onchange={(e) => {
          const val = parseInt((e.target as HTMLInputElement).value, 10);
          if (!isNaN(val)) questPanel.setLevel(val);
        }}
      />
      <Button size="icon" variant="outline" class="size-6" onclick={() => questPanel.adjustLevel(1)}>
        <Plus class="size-3" />
      </Button>
    </div>
    <div class="relative">
      <Search class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search quests..."
        class="h-7 text-xs pl-7"
        bind:value={searchFilter}
      />
    </div>
  </div>

  <!-- Quest List -->
  <div class="flex-1 overflow-y-auto">
    {#if !questPanel.activeCharacterId}
      <div class="flex items-center justify-center h-32 text-sm text-muted-foreground">
        Add a character to get started
      </div>
    {:else if filteredQuestlines.size === 0}
      <div class="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No quests match filters
      </div>
    {:else}
      {#each [...filteredQuestlines.entries()] as [questline, questsInLine] (questline)}
        <QuestlineGroup
          questline={questline}
          quests={questsInLine}
        />
      {/each}
    {/if}
  </div>

  {/if}
</div>
