<script lang="ts">
  import * as Popover from '$lib/components/ui/popover';
  import * as Command from '$lib/components/ui/command';
  import { Search } from '@lucide/svelte';
  import { actionIcons } from '$lib/data/actionIcons';
  import type { NeuzIcon } from '$lib/types';

  type IconEntry = {
    slug: string;
    label: string;
    keywords: string[];
  };

  type IconGroup = {
    heading: string;
    icons: IconEntry[];
  };

  type Props = {
    selected?: NeuzIcon | null;
    open?: boolean;
    onSelect?: (iconSlug: string, previousIconSlug: string | null, displayName: string, previousDisplayName: string | null) => void;
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
    triggerClass = 'w-10 h-10 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-muted/50 hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm',
    contentClass = 'w-[280px] p-0',
    itemClass = 'py-2',
    imageClass = 'size-6 mr-2',
    searchPlaceholder = 'Search Icons...',
    emptyText = 'No Icon found.'
  }: Props = $props();

  let searchValue = $state('');

  const skillGroups = [
    ['vagrant', 'Vagrant Skills'],
    ['acrobat', 'Acrobat Skills'],
    ['assist', 'Assist Skills'],
    ['mercenary', 'Mercenary Skills'],
    ['magician', 'Magician Skills'],
    ['ranger', 'Ranger Skills'],
    ['jester', 'Jester Skills'],
    ['ringmaster', 'Ringmaster Skills'],
    ['billposter', 'Billposter Skills'],
    ['blade', 'Blade Skills'],
    ['knight', 'Knight Skills'],
    ['elementor', 'Elementor Skills'],
    ['psykeeper', 'Psykeeper Skills'],
    ['crackshooter', 'Crackshooter Skills'],
    ['harlequin', 'Harlequin Skills'],
    ['seraph', 'Seraph Skills'],
    ['forcemaster', 'Forcemaster Skills'],
    ['slayer', 'Slayer Skills'],
    ['templar', 'Templar Skills'],
    ['arcanist', 'Arcanist Skills'],
    ['mentalist', 'Mentalist Skills']
  ] as const;

  const skillGroupLabels = new Map(skillGroups);

  const groupOrder = [
    ...skillGroups.map(([, heading]) => heading),
    'Party Skills',
    'Couple Skills',
    'Skills / Actions / Motions',
    'Items / Consumables'
  ];

  const displayNameOverrides: Record<string, string> = {
    'skill/action_slot': 'Action Slot',
    'skill/pt_global': 'Global Attack',
    'skill/pt_link': 'Link Attack',
    'skill/pt_giftbox': 'Gift Box',
    'skill/pt_luckydrop': 'Lucky Drop',
    'skill/couple_fieldouting': 'Field Outing',
    'skill/couple_partytogether': 'Party Together',
    'skill/couple_goldenluck': 'Golden Luck',
    'skill/couple_happyjump': 'Happy Jump',
    'skill/couple_swiftrecovery': 'Swift Recovery',
    'skill/couple_stroll': 'Madrigal Stroll',
    'skill/couple_staminaboost': 'Stamina Boost',
    'skill/couple_blessingsky': "Sky's Blessing",
    'motions/attack': 'Attack',
    'motions/cheer': 'Cheer',
    'motions/follow': 'Follow',
    'motions/petgrace': 'Petgrace',
    'motions/swap_skillpage': 'Swap Skillpage',
    'motions/swap_statpage': 'Swap Statpage',
    'items/nitro_boost': 'Nitro Boost',
    'items/eq_switch': 'EQ Switch',
    'items/food_sushi': 'Food',
    'items/pill_gold': 'Pill',
    'items/vital_fp': 'Vital FP',
    'items/refresher_mp': 'Refresher MP',
    'items/wings': 'Flying Mount'
  };

  function titleCase(value: string): string {
    return value
      .replace(/_/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((word) => word
        .split('-')
        .map((part) => {
          const lowerPart = part.toLowerCase();
          if (lowerPart === 'i') return 'I';
          if (lowerPart === 'ii') return 'II';
          if (lowerPart === 'iii') return 'III';
          return part ? `${part[0].toUpperCase()}${part.slice(1)}` : part;
        })
        .join('-'))
      .join(' ');
  }

  function normalizeSearch(value: string): string {
    return value
      .replace(/[-_/]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function getIconFileName(iconSlug: string): string {
    return iconSlug.includes('/') ? iconSlug.split('/').at(-1) ?? iconSlug : iconSlug;
  }

  function getIconGroup(iconSlug: string): string {
    const fileName = getIconFileName(iconSlug);
    const prefix = fileName.split('_')[0];

    if (iconSlug === 'skill/action_slot' || iconSlug.startsWith('motions/') || iconSlug === 'items/nitro_boost' || iconSlug === 'items/eq_switch') {
      return 'Skills / Actions / Motions';
    }

    if (iconSlug.startsWith('items/')) {
      return 'Items / Consumables';
    }

    if (prefix === 'pt') {
      return 'Party Skills';
    }

    if (prefix === 'couple') {
      return 'Couple Skills';
    }

    return skillGroupLabels.get(prefix) ?? 'Items / Consumables';
  }

  function getIconDisplayName(iconSlug: string): string {
    if (displayNameOverrides[iconSlug]) {
      return displayNameOverrides[iconSlug];
    }

    const fileName = getIconFileName(iconSlug);
    const prefix = fileName.split('_')[0];

    if (iconSlug.startsWith('skill/') && (skillGroupLabels.has(prefix) || prefix === 'pt' || prefix === 'couple')) {
      return titleCase(fileName.replace(`${prefix}_`, ''));
    }

    return titleCase(fileName);
  }

  const groupedIcons: IconGroup[] = groupOrder
    .map((heading) => ({
      heading,
      icons: actionIcons
        .filter((iconSlug) => getIconGroup(iconSlug) === heading)
        .map((iconSlug) => {
          const label = getIconDisplayName(iconSlug);
          return {
            slug: iconSlug,
            label,
            keywords: [
              label.toLowerCase(),
              iconSlug.replace(/_/g, ' ').replace(/\//g, ' ').toLowerCase()
            ]
          };
        })
    }))
    .filter((group) => group.icons.length > 0);

  const filteredGroupedIcons = $derived.by(() => {
    const search = normalizeSearch(searchValue);
    if (!search) {
      return groupedIcons;
    }

    return groupedIcons
      .map((group) => ({
        ...group,
        icons: group.icons.filter((icon) => {
          const searchableText = normalizeSearch([
            icon.label,
            icon.slug,
            group.heading,
            ...icon.keywords
          ].join(' '));

          return searchableText.includes(search);
        })
      }))
      .filter((group) => group.icons.length > 0);
  });

  function iconStyle(icon: NeuzIcon | null): string | undefined {
    if (!icon?.filter) return undefined;
    return Object.entries(icon.filter).map(([key, value]) => `${key}: ${value}`).join('; ');
  }

  function selectIcon(iconSlug: string) {
    const previousIconSlug = selected?.slug ?? null;
    const previousDisplayName = previousIconSlug ? getIconDisplayName(previousIconSlug) : null;
    selected = { slug: iconSlug };
    onSelect?.(iconSlug, previousIconSlug, getIconDisplayName(iconSlug), previousDisplayName);
    open = false;
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger class={triggerClass} title={selected?.slug ?? 'Select Icon'}>
    {#if selected?.slug}
      <img class="size-8" src={`icons/${selected.slug}.png`} alt={selected.slug} style={iconStyle(selected)} />
    {:else}
      <Search class="size-4" />
    {/if}
  </Popover.Trigger>
  <Popover.Content class={contentClass}>
    <Command.Root shouldFilter={false}>
      <Command.Input bind:value={searchValue} placeholder={searchPlaceholder} class="h-10" />
      <Command.List class="max-h-[320px]">
        {#if filteredGroupedIcons.length === 0}
          <div class="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
        {:else}
          {#each filteredGroupedIcons as group (group.heading)}
            <Command.Group heading={group.heading}>
            {#each group.icons as icon (icon.slug)}
              <Command.Item
                value={icon.slug}
                keywords={[...icon.keywords, group.heading.toLowerCase()]}
                class={itemClass}
                onSelect={() => selectIcon(icon.slug)}
              >
              <img class={imageClass} src={`icons/${icon.slug}.png`} alt={icon.label} />
              <span class="text-xs truncate">{icon.label}</span>
            </Command.Item>
          {/each}
          </Command.Group>
          {/each}
        {/if}
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
