<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import ViewerWebview from './ViewerWebview.svelte';
  import { NAVI_BESTIARY_BASE_URL, NAVI_BESTIARY_SHEETS } from '$lib/utils/viewerConstants';

  interface Props {
    onLoadingChange?: (value: boolean) => void;
  }

  let { onLoadingChange }: Props = $props();
  let activeGid = $state(NAVI_BESTIARY_SHEETS[0].gid);

  const activeSrc = $derived.by(() => `${NAVI_BESTIARY_BASE_URL}?gid=${activeGid}`);
</script>

<div class="flex h-full min-h-0 w-full flex-col bg-background">
  <div class="flex items-center gap-3 border-b border-border/60 px-2 py-2 text-xs" style="-webkit-app-region: no-drag;">
    <div class="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
      {#each NAVI_BESTIARY_SHEETS as sheet (sheet.gid)}
        <Button
          size="sm"
          variant={activeGid === sheet.gid ? 'secondary' : 'outline'}
          class="h-7 shrink-0 whitespace-nowrap px-3 text-xs"
          onclick={() => activeGid = sheet.gid}
        >
          {sheet.label}
        </Button>
      {/each}
    </div>
  </div>

  <div class="min-h-0 flex-1">
    <ViewerWebview src={activeSrc} onLoadingChange={onLoadingChange} />
  </div>
</div>
