<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import * as Popover from "$lib/components/ui/popover";
  import * as Command from "$lib/components/ui/command";
  import * as Collapsible from "$lib/components/ui/collapsible";

  import {getContext} from "svelte";
  import {Button} from "$lib/components/ui/button";
  import {Input} from "$lib/components/ui/input";

  import type {NeuzConfig, SessionActions} from "$lib/types";
  import {Plus, Trash2, ChevronsUpDown, Check, ChevronDown} from "@lucide/svelte";

  const modifierOptions = [
    { value: "", label: "None" },
    { value: "commandorcontrol", label: "Ctrl/Cmd" },
    { value: "alt", label: "Alt" },
    { value: "shift", label: "Shift" },
    { value: "commandorcontrol+alt", label: "Ctrl/Cmd+Alt" },
    { value: "commandorcontrol+shift", label: "Ctrl/Cmd+Shift" },
    { value: "alt+shift", label: "Alt+Shift" },
    { value: "commandorcontrol+alt+shift", label: "Ctrl/Cmd+Alt+Shift" },
    { value: "control", label: "Control" },
    { value: "command", label: "Command" },
    { value: "cmdorctrl", label: "CmdOrCtrl" },
    { value: "cmd", label: "Cmd" },
    { value: "super", label: "Super" },
    { value: "meta", label: "Meta" },
    { value: "option", label: "Option" },
    { value: "altgr", label: "AltGr" },
  ];

  const allowedKeys = [
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12",
    "plus", "space", "tab", "capslock", "numlock", "scrolllock", "backspace",
    "delete", "insert", "return", "enter", "up", "down", "left", "right",
    "home", "end", "pageup", "pagedown", "escape", "esc",
    "num0", "num1", "num2", "num3", "num4", "num5", "num6", "num7", "num8", "num9",
    "numdec", "numadd", "numsub", "nummult", "numdiv",
    "printscreen", "pause",
  ];

  const actionIcons: string[] = [
    "skill/absorption",
    "skill/acrbowaimeds",
    "skill/acrbowauto",
    "skill/acrbowjunkbo",
    "skill/acrbowrain",
    "skill/acrbowsilent",
    "skill/acrsupblock",
    "skill/acrsupbowmaster",
    "skill/acrsupfastwa",
    "skill/acrsupillusi",
    "skill/acrsupyoymaster",
    "skill/acryoycounte",
    "skill/acryoycross",
    "skill/acryoydeadly",
    "skill/acryoypullin",
    "skill/acryoyslowst",
    "skill/acryoysnitch",
    "skill/additional6thhitcriticalchance",
    "skill/additionaldamagefordisable",
    "skill/additionaldamageforweaken",
    "skill/advancedtrap",
    "skill/aetherrend",
    "skill/agility",
    "skill/alchemy",
    "skill/alterego",
    "skill/ambidextrous",
    "skill/angelskill",
    "skill/aquaveil",
    "skill/asscheaccura",
    "skill/asschebeefup",
    "skill/asschecannon",
    "skill/asschecatsre",
    "skill/asschecircle",
    "skill/asscheheapup",
    "skill/asschemental",
    "skill/asschemoonbeam",
    "skill/asschequicks",
    "skill/asschestoneh",
    "skill/asshaste",
    "skill/assheahealin",
    "skill/assheapatien",
    "skill/assheapreven",
    "skill/asshearesurr",
    "skill/assknuburstc",
    "skill/assknupowerf",
    "skill/assknutampin",
    "skill/aurabomb",
    "skill/barrage",
    "skill/battered",
    "skill/bilasalraalaikum",
    "skill/bilasmodeus",
    "skill/bilbaraqijalesna",
    "skill/bilbelialsmeshing",
    "skill/bilbloodfist",
    "skill/bilgvurtialbold",
    "skill/bilpiercingserpent",
    "skill/bilsonichand",
    "skill/blazeeater",
    "skill/blddaxhawatt",
    "skill/blddaxspring",
    "skill/blddblarmpen",
    "skill/blddblcross",
    "skill/blddblsonbld",
    "skill/blddswblddan",
    "skill/blddswsilent",
    "skill/bldrendingentry",
    "skill/bldsilence",
    "skill/bldsupberser",
    "skill/bldwicked",
    "skill/blessingofthewise",
    "skill/bloodaccumulation",
    "skill/bloodaegis",
    "skill/bloodarmor",
    "skill/bloodyrush",
    "skill/bloodythorn",
    "skill/breathoflife",
    "skill/bubbleiron",
    "skill/bubblesblessing",
    "skill/burn",
    "skill/carpentry",
    "skill/celestialbarrier",
    "skill/chimerascurse",
    "skill/cimetieresscream",
    "skill/clearreflection",
    "skill/concentration",
    "skill/condordive",
    "skill/cooking",
    "skill/coupleblessingsky",
    "skill/couplecheer",
    "skill/couplefieldouting",
    "skill/couplegoldenluck",
    "skill/couplehappyjump",
    "skill/couplepartytogether",
    "skill/couplestaminaboost",
    "skill/couplestroll",
    "skill/coupleswiftrecovery",
    "skill/crabskill",
    "skill/criticaljstyoyomaster",
    "skill/criticalstab",
    "skill/crossofblood",
    "skill/damnationsurge",
    "skill/debuffdamagereduction",
    "skill/demonlordcurse",
    "skill/devastatingsting",
    "skill/divineaffliction",
    "skill/doublevision",
    "skill/dragonskill",
    "skill/earthcounter",
    "skill/electriccounter",
    "skill/eleearearmst",
    "skill/eleearearsqk",
    "skill/eleearstnspr",
    "skill/eleeleelemst",
    "skill/eleeleeleshk",
    "skill/eleelethunst",
    "skill/elefirbunfil",
    "skill/elefirfirbrd",
    "skill/elefirfirmst",
    "skill/elemulavalan",
    "skill/elemullgtstm",
    "skill/elemulmeteos",
    "skill/elemulsanstm",
    "skill/elewaticeshk",
    "skill/elewatpoicld",
    "skill/elewatwatmst",
    "skill/elewinvoid",
    "skill/elewinwinfil",
    "skill/elewinwinmst",
    "skill/enhancedblinkpool",
    "skill/enhancedincreasedhprecovery",
    "skill/enlightenment",
    "skill/evastorm",
    "skill/eveplaypark",
    "skill/executionofjustice",
    "skill/farsight",
    "skill/firecounter",
    "skill/firstblood",
    "skill/fishing",
    "skill/florabsolutebarrier",
    "skill/flowofsalvation",
    "skill/forcegrip",
    "skill/foxskill",
    "skill/gale",
    "skill/gloriapatri",
    "skill/griffinskill",
    "skill/guienhance",
    "skill/gust",
    "skill/hardenedcarapace",
    "skill/headshot",
    "skill/heavensstep",
    "skill/heavyshot",
    "skill/hellfire",
    "skill/herb gathering",
    "skill/hexeslament",
    "skill/hymnliberation",
    "skill/hymnperfectperformance",
    "skill/hymnreducereceiveddamage",
    "skill/iblislife",
    "skill/iceshard",
    "skill/ignite",
    "skill/incinerate",
    "skill/increaseddefduringloweredhpmagic",
    "skill/increaseddefduringloweredhpphysical",
    "skill/increasedhprecovery",
    "skill/increasednaturalrecovery",
    "skill/ireofibilis",
    "skill/jstintabsorb",
    "skill/jstintbleedi",
    "skill/jstintpoison",
    "skill/jstsupescape",
    "skill/jstsupswing",
    "skill/jstsupvatals",
    "skill/jstyoybackst",
    "skill/jstyoypenya",
    "skill/junglefever",
    "skill/kntcalloffury",
    "skill/kntsupguard",
    "skill/kntsuppairef",
    "skill/kntsuprage",
    "skill/knttaxpaidea",
    "skill/knttaxpwstum",
    "skill/knttswcharge",
    "skill/knttswethdvd",
    "skill/knttwopwswng",
    "skill/kyrieeleison",
    "skill/lastonestanding",
    "skill/lefthanded",
    "skill/lilithsgaze",
    "skill/lionskill",
    "skill/lordkgrandrage",
    "skill/maelstromstrike",
    "skill/magelelgtbal",
    "skill/magfireboomer",
    "skill/magfirehotair",
    "skill/magfirestrike",
    "skill/maglightpalm",
    "skill/maglightshock",
    "skill/maglooting",
    "skill/magmagblinkp",
    "skill/magmagelemen",
    "skill/magmagmental",
    "skill/magrockcrash",
    "skill/magspekestone",
    "skill/magspringwater",
    "skill/magwaterball",
    "skill/magwaticemis",
    "skill/magwindcutter",
    "skill/magwindstrong",
    "skill/magwindswordw",
    "skill/maleficdetonation",
    "skill/manaburn",
    "skill/mantra",
    "skill/markedattack",
    "skill/markedprey",
    "skill/masterofaxe",
    "skill/masterofblade",
    "skill/masteroftoxic",
    "skill/medidate",
    "skill/meroneamaster",
    "skill/meroneblinds",
    "skill/meronebloody",
    "skill/meroneguillo",
    "skill/meronekeenwh",
    "skill/meronereflex",
    "skill/meronesenake",
    "skill/meronesmaste",
    "skill/meronesphit",
    "skill/meronesplmas",
    "skill/mershiebash",
    "skill/mershiepanbar",
    "skill/mershieprotec",
    "skill/mersupblazin",
    "skill/mersupfury",
    "skill/mersupimpowe",
    "skill/mersupsmitea",
    "skill/mindshatter",
    "skill/mining",
    "skill/mistytouch",
    "skill/mysteriousenergy",
    "skill/nenacquisition",
    "skill/nenoverflow",
    "skill/nenrelease",
    "skill/nensphere",
    "skill/nenstorage",
    "skill/packtactics",
    "skill/paralyze",
    "skill/petrify",
    "skill/placeholderskill",
    "skill/powerpalm",
    "skill/psycruciospell",
    "skill/psydnolgy",
    "skill/psygravitywell",
    "skill/psymaxcrisis",
    "skill/psypsybomb",
    "skill/psypsysquare",
    "skill/psypsywall",
    "skill/psysnolgy",
    "skill/psyspirits",
    "skill/ragboomburst",
    "skill/ragbowflamea",
    "skill/ragbowicearr",
    "skill/ragbowpierci",
    "skill/ragbowpoison",
    "skill/ragbowsltaro",
    "skill/ragbowtriple",
    "skill/ragsupfastsh",
    "skill/ragsupnature",
    "skill/repellingshot",
    "skill/rincuregvur",
    "skill/rinheahealra",
    "skill/rinsqugebura",
    "skill/rinsupanzelr",
    "skill/rinsupcross",
    "skill/rinsuphguard",
    "skill/rinsupprotec",
    "skill/rinsupspirit",
    "skill/riskmanagement",
    "skill/rushattack",
    "skill/sacrifice",
    "skill/shadeswift",
    "skill/shadowmirage",
    "skill/shadowstrike",
    "skill/shieldcrush",
    "skill/shieldmastery",
    "skill/sirenscall",
    "skill/sklelecallofroika",
    "skill/sklking01",
    "skill/sklking05",
    "skill/sklking08",
    "skill/sklkntsacrifice",
    "skill/skysplitter",
    "skill/sleep",
    "skill/smithing",
    "skill/soulofrhisis",
    "skill/speedboost",
    "skill/staggeringstrike",
    "skill/stigma3",
    "skill/stonefeet",
    "skill/stonepillar",
    "skill/stormslash",
    "skill/stormstrike",
    "skill/stormveilcloak",
    "skill/stunimmunity",
    "skill/swampyarea",
    "skill/tempestbarrage",
    "skill/templarcall",
    "skill/thunderstrike",
    "skill/tidalomen",
    "skill/tigerskill",
    "skill/touchofrhisis",
    "skill/toxicanalogy",
    "skill/toxicassault",
    "skill/toxiccloud",
    "skill/toxicfury",
    "skill/trapaoe",
    "skill/trapbinding",
    "skill/trapblast",
    "skill/trapdebuff",
    "skill/trapdot",
    "skill/trapmastery",
    "skill/trofortunecircle",
    "skill/undying",
    "skill/unicornskill",
    "skill/vagonebrandi",
    "skill/vagonecleanh",
    "skill/vagoneovercu",
    "skill/voltguard",
    "skill/watercounter",
    "skill/weakeningstrike",
    "skill/webbed",
    "skill/windcounter",
    "skill/wndlbacksteb",
    "skill/wndlmadhurricane",
    "skill/woodcutting",
    "skill/yoyostorm",
    "skill/zephyrsgrace",
  ];

  function parseKeybind(keybind: string): { modifier: string; key: string } {
    const parts = keybind.split('+');
    if (parts.length === 1) {
      return { modifier: "", key: keybind };
    }
    const key = parts[parts.length - 1];
    const modifier = parts.slice(0, -1).join('+');
    return { modifier, key };
  }

  function buildKeybind(modifier: string, key: string): string {
    if (!modifier || modifier === "") {
      return key;
    }
    return key ? `${modifier}+${key}` : modifier;
  }

  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");

  // Initialize sessionActions if it doesn't exist
  if (!neuzosConfig.sessionActions) {
    neuzosConfig.sessionActions = [];
  }

  let comboboxStates: { [sessionId: string]: Array<{ keyOpen: boolean; modifierOpen: boolean; iconOpen: boolean }> } = $state({});

  // Track open state for each collapsible
  let openSessions: { [sessionId: string]: boolean } = $state({});

  // Track open state for add session popover
  let addSessionPopoverOpen = $state(false);

  function addSessionToManage(sessionId: string) {
    const existing = neuzosConfig.sessionActions.find(sa => sa.sessionId === sessionId);
    if (!existing) {
      neuzosConfig.sessionActions.push({
        sessionId: sessionId,
        actions: []
      });
      openSessions[sessionId] = true;
    }
    addSessionPopoverOpen = false;
  }

  function removeSessionActions(sessionId: string) {
    neuzosConfig.sessionActions = neuzosConfig.sessionActions.filter(sa => sa.sessionId !== sessionId);
    delete openSessions[sessionId];
    delete comboboxStates[sessionId];
  }

  function addAction(sessionActions: SessionActions) {
    sessionActions.actions.push({
      id: Date.now().toString() + Math.random(),
      icon: { slug: 'neuzos_pang' },
      label: 'New Action',
      ingameKey: '',
      castTime: 0,
      cooldown: 0
    });
  }

  function removeAction(sessionActions: SessionActions, actionId: string) {
    sessionActions.actions = sessionActions.actions.filter(a => a.id !== actionId);
  }

  function getSessionLabel(sessionId: string): string {
    const session = neuzosConfig.sessions.find(s => s.id === sessionId);
    return session?.label || 'Unknown Session';
  }

  function getSessionIcon(sessionId: string): string {
    const session = neuzosConfig.sessions.find(s => s.id === sessionId);
    return session?.icon.slug || 'misc/browser';
  }

  // Initialize combobox states for actions
  $effect(() => {
    neuzosConfig.sessionActions.forEach(sa => {
      if (!comboboxStates[sa.sessionId]) {
        comboboxStates[sa.sessionId] = [];
      }
      const neededLength = sa.actions.length;
      while (comboboxStates[sa.sessionId].length < neededLength) {
        comboboxStates[sa.sessionId].push({ keyOpen: false, modifierOpen: false, iconOpen: false });
      }
      if (comboboxStates[sa.sessionId].length > neededLength) {
        comboboxStates[sa.sessionId].length = neededLength;
      }
    });
  });

</script>

<Card.Root class="h-full overflow-y-auto">
  <Card.Content class="flex flex-col gap-4">
    <p class="text-sm">
      Manage actions for your sessions. Each session can have multiple actions with customizable icons, labels, ingame keys, cast times, and cooldowns.
    </p>

    <!-- Add Session Selector -->
    <div class="flex items-center gap-2">
      <Popover.Root open={addSessionPopoverOpen} onOpenChange={(open) => { addSessionPopoverOpen = open; }}>
        <Popover.Trigger>
          <Button variant="outline" size="sm">
            <Plus class="size-4 mr-2"/>
            Add Session to Manage
          </Button>
        </Popover.Trigger>
        <Popover.Content class="w-[280px] p-0">
          <Command.Root shouldFilter={true}>
            <Command.Input placeholder="Search sessions..." class="h-10" />
            <Command.Empty>No session found.</Command.Empty>
            <Command.List class="max-h-[320px]">
              <Command.Group>
                {#each neuzosConfig.sessions as session}
                  {@const alreadyAdded = neuzosConfig.sessionActions.find(sa => sa.sessionId === session.id)}
                  {#if !alreadyAdded}
                    <Command.Item
                      value={session.id}
                      keywords={[session.label.toLowerCase()]}
                      onSelect={() => addSessionToManage(session.id)}
                      class="py-2.5"
                    >
                      <img class="size-4 mr-2" src="icons/{session.icon.slug}.png" alt=""/>
                      <span>{session.label}</span>
                    </Command.Item>
                  {/if}
                {/each}
              </Command.Group>
            </Command.List>
          </Command.Root>
        </Popover.Content>
      </Popover.Root>
    </div>

    <!-- Session Actions Cards -->
    <div class="flex flex-col gap-3">
      {#each neuzosConfig.sessionActions as sessionActions (sessionActions.sessionId)}
        {@const sessionLabel = getSessionLabel(sessionActions.sessionId)}
        {@const sessionIcon = getSessionIcon(sessionActions.sessionId)}
        {@const isSessionOpen = openSessions[sessionActions.sessionId] ?? false}
        <Collapsible.Root open={isSessionOpen} onOpenChange={(open) => { openSessions[sessionActions.sessionId] = open; }} class="border rounded-lg">
          <Card.Root class="border-0">
            <Card.Header class="p-4 pb-3">
              <div class="flex items-center justify-between">
                <Collapsible.Trigger class="flex items-center gap-2 hover:opacity-80 transition-opacity flex-1">
                  <img class="w-6 h-6" src="icons/{sessionIcon}.png" alt=""/>
                  <h3 class="text-lg font-semibold">{sessionLabel}</h3>
                  <span class="text-sm text-muted-foreground">({sessionActions.actions.length} actions)</span>
                  <ChevronDown class="h-5 w-5 ml-2 transition-transform {openSessions[sessionActions.sessionId] ? 'rotate-180' : ''}" />
                </Collapsible.Trigger>
                <Button
                  variant="outline"
                  size="xs"
                  onclick={() => removeSessionActions(sessionActions.sessionId)}
                  class="ml-2"
                >
                  <Trash2 class="size-3"/>
                </Button>
              </div>
            </Card.Header>
            <Collapsible.Content>
              <Card.Content class="p-4 pt-0">
                <div class="flex flex-col gap-3">
                  <!-- Actions Table -->
                  {#if sessionActions.actions.length > 0}
                    <Table.Root>
                      <Table.Header>
                        <Table.Row>
                          <Table.Head class="w-[60px]">Icon</Table.Head>
                          <Table.Head class="w-[200px]">Label</Table.Head>
                          <Table.Head class="w-[120px]">Modifier</Table.Head>
                          <Table.Head class="w-[120px]">Key</Table.Head>
                          <Table.Head class="w-[120px]">Cast Time(s)</Table.Head>
                          <Table.Head class="w-[120px]">Cooldown(s)</Table.Head>
                          <Table.Head class="w-[80px]"></Table.Head>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {#each sessionActions.actions as action, index (action.id)}
                          {@const parsed = parseKeybind(action.ingameKey)}
                          {@const state = comboboxStates[sessionActions.sessionId]?.[index] || { keyOpen: false, modifierOpen: false, iconOpen: false }}
                          <Table.Row>
                            <!-- Icon -->
                            <Table.Cell>
                              <Popover.Root open={state.iconOpen} onOpenChange={(open) => { if (comboboxStates[sessionActions.sessionId]?.[index]) comboboxStates[sessionActions.sessionId][index].iconOpen = open; }}>
                                <Popover.Trigger class="w-12 h-12 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                                  <img class="w-8 h-8" src="icons/{action.icon.slug}.png" alt=""/>
                                </Popover.Trigger>
                                <Popover.Content class="w-[280px] p-0">
                                  <Command.Root shouldFilter={true}>
                                    <Command.Input placeholder="Search icons..." class="h-10" />
                                    <Command.Empty>No icon found.</Command.Empty>
                                    <Command.List class="max-h-[320px]">
                                      <Command.Group>
                                        {#each actionIcons as icon}
                                          <Command.Item
                                            value={icon}
                                            keywords={[icon.replace('skill/', '').replace(/_/g, ' ').toLowerCase()]}
                                            onSelect={() => {
                                              action.icon.slug = icon;
                                              state.iconOpen = false;
                                            }}
                                            class="py-2"
                                          >
                                            <img class="size-6 mr-2" src="icons/{icon}.png" alt=""/>
                                            <span class="text-xs truncate">{icon.replace('skill/', '')}</span>
                                          </Command.Item>
                                        {/each}
                                      </Command.Group>
                                    </Command.List>
                                  </Command.Root>
                                </Popover.Content>
                              </Popover.Root>
                            </Table.Cell>

                            <!-- Label -->
                            <Table.Cell>
                              <Input
                                class="px-3 py-1 h-9"
                                bind:value={action.label}
                                placeholder="Action label"
                              />
                            </Table.Cell>

                            <!-- Modifier -->
                            <Table.Cell>
                              <Popover.Root open={state.modifierOpen} onOpenChange={(open) => { if (comboboxStates[sessionActions.sessionId]?.[index]) comboboxStates[sessionActions.sessionId][index].modifierOpen = open; }}>
                                <Popover.Trigger class="w-full h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                                  {@const selectedMod = modifierOptions.find(m => m.value === parsed.modifier)?.label ?? 'None'}
                                  <span class="truncate {parsed.modifier ? 'text-foreground' : 'text-muted-foreground'}">
                                    {selectedMod}
                                  </span>
                                  <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50" />
                                </Popover.Trigger>
                                <Popover.Content class="w-[220px] p-0">
                                  <Command.Root shouldFilter={true}>
                                    <Command.Input placeholder="Search modifier..." class="h-10" />
                                    <Command.Empty>No modifier found.</Command.Empty>
                                    <Command.List class="max-h-[320px]">
                                      <Command.Group>
                                        {#each modifierOptions as modifier}
                                          <Command.Item
                                            value={modifier.value}
                                            keywords={[modifier.label.toLowerCase()]}
                                            onSelect={() => {
                                              action.ingameKey = buildKeybind(modifier.value, parsed.key);
                                              state.modifierOpen = false;
                                            }}
                                            class="font-medium py-2.5"
                                          >
                                            <Check class={parsed.modifier === modifier.value ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"} />
                                            <span class={parsed.modifier === modifier.value ? "text-primary" : ""}>{modifier.label}</span>
                                          </Command.Item>
                                        {/each}
                                      </Command.Group>
                                    </Command.List>
                                  </Command.Root>
                                </Popover.Content>
                              </Popover.Root>
                            </Table.Cell>

                            <!-- Key -->
                            <Table.Cell>
                              {@const keyOnly = parsed.key}
                              <Popover.Root open={state.keyOpen} onOpenChange={(open) => { if (comboboxStates[sessionActions.sessionId]?.[index]) comboboxStates[sessionActions.sessionId][index].keyOpen = open; }}>
                                <Popover.Trigger class="w-full h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-mono font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                                  <span class="truncate {keyOnly ? 'text-foreground uppercase' : 'text-muted-foreground font-sans font-normal lowercase'}">
                                    {keyOnly || "select key..."}
                                  </span>
                                  <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50" />
                                </Popover.Trigger>
                                <Popover.Content class="w-[220px] p-0">
                                  <Command.Root shouldFilter={true}>
                                    <Command.Input placeholder="Search key..." class="h-10" />
                                    <Command.Empty>No key found.</Command.Empty>
                                    <Command.List class="max-h-[320px]">
                                      <Command.Group>
                                        {#each allowedKeys as key}
                                          <Command.Item
                                            value={key}
                                            onSelect={() => {
                                              action.ingameKey = buildKeybind(parsed.modifier, key);
                                              state.keyOpen = false;
                                            }}
                                            class="font-mono font-semibold uppercase py-2.5"
                                          >
                                            <Check class={keyOnly === key ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"} />
                                            <span class={keyOnly === key ? "text-primary" : ""}>{key}</span>
                                          </Command.Item>
                                        {/each}
                                      </Command.Group>
                                    </Command.List>
                                  </Command.Root>
                                </Popover.Content>
                              </Popover.Root>
                            </Table.Cell>

                            <!-- Cast Time -->
                            <Table.Cell>
                              <Input
                                type="number"
                                class="px-3 py-1 h-9"
                                bind:value={action.castTime}
                                min="0"
                                step="0.1"
                                placeholder="0"
                              />
                            </Table.Cell>

                            <!-- Cooldown -->
                            <Table.Cell>
                              <Input
                                type="number"
                                class="px-3 py-1 h-9"
                                bind:value={action.cooldown}
                                min="0"
                                step="0.1"
                                placeholder="0"
                              />
                            </Table.Cell>

                            <!-- Delete -->
                            <Table.Cell>
                              <Button
                                variant="outline"
                                size="xs"
                                onclick={() => removeAction(sessionActions, action.id)}
                              >
                                <Trash2 class="size-3"/>
                              </Button>
                            </Table.Cell>
                          </Table.Row>
                        {/each}
                      </Table.Body>
                    </Table.Root>
                  {:else}
                    <p class="text-sm text-muted-foreground text-center py-4">
                      No actions yet. Click the button below to add your first action.
                    </p>
                  {/if}

                  <!-- Add Action Button -->
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => addAction(sessionActions)}
                    class="w-full"
                  >
                    <Plus class="size-4 mr-2"/>
                    Add Action
                  </Button>
                </div>
              </Card.Content>
            </Collapsible.Content>
          </Card.Root>
        </Collapsible.Root>
      {/each}
    </div>

    {#if neuzosConfig.sessionActions.length === 0}
      <div class="text-center py-8 text-muted-foreground">
        <p>No sessions configured yet.</p>
        <p class="text-sm">Add a session above to start managing actions.</p>
      </div>
    {/if}
  </Card.Content>
</Card.Root>


