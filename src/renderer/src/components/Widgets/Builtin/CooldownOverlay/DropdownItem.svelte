<script lang="ts">
  import { getWidgetsContext } from '$lib/contexts/widgetsContext.svelte';
  import { getContext } from 'svelte';
  import { getElectronContext } from '$lib/contexts/electronContext';
  import { Button } from '$lib/components/ui/button';
  import { Timer, Eye, EyeOff, X, Lock, Unlock } from '@lucide/svelte';
  import { getFlyffRegistryContext } from '$lib/contexts/flyffRegistryContext.svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import type { MainWindowState } from '$lib/types';

  const widgetsContext = getWidgetsContext();
  const mainWindowState = getContext<MainWindowState>('mainWindowState');
  const registryContext = getFlyffRegistryContext();
  const electronApi = getElectronContext();

  let lockTrigger = $state(0);

  const widgets = $derived(widgetsContext.getWidgetsByType('widget.builtin.cooldown_overlay'));

  function generateOverlayId(): string {
    return `cooldown_overlay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  function createWidget() {
    const overlayId = generateOverlayId();
    widgetsContext.createWidget('widget.builtin.cooldown_overlay', { overlayId });
  }

  function toggleWidget(id: string) {
    widgetsContext.toggleWidget(id);
  }

  function destroyWidget(widgetId: string) {
    const widget = widgetsContext.getWidget(widgetId);
    const overlayId = widget?.data?.overlayId;
    if (overlayId) {
      const overlays = mainWindowState.config.cooldownOverlays ?? [];
      const filtered = overlays.filter(c => c.id !== overlayId);
      if (filtered.length !== overlays.length) {
        mainWindowState.config.cooldownOverlays = filtered;
        electronApi.invoke('config.save', JSON.stringify(mainWindowState.config));
      }
    }
    widgetsContext.destroyWidget(widgetId);
  }

  function getOverlayLabel(widgetId: string): string {
    const widget = widgetsContext.getWidget(widgetId);
    const overlayId = widget?.data?.overlayId;
    const cfg = mainWindowState.config.cooldownOverlays?.find(c => c.id === overlayId);
    if (!cfg) return 'Unconfigured';
    const session = mainWindowState.config.sessions.find(s => s.id === cfg.sessionId);
    const cls = registryContext.registry?.classes.find(c => c.id === cfg.classId);
    return `${session?.label ?? 'Unknown'} · ${cls?.name ?? `Class ${cfg.classId}`}`;
  }

  function getLockState(widgetId: string): boolean {
    lockTrigger; // reactive dependency
    const widget = widgetsContext.getWidget(widgetId);
    const overlayId = widget?.data?.overlayId;
    if (!overlayId) return false;
    return localStorage.getItem(`widget.builtin.cooldown_overlay-${overlayId}-locked`) === 'true';
  }

  function toggleLock(widgetId: string) {
    const widget = widgetsContext.getWidget(widgetId);
    const overlayId = widget?.data?.overlayId;
    if (!overlayId) return;
    const newLocked = !getLockState(widgetId);
    localStorage.setItem(`widget.builtin.cooldown_overlay-${overlayId}-locked`, String(newLocked));
    document.dispatchEvent(new CustomEvent('neuz:overlay-lock', { detail: { overlayId, locked: newLocked } }));
    lockTrigger++;
  }
</script>

<DropdownMenu.Sub>
  <DropdownMenu.SubTrigger>
    <Timer class="h-4 w-4 mr-2" />
    <span>Cooldown Overlays</span>
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent class="min-w-48">
    <DropdownMenu.Item onclick={createWidget}>
      <Timer class="h-4 w-4 mr-2" />
      <span>New Cooldown Overlay…</span>
    </DropdownMenu.Item>

    {#if widgets.length > 0}
      <DropdownMenu.Separator />
      <DropdownMenu.Label class="text-xs">Active ({widgets.length})</DropdownMenu.Label>
      {#each widgets as widget}
        <div class="flex items-center justify-between px-2 py-1.5 text-sm gap-2">
          <span class="text-xs truncate flex-1">{getOverlayLabel(widget.id)}</span>
          <div class="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              class="h-6 w-6"
              onclick={() => toggleLock(widget.id)}
              title={getLockState(widget.id) ? 'Unlock overlay' : 'Lock overlay'}
            >
              {#if getLockState(widget.id)}
                <Lock class="h-3 w-3" />
              {:else}
                <Unlock class="h-3 w-3" />
              {/if}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              class="h-6 w-6"
              onclick={() => toggleWidget(widget.id)}
              title={widget.visible ? 'Hide' : 'Show'}
            >
              {#if widget.visible}
                <Eye class="h-3 w-3" />
              {:else}
                <EyeOff class="h-3 w-3" />
              {/if}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              class="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
              onclick={() => destroyWidget(widget.id)}
              title="Close"
            >
              <X class="h-3 w-3" />
            </Button>
          </div>
        </div>
      {/each}
    {/if}
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>

