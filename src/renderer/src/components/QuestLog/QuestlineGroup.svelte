<script lang="ts">
  import { ChevronDown, ChevronRight, EyeOff, Eye, ExternalLink, Check } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { type Quest, FIRST_JOB_QUEST_OVERRIDES } from '$lib/data/quests';
  import { getRecommendationBadgeColor } from '$lib/data/questFilters';
  import { getQuestPanelContext } from '$lib/contexts/questPanelContext.svelte';

  let { questline, quests }: {
    questline: string;
    quests: Quest[];
  } = $props();

  const questPanel = getQuestPanelContext();

  let showHidden = $state(false);
  let showCompleted = $state(false);
  // Track keys that are animating out after being completed
  let animatingOut = $state<string[]>([]);

  const isOffice = $derived(questline === 'Office');
  const collapsed = $derived(questPanel.isQuestlineCollapsed(questline));

  const visibleQuests = $derived.by(() => {
    let filtered = quests;

    // Filter out completed quests unless showing them
    if (!showCompleted) {
      filtered = filtered.filter(q => {
        const key = q.name + q.level;
        // Keep quests that are animating out (so animation plays)
        if (animatingOut.includes(key)) return true;
        return !questPanel.isQuestCompleted(key);
      });
    }

    // Filter hidden office quests
    if (!showHidden && isOffice) {
      filtered = filtered.filter(q => !questPanel.isQuestHidden(q.name + q.level));
    }

    return filtered;
  });

  const completedCount = $derived.by(() => {
    return quests.filter(q => questPanel.isQuestCompleted(q.name + q.level)).length;
  });

  const hiddenCount = $derived.by(() => {
    if (!isOffice) return 0;
    return quests.filter(q => questPanel.isQuestHidden(q.name + q.level)).length;
  });

  function handleComplete(questKey: string) {
    if (questPanel.isQuestCompleted(questKey)) {
      questPanel.uncompleteQuest(questKey);
    } else {
      // Add to animating out list, then complete after animation
      animatingOut = [...animatingOut, questKey];
      setTimeout(() => {
        questPanel.completeQuest(questKey);
        animatingOut = animatingOut.filter(k => k !== questKey);
      }, 300);
    }
  }

  const isFirstJobChange = $derived(questline === '1st job change');

  const OVERRIDE_KEY_MAP: Record<string, keyof typeof FIRST_JOB_QUEST_OVERRIDES[keyof typeof FIRST_JOB_QUEST_OVERRIDES]> = {
    'vagrant master': 'vagrantMaster',
    'arms': 'arms',
    'skills': 'skills',
    'duty': 'duty',
  };

  type ResolvedQuest = Quest & { _resolved: { monstersToHunt: string; itemsNeeded: string; notes: string } };

  const resolvedQuests = $derived.by((): ResolvedQuest[] => {
    const cls = questPanel.flyffClass;
    return visibleQuests.map(quest => {
      const base = { monstersToHunt: quest.monstersToHunt, itemsNeeded: quest.itemsNeeded, notes: quest.notes };
      if (!isFirstJobChange || !cls) return { ...quest, _resolved: base };
      const overrides = FIRST_JOB_QUEST_OVERRIDES[cls];
      if (!overrides) return { ...quest, _resolved: base };
      const key = OVERRIDE_KEY_MAP[quest.name.toLowerCase()];
      if (!key) return { ...quest, _resolved: base };
      return { ...quest, _resolved: { ...base, ...overrides[key] } };
    });
  });


</script>

<div class="border-b border-border/50 last:border-b-0">
  <button
    class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors cursor-pointer"
    onclick={() => questPanel.toggleQuestline(questline)}
  >
    {#if collapsed}
      <ChevronRight class="size-3.5 shrink-0 text-muted-foreground" />
    {:else}
      <ChevronDown class="size-3.5 shrink-0 text-muted-foreground" />
    {/if}
    <span class="text-sm font-medium flex-1 truncate">{questline}</span>
    <span class="text-xs text-muted-foreground">{quests.length}</span>
  </button>

  {#if !collapsed}
    <div class="pl-3 pr-1 pb-1">
      <div class="flex gap-2 px-2">
        {#if completedCount > 0}
          <button
            class="text-xs text-muted-foreground hover:text-foreground py-0.5 cursor-pointer"
            onclick={() => showCompleted = !showCompleted}
          >
            {showCompleted ? 'Hide' : 'Show'} {completedCount} completed
          </button>
        {/if}
        {#if isOffice && hiddenCount > 0}
          <button
            class="text-xs text-muted-foreground hover:text-foreground py-0.5 cursor-pointer"
            onclick={() => showHidden = !showHidden}
          >
            {showHidden ? 'Hide' : 'Show'} {hiddenCount} hidden
          </button>
        {/if}
      </div>

      {#each resolvedQuests as quest, i (quest.name + quest.level + '_' + i)}
        {@const questKey = quest.name + quest.level}
        {@const isCompleted = questPanel.isQuestCompleted(questKey)}
        {@const isAnimatingOut = animatingOut.includes(questKey)}
        {@const isHidden = isOffice && questPanel.isQuestHidden(questKey)}
        <div
          class="flex items-start gap-1.5 px-2 py-1.5 rounded-sm hover:bg-accent/30 group transition-all duration-300
            {isHidden ? 'opacity-40' : ''}
            {isAnimatingOut ? 'opacity-0 max-h-0 overflow-hidden py-0' : 'max-h-40'}
            {isCompleted && showCompleted ? 'opacity-50 line-through' : ''}"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-mono text-muted-foreground w-6 shrink-0">{quest.level}</span>
              <a
                href={quest.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs font-medium truncate hover:underline flex items-center gap-1"
                title={quest.name}
              >
                {quest.name}
                <ExternalLink class="size-2.5 opacity-0 group-hover:opacity-50 shrink-0" />
              </a>
            </div>
            <div class="flex items-center gap-1 mt-0.5 pl-7">
              <span class="text-[10px] border rounded px-1 {getRecommendationBadgeColor(quest.recommendation)}">
                {quest.recommendation}
              </span>
              {#if quest.experience && quest.experience !== '-'}
                <span class="text-[10px] text-muted-foreground">{quest.experience}</span>
              {/if}
            </div>
            {#if quest._resolved.monstersToHunt}
              <div class="text-[10px] text-muted-foreground mt-0.5 pl-7 truncate" title={quest._resolved.monstersToHunt}>
                {quest._resolved.monstersToHunt.replace(/\n/g, ', ')}
              </div>
            {/if}
            {#if quest._resolved.itemsNeeded}
              <div class="text-[10px] text-muted-foreground mt-0.5 pl-7 line-clamp-2" title={quest._resolved.itemsNeeded}>
                Items: {quest._resolved.itemsNeeded.replace(/\n/g, ', ')}
              </div>
            {/if}
            {#if isFirstJobChange && quest._resolved.notes}
              <div class="text-[10px] text-muted-foreground/70 mt-0.5 pl-7 truncate italic" title={quest._resolved.notes}>
                {quest._resolved.notes}
              </div>
            {/if}
          </div>

          <div class="flex items-center gap-0.5 shrink-0">
            {#if isOffice}
              <Button
                size="icon"
                variant="ghost"
                class="size-5 opacity-0 group-hover:opacity-100"
                onclick={() => {
                  if (questPanel.isQuestHidden(questKey)) {
                    questPanel.showQuest(questKey);
                  } else {
                    questPanel.hideQuest(questKey);
                  }
                }}
              >
                {#if isHidden}
                  <Eye class="size-3" />
                {:else}
                  <EyeOff class="size-3" />
                {/if}
              </Button>
            {/if}
            <button
              class="size-4 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors
                {isCompleted ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'border-border hover:border-muted-foreground'}"
              onclick={() => handleComplete(questKey)}
              title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
            >
              {#if isCompleted}
                <Check class="size-2.5" />
              {/if}
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
