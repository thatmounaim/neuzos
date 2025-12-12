<script lang="ts">
  import { getWidgetsContext } from '$lib/contexts/widgetsContext.svelte';
  import { Calculator, X } from '@lucide/svelte';

  const widgetsContext = getWidgetsContext();

  function createFCoinCalculator() {
    widgetsContext.createWidget('widget.builtin.fcoin_calculator');
  }

  function destroyAllFCoinCalculators() {
    const calculators = widgetsContext.getWidgetsByType('widget.builtin.fcoin_calculator');
    calculators.forEach(widget => widgetsContext.destroyWidget(widget.id));
  }

  function toggleFCoinCalculator(id: string) {
    widgetsContext.toggleWidget(id);
  }

  const fcoinCalculators = $derived(widgetsContext.getWidgetsByType('widget.builtin.fcoin_calculator'));
</script>

<div class="fixed bottom-4 right-4 z-50 space-y-2">
  <div class="bg-background border border-border rounded-lg shadow-lg p-4 space-y-3">
    <h3 class="text-sm font-semibold">Widget Controls</h3>

    <!-- Create new FCoin Calculator -->
    <button
      class="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm"
      onclick={createFCoinCalculator}
    >
      <Calculator size={16} />
      Create FCoin Calculator
    </button>

    <!-- List of active widgets -->
    {#if fcoinCalculators.length > 0}
      <div class="space-y-2 pt-2 border-t border-border">
        <p class="text-xs text-muted-foreground">Active Calculators ({fcoinCalculators.length})</p>
        {#each fcoinCalculators as widget}
          <div class="flex items-center justify-between gap-2 p-2 bg-muted rounded text-xs">
            <span class="font-mono truncate flex-1">
              {widget.id.split('_').pop()}
            </span>
            <div class="flex items-center gap-1">
              <button
                class="px-2 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                onclick={() => toggleFCoinCalculator(widget.id)}
                title={widget.visible ? 'Hide' : 'Show'}
              >
                {widget.visible ? 'Hide' : 'Show'}
              </button>
              <button
                class="px-2 py-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/80 transition-colors"
                onclick={() => widgetsContext.destroyWidget(widget.id)}
                title="Destroy"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        {/each}

        <button
          class="w-full px-3 py-1.5 bg-destructive text-destructive-foreground rounded text-xs hover:bg-destructive/90 transition-colors"
          onclick={destroyAllFCoinCalculators}
        >
          Destroy All
        </button>
      </div>
    {/if}
  </div>
</div>

