<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Loader2, Minus, Pin, PinOff, X } from '@lucide/svelte';

  interface Props {
    title: string;
    attribution?: string;
    alwaysOnTop: boolean;
    isLoading?: boolean;
    onToggleAlwaysOnTop: (alwaysOnTop: boolean) => void;
    onMinimize: () => void;
    onClose: () => void;
  }

  let {
    title,
    attribution,
    alwaysOnTop,
    isLoading = false,
    onToggleAlwaysOnTop,
    onMinimize,
    onClose,
  }: Props = $props();
</script>

<div class="flex h-11 items-center justify-between gap-3 border-b border-border/60 bg-background/95 px-3 text-sm shadow-sm" style="-webkit-app-region: drag;">
  <div class="flex min-w-0 items-center gap-2">
    <span class="truncate font-semibold text-foreground">{title}</span>
    {#if attribution}
      <span class="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground/80">{attribution}</span>
    {/if}
    {#if isLoading}
      <Loader2 class="size-3.5 animate-spin text-muted-foreground" />
    {:else}
      <span class="size-2 rounded-full {alwaysOnTop ? 'bg-primary' : 'bg-muted-foreground/50'}"></span>
    {/if}
  </div>

  <div class="flex items-center gap-1" style="-webkit-app-region: no-drag;">
    <Button
      size="icon"
      variant={alwaysOnTop ? 'secondary' : 'ghost'}
      class="size-7"
      title={alwaysOnTop ? 'Disable always-on-top' : 'Enable always-on-top'}
      onclick={() => onToggleAlwaysOnTop(!alwaysOnTop)}
    >
      {#if alwaysOnTop}
        <Pin class="size-3.5" />
      {:else}
        <PinOff class="size-3.5" />
      {/if}
    </Button>
    <Button size="icon" variant="ghost" class="size-7" title="Minimize" onclick={onMinimize}>
      <Minus class="size-3.5" />
    </Button>
    <Button size="icon" variant="ghost" class="size-7" title="Close" onclick={onClose}>
      <X class="size-3.5" />
    </Button>
  </div>
</div>
