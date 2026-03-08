<script lang="ts">
  import { flyffRegistry } from '$lib/core';
  import { getFlyffRegistryContext } from '$lib/contexts/flyffRegistryContext.svelte';

  interface Props {
    onDone: () => void;
  }

  let { onDone }: Props = $props();

  const registryContext = getFlyffRegistryContext();

  type Phase = 'idle' | 'building' | 'done' | 'error';
  let phase = $state<Phase>('idle');
  let errorMessage = $state('');

  // Progress state
  let progressPhase = $state('');
  let progressMessage = $state('Preparing…');
  let progressCurrent = $state(0);
  let progressTotal = $state(1);

  const progressPercent = $derived(
    progressTotal > 0 ? Math.round((progressCurrent / progressTotal) * 100) : 0
  );

  const phaseLabel = $derived(() => {
    switch (progressPhase) {
      case 'classes':     return 'Fetching classes';
      case 'skills':      return 'Fetching skills';
      case 'icons':       return 'Downloading skill icons';
      case 'class_icons': return 'Downloading class icons';
      case 'saving':      return 'Saving registry';
      case 'done':        return 'Complete';
      default:            return 'Loading';
    }
  });

  async function startBuild() {
    phase = 'building';

    const unsub = flyffRegistry.onProgress((progress) => {
      progressPhase = progress.phase;
      progressMessage = progress.message;
      progressCurrent = progress.current;
      progressTotal = progress.total;
    });

    const result = await flyffRegistry.build();
    unsub();

    if (result.success && result.registry) {
      registryContext.setRegistry(result.registry);
      phase = 'done';
      setTimeout(onDone, 800);
    } else {
      phase = 'error';
      errorMessage = result.error ?? 'Unknown error';
    }
  }
</script>

<!-- Full-screen backdrop modal -->
<div class="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm">
  <div class="bg-card border border-border rounded-xl shadow-2xl p-8 w-full max-w-md flex flex-col gap-6">
    <!-- Header -->
    <div class="flex flex-col gap-1 text-center">
      <h2 class="text-xl font-semibold text-foreground">Flyff Skill Registry</h2>
      <p class="text-sm text-muted-foreground">
        {#if phase === 'idle'}
          NeuzOS needs to download the Flyff Universe skill database to power the Cooldown Overlay widget.
          This happens once and takes about a minute.
        {:else if phase === 'building'}
          Fetching skill data from the Flyff Universe API…
        {:else if phase === 'done'}
          Registry built successfully!
        {:else if phase === 'error'}
          Something went wrong while building the registry.
        {/if}
      </p>
    </div>

    {#if phase === 'idle'}
      <div class="flex flex-col gap-3">
        <button
          class="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          onclick={startBuild}
        >
          Download Skill Registry
        </button>
        <button
          class="w-full py-2 px-4 rounded-lg border border-border hover:bg-accent text-sm text-muted-foreground transition-colors"
          onclick={onDone}
        >
          Skip for now
        </button>
      </div>

    {:else if phase === 'building'}
      <div class="flex flex-col gap-4">
        <!-- Phase label + percent -->
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground font-medium">{phaseLabel()}</span>
          <span class="tabular-nums text-foreground">{progressPercent}%</span>
        </div>

        <!-- Progress bar -->
        <div class="h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            class="h-full bg-primary rounded-full transition-all duration-300"
            style="width: {progressPercent}%"
          ></div>
        </div>

        <!-- Step counter + message -->
        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <span class="truncate max-w-[75%]">{progressMessage}</span>
          {#if progressTotal > 1}
            <span class="tabular-nums shrink-0 ml-2">{progressCurrent} / {progressTotal}</span>
          {/if}
        </div>
      </div>

    {:else if phase === 'done'}
      <div class="flex flex-col items-center gap-2 py-2">
        <div class="text-4xl">✓</div>
        <p class="text-sm text-muted-foreground">Cooldown Overlay is ready to use.</p>
      </div>

    {:else if phase === 'error'}
      <div class="flex flex-col gap-3">
        <div class="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
        <div class="flex gap-2">
          <button
            class="flex-1 py-2 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            onclick={startBuild}
          >
            Retry
          </button>
          <button
            class="flex-1 py-2 px-4 rounded-lg border border-border hover:bg-accent text-sm transition-colors"
            onclick={onDone}
          >
            Skip
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
