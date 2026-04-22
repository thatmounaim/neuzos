<script lang="ts">
  import * as Popover from '$lib/components/ui/popover';
  import * as Command from '$lib/components/ui/command';
  import { Search } from '@lucide/svelte';
  import { actionIcons } from '$lib/data/actionIcons';
  import type { NeuzIcon } from '$lib/types';

  type Props = {
    selected?: NeuzIcon | null;
    open?: boolean;
    onSelect?: (iconSlug: string, previousIconSlug: string | null) => void;
    triggerClass?: string;
    contentClass?: string;
    itemClass?: string;
    imageClass?: string;
    searchPlaceholder?: string;
    emptyText?: string;
  };

  let {
    selected = $bindable(null),
    open = $bindable(false),
    onSelect,
    triggerClass = 'w-10 h-10 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm',
    contentClass = 'w-[280px] p-0',
    itemClass = 'py-2',
    imageClass = 'size-6 mr-2',
    searchPlaceholder = 'Search icons...',
    emptyText = 'No icon found.'
  }: Props = $props();

  function iconLabel(iconSlug: string): string {
    return iconSlug.includes('/') ? iconSlug.split('/').at(-1) ?? iconSlug : iconSlug;
  }

  function iconStyle(icon: NeuzIcon | null): string | undefined {
    if (!icon?.filter) return undefined;
    return Object.entries(icon.filter).map(([key, value]) => `${key}: ${value}`).join('; ');
  }

  function selectIcon(iconSlug: string) {
    const previousIconSlug = selected?.slug ?? null;
    selected = { slug: iconSlug };
    onSelect?.(iconSlug, previousIconSlug);
    open = false;
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger class={triggerClass} title={selected?.slug ?? 'Select icon'}>
    {#if selected?.slug}
      <img class="size-8" src={`icons/${selected.slug}.png`} alt={selected.slug} style={iconStyle(selected)} />
    {:else}
      <Search class="size-4" />
    {/if}
  </Popover.Trigger>
  <Popover.Content class={contentClass}>
    <Command.Root shouldFilter={true}>
      <Command.Input placeholder={searchPlaceholder} class="h-10" />
      <Command.Empty>{emptyText}</Command.Empty>
      <Command.List class="max-h-[320px]">
        <Command.Group>
          {#each actionIcons as iconSlug}
            <Command.Item
              value={iconSlug}
              keywords={[iconSlug.replace(/_/g, ' ').replace(/\//g, ' ').toLowerCase()]}
              class={itemClass}
              onSelect={() => selectIcon(iconSlug)}
            >
              <img class={imageClass} src={`icons/${iconSlug}.png`} alt={iconSlug} />
              <span class="text-xs truncate">{iconLabel(iconSlug)}</span>
            </Command.Item>
          {/each}
        </Command.Group>
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>