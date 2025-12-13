<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import * as Popover from "$lib/components/ui/popover";
  import * as Command from "$lib/components/ui/command";
  import * as Collapsible from "$lib/components/ui/collapsible";

  import {getContext} from "svelte";
  import {Button} from "$lib/components/ui/button";
  import {Input} from "$lib/components/ui/input";
  import {Switch} from "$lib/components/ui/switch";

  import type {NeuzConfig, SessionActions} from "$lib/types";
  import {Plus, Trash2, ChevronsUpDown, Check, ChevronDown, ChevronUp} from "@lucide/svelte";

  const modifierOptions = [
    {value: "", label: "None"},
    {value: "alt", label: "Alt"},
    {value: "shift", label: "Shift"},
    {value: "control", label: "Control"},
    {value: "command", label: "Command"},
    {value: "meta", label: "Meta"},
    {value: "control+alt", label: "Ctrl+Alt"},
    {value: "control+shift", label: "Ctrl+Shift"},

    {value: "command+control", label: "Cmd+Ctrl"},
    {value: "command+alt", label: "Cmd+Alt"},
    {value: "command+shift", label: "Cmd+Shift"},

    {value: "alt+shift", label: "Alt+Shift"},
    {value: "control+alt+shift", label: "Ctrl+Alt+Shift"},
    {value: "command+control+shift", label: "Cmd+Ctrl+Shift"},
    {value: "command+control+alt", label: "Cmd+Ctrl+Alt"},
    {value: "command+alt+shift", label: "Cmd+Alt+Shift"},
  ];

  const cooldownCategoryOptions = [
    {value: "", label: "None"},
    {value: "food", label: "Food"},
    {value: "pill", label: "Pill"},
    {value: "refresher", label: "Refresher"},
    {value: "vital", label: "Vital"},
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
    "skill/acrobat_aimed_shot",
    "skill/acrobat_arrow_rain",
    "skill/acrobat_auto_shot",
    "skill/acrobat_bow_mastery",
    "skill/acrobat_counter_attack",
    "skill/acrobat_cross_line",
    "skill/acrobat_dark_illusion",
    "skill/acrobat_deadly_swing",
    "skill/acrobat_fast_walker",
    "skill/acrobat_junk_arrow",
    "skill/acrobat_perfect_block",
    "skill/acrobat_pulling",
    "skill/acrobat_silent_shot",
    "skill/acrobat_slow_step",
    "skill/acrobat_snatch",
    "skill/acrobat_yo-yo_mastery",
    "skill/arcanist_aqua_veil",
    "skill/arcanist_blaze_eater",
    "skill/arcanist_earth_counter",
    "skill/arcanist_earthen_fortitude",
    "skill/arcanist_electric_counter",
    "skill/arcanist_enhanced_blinkpool",
    "skill/arcanist_entangling_roots",
    "skill/arcanist_eva_storm",
    "skill/arcanist_fire_counter",
    "skill/arcanist_gale",
    "skill/arcanist_gust",
    "skill/arcanist_hellfire",
    "skill/arcanist_iceshard",
    "skill/arcanist_ignite",
    "skill/arcanist_incinerate",
    "skill/arcanist_infusion",
    "skill/arcanist_stone_pillar",
    "skill/arcanist_stormveil_cloak",
    "skill/arcanist_swampy_area",
    "skill/arcanist_thunder_strike",
    "skill/arcanist_tidal_omen",
    "skill/arcanist_voltguard",
    "skill/arcanist_water_counter",
    "skill/arcanist_wind_counter",
    "skill/arcanist_zephyrsgrace",
    "skill/assist_accuracy",
    "skill/assist_beef_up",
    "skill/assist_burst_crack",
    "skill/assist_cannon_ball",
    "skill/assist_cats_reflex",
    "skill/assist_circle_healing",
    "skill/assist_haste",
    "skill/assist_heal",
    "skill/assist_heap_up",
    "skill/assist_mental_sign",
    "skill/assist_moon_beam",
    "skill/assist_patience",
    "skill/assist_power_fist",
    "skill/assist_prevention",
    "skill/assist_quick_step",
    "skill/assist_resurrection",
    "skill/assist_stonehand",
    "skill/assist_temping_hole",
    "skill/billposter_asalraalaikum",
    "skill/billposter_asmodeus",
    "skill/billposter_baraqijal_esna",
    "skill/billposter_belial_smashing",
    "skill/billposter_bgvur_tialbold",
    "skill/billposter_blood_fist",
    "skill/billposter_piercing_serpent",
    "skill/billposter_sonichand",
    "skill/billposter_surys_tenacity",
    "skill/blade_armor_penetrate",
    "skill/blade_berserk",
    "skill/blade_blade_dance",
    "skill/blade_cross_strike",
    "skill/blade_hawk_attack",
    "skill/blade_rending_entry",
    "skill/blade_silent_strike",
    "skill/blade_sonic_blade",
    "skill/blade_spring_attack",
    "skill/crackshooter_advanced_trap",
    "skill/crackshooter_barrage",
    "skill/crackshooter_condor_dive",
    "skill/crackshooter_devastating_sting",
    "skill/crackshooter_eagle_eye",
    "skill/crackshooter_heavyshot",
    "skill/crackshooter_marked_prey",
    "skill/crackshooter_repelling_shot",
    "skill/crackshooter_swift_hands",
    "skill/crackshooter_trap_aoe",
    "skill/crackshooter_trap_binding",
    "skill/crackshooter_trap_blast",
    "skill/crackshooter_trap_debuff",
    "skill/crackshooter_trap_dot",
    "skill/elementor_blizzard",
    "skill/elementor_burningfield",
    "skill/elementor_earth_mastery",
    "skill/elementor_earthquake",
    "skill/elementor_electric_shock",
    "skill/elementor_eye_of_the_storm",
    "skill/elementor_firebird",
    "skill/elementor_fire_mastery",
    "skill/elementor_iceshark",
    "skill/elementor_lightning_mastery",
    "skill/elementor_lightning_storm",
    "skill/elementor_lightning_strike",
    "skill/elementor_meteo_shower",
    "skill/elementor_poison_cloud",
    "skill/elementor_sandstorm",
    "skill/elementor_stone_spear",
    "skill/elementor_void",
    "skill/elementor_water_mastery",
    "skill/elementor_windfield",
    "skill/elementor_wind_mastery",
    "skill/forcemaster_aura_bomb",
    "skill/forcemaster_bubbles_blessing",
    "skill/forcemaster_clear_reflection",
    "skill/forcemaster_concentration",
    "skill/forcemaster_enlightenment",
    "skill/forcemaster_force_grip",
    "skill/forcemaster_initiating_strike",
    "skill/forcemaster_ire_of_iblis",
    "skill/forcemaster_marked_attack",
    "skill/forcemaster_medidate",
    "skill/forcemaster_nen_acquisition",
    "skill/forcemaster_nen_overflow",
    "skill/forcemaster_nen_release",
    "skill/forcemaster_nen_sphere",
    "skill/forcemaster_nenstorage",
    "skill/forcemaster_power_palm",
    "skill/forcemaster_staggering_strike",
    "skill/forcemaster_tenacity",
    "skill/forcemaster_touch_of_rhisis",
    "skill/harlequin_agility",
    "skill/harlequin_alter_ego",
    "skill/harlequin_critical_stab",
    "skill/harlequin_harlequins_charge",
    "skill/harlequin_harlequins_greeting",
    "skill/harlequin_master_of_toxic",
    "skill/harlequin_risk_management",
    "skill/harlequin_shadow_strike",
    "skill/harlequin_special_yo-yo_mastery",
    "skill/harlequin_toxicanalogy",
    "skill/harlequin_toxic_assault",
    "skill/harlequin_toxic_cloud",
    "skill/harlequin_toxic_fury",
    "skill/harlequin_yo-yo_storm",
    "skill/jester_critical_swing",
    "skill/jester_enchant_absorb",
    "skill/jester_enchant_blood",
    "skill/jester_enchant_poison",
    "skill/jester_escape",
    "skill/jester_hit_of_penya",
    "skill/jester_jesters_blast",
    "skill/jester_multi-stab",
    "skill/jester_vital_stab",
    "skill/knight_call_of_fury",
    "skill/knight_charge",
    "skill/knight_earth_ddivider",
    "skill/knight_grand_rage",
    "skill/knight_guard",
    "skill/knight_heart_of_fury",
    "skill/knight_heart_of_sacrifice",
    "skill/knight_pain_dealer",
    "skill/knight_pain_reflection",
    "skill/knight_power_stomp",
    "skill/knight_power_swing",
    "skill/knight_rage",
    "skill/magician_blinkpool",
    "skill/magician_fire_strike",
    "skill/magician_flame_ball",
    "skill/magician_flame_geyser",
    "skill/magician_ice_missile",
    "skill/magician_lightning_ball",
    "skill/magician_lightning_ram",
    "skill/magician_lightning_shock",
    "skill/magician_mental_strike",
    "skill/magician_rock_crash",
    "skill/magician_rooting",
    "skill/magician_stone_spike",
    "skill/magician_strongwind",
    "skill/magician_swordwind",
    "skill/magician_waterball",
    "skill/magician_water_well",
    "skill/magician_windcutter",
    "skill/mentalist_additional_damage_disable",
    "skill/mentalist_additional_damage_weaken",
    "skill/mentalist_aether_rend",
    "skill/mentalist_chimeras_curse",
    "skill/mentalist_cimetieres_scream",
    "skill/mentalist_damnation_surge",
    "skill/mentalist_debuff_damage_reduction",
    "skill/mentalist_enhanced_blinkpool",
    "skill/mentalist_hexes_lament",
    "skill/mentalist_liliths_gaze",
    "skill/mentalist_malefic_detonation",
    "skill/mercenary_axe_mastery",
    "skill/mercenary_blazing_sword",
    "skill/mercenary_blindside",
    "skill/mercenary_bloody_strike",
    "skill/mercenary_empower_weapon",
    "skill/mercenary_guillotine",
    "skill/mercenary_keenwheel",
    "skill/mercenary_protection",
    "skill/mercenary_reflex_hit",
    "skill/mercenary_shield_bash",
    "skill/mercenary_slash",
    "skill/mercenary_smite_axe",
    "skill/mercenary_sneaker",
    "skill/mercenary_special_hit",
    "skill/mercenary_sword_mastery",
    "skill/psykeeper_crucio_spell",
    "skill/psykeeper_demonology",
    "skill/psykeeper_gravity_well",
    "skill/psykeeper_maximum_crisis",
    "skill/psykeeper_psychic_bomb",
    "skill/psykeeper_psychic_square",
    "skill/psykeeper_psychic_wall",
    "skill/psykeeper_satanology",
    "skill/psykeeper_spirit_bomb",
    "skill/ranger_boomburst",
    "skill/ranger_critical_shot",
    "skill/ranger_flame_arrow",
    "skill/ranger_ice_arrow",
    "skill/ranger_nature",
    "skill/ranger_piercing_arrow",
    "skill/ranger_poison_arrow",
    "skill/ranger_silent_arrow",
    "skill/ranger_triple_shot",
    "skill/ringmaster_barrier_of_life",
    "skill/ringmaster_geburah_tiphreth",
    "skill/ringmaster_gvur_tialla",
    "skill/ringmaster_heal_rain",
    "skill/ringmaster_holycross",
    "skill/ringmaster_holyguard",
    "skill/ringmaster_merkaba_hanzelrusha",
    "skill/ringmaster_protect",
    "skill/ringmaster_spirit_fortune",
    "skill/seraph_blessing_of_the_wise",
    "skill/seraph_celestial_barrier",
    "skill/seraph_divinecross",
    "skill/seraph_flow_of_salvation",
    "skill/seraph_gloria_patri",
    "skill/seraph_hammer_of_judgement",
    "skill/seraph_heavens_step",
    "skill/seraph_hymn-damage_reduction",
    "skill/seraph_hymn-liberation",
    "skill/seraph_hymn-perfect_performance",
    "skill/seraph_kyrie_eleison",
    "skill/seraph_sacrifice",
    "skill/seraph_soul_of_rhisis",
    "skill/slayer_ambidextrous",
    "skill/slayer_blood_armor",
    "skill/slayer_bloody_rush",
    "skill/slayer_bloody_thorn",
    "skill/slayer_cross_of_blood",
    "skill/slayer_first_blood",
    "skill/slayer_left_handed",
    "skill/slayer_master_of_axe",
    "skill/slayer_master_of_sword",
    "skill/slayer_stigma_iii",
    "skill/slayer_stigma_ii",
    "skill/slayer_stigma_i",
    "skill/slayer_storm_slash",
    "skill/slayer_storm_strike",
    "skill/slayer_tempest_barrage",
    "skill/templar_deaths_rush",
    "skill/templar_enhanced_hp_recovery",
    "skill/templar_enhanced_magical_defense",
    "skill/templar_enhanced_physical_defense",
    "skill/templar_execution_of_justice",
    "skill/templar_four_strikes",
    "skill/templar_increased_hp_recovery",
    "skill/templar_increased_hp_regeneration",
    "skill/templar_last_one_standing",
    "skill/templar_maelstrom_strike",
    "skill/templar_rush_attack",
    "skill/templar_shield_crush",
    "skill/templar_shield_mastery",
    "skill/templar_sky_splitter",
    "skill/templar_templars_call",
    "skill/templar_undying",
    "skill/vagrant_clean_hit",
    "skill/vagrant_flurry",
    "skill/vagrant_over_cutter",
    "skill/pt_giftbox",
    "skill/pt_giftbox",
    "skill/pt_luckydrop",
    "skill/pt_link",
    "skill/couple_blessingsky",
    "skill/couple_fieldouting",
    "skill/couple_goldenluck",
    "skill/couple_happyjump",
    "skill/couple_partytogether",
    "skill/couple_staminaboost",
    "skill/couple_stroll",
    "skill/couple_swiftrecovery",
    "items/food_sushi",
    "items/vital_fp",
    "items/pill_gold",
    "items/refresher_mp",
    "items/wings",
  ];

  function parseKeybind(keybind: string): { modifier: string; key: string } {
    const parts = keybind.split('+');
    if (parts.length === 1) {
      return {modifier: "", key: keybind};
    }
    const key = parts[parts.length - 1];
    const modifier = parts.slice(0, -1).join('+');
    return {modifier, key};
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

  let comboboxStates: {
    [sessionId: string]: Array<{ keyOpen: boolean; modifierOpen: boolean; iconOpen: boolean; categoryOpen: boolean }>
  } = $state({});

  // Track open state for each collapsible
  let openSessions: { [sessionId: string]: boolean } = $state({});

  // Track open state for add sessions popover
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
      icon: {slug: 'neuzos_pang'},
      label: 'New Action',
      ingameKey: '',
      castTime: 0,
      cooldown: 0,
      pinned: false,
      cooldownCategory: ''
    });
  }

  function removeAction(sessionActions: SessionActions, actionId: string) {
    sessionActions.actions = sessionActions.actions.filter(a => a.id !== actionId);
  }

  function moveActionUp(sessionActions: SessionActions, index: number) {
    if (index > 0) {
      const temp = sessionActions.actions[index];
      sessionActions.actions[index] = sessionActions.actions[index - 1];
      sessionActions.actions[index - 1] = temp;

      // Also swap the combobox states
      if (comboboxStates[sessionActions.sessionId]) {
        const tempState = comboboxStates[sessionActions.sessionId][index];
        comboboxStates[sessionActions.sessionId][index] = comboboxStates[sessionActions.sessionId][index - 1];
        comboboxStates[sessionActions.sessionId][index - 1] = tempState;
      }
    }
  }

  function moveActionDown(sessionActions: SessionActions, index: number) {
    if (index < sessionActions.actions.length - 1) {
      const temp = sessionActions.actions[index];
      sessionActions.actions[index] = sessionActions.actions[index + 1];
      sessionActions.actions[index + 1] = temp;

      // Also swap the combobox states
      if (comboboxStates[sessionActions.sessionId]) {
        const tempState = comboboxStates[sessionActions.sessionId][index];
        comboboxStates[sessionActions.sessionId][index] = comboboxStates[sessionActions.sessionId][index + 1];
        comboboxStates[sessionActions.sessionId][index + 1] = tempState;
      }
    }
  }

  function getSessionLabel(sessionId: string): string {
    const session = neuzosConfig.sessions.find(s => s.id === sessionId);
    return session?.label || 'Unknown Session';
  }

  function getSessionIcon(sessionId: string): string {
    const session = neuzosConfig.sessions.find(s => s.id === sessionId);
    return session?.icon.slug || 'misc/browser';
  }

  $effect(() => {
    // Ensure combobox states match action counts
    neuzosConfig.sessionActions.forEach(sa => {
      if (!comboboxStates[sa.sessionId]) {
        comboboxStates[sa.sessionId] = [];
      }
      const neededLength = sa.actions.length;
      while (comboboxStates[sa.sessionId].length < neededLength) {
        comboboxStates[sa.sessionId].push({keyOpen: false, modifierOpen: false, iconOpen: false, categoryOpen: false});
      }
      if (comboboxStates[sa.sessionId].length > neededLength) {
        comboboxStates[sa.sessionId].length = neededLength;
      }

      // Initialize pinned property for existing actions
      sa.actions.forEach(action => {
        if (action.pinned === undefined) {
          action.pinned = false;
        }
      });
    });
  });

</script>

<Card.Root class="h-full overflow-y-auto">
  <Card.Content class="flex flex-col gap-4">
    <p class="text-sm">
      Manage actions for your sessions. Each session can have multiple actions with customizable icons, labels, ingame
      keys, cast times, and cooldowns.
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
            <Command.Input placeholder="Search sessions..." class="h-10"/>
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
        <Collapsible.Root open={isSessionOpen}
                          onOpenChange={(open) => { openSessions[sessionActions.sessionId] = open; }}
                          class="group border rounded-lg bg-card">
          <div class="p-4">
            <div class="flex items-center justify-between">
              <Collapsible.Trigger class="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 text-left">
                <img class="w-6 h-6 rounded" src="icons/{sessionIcon}.png" alt=""/>
                <div class="flex flex-col">
                  <span class="font-medium">{sessionLabel}</span>
                  <span class="text-sm text-muted-foreground">{sessionActions.actions.length}
                    action{sessionActions.actions.length !== 1 ? 's' : ''}</span>
                </div>
                <ChevronDown
                  class="h-4 w-4 ml-auto transition-transform {openSessions[sessionActions.sessionId] ? 'rotate-180' : ''}"/>
              </Collapsible.Trigger>
              <Button
                variant="ghost"
                size="icon"
                onclick={() => removeSessionActions(sessionActions.sessionId)}
                class="ml-2 h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 class="h-4 w-4"/>
              </Button>
            </div>

            <Collapsible.Content class="pt-4">
              <div class="space-y-4">
                <!-- Actions Table -->
                {#if sessionActions.actions.length > 0}
                  <div class="rounded-md border">
                    <Table.Root>
                      <Table.Header>
                        <Table.Row>
                          <Table.Head class="w-[20px]"></Table.Head>
                          <Table.Head class="w-[60px]">Icon</Table.Head>
                          <Table.Head class="w-[200px]">Label</Table.Head>
                          <Table.Head class="w-[120px]">Modifier</Table.Head>
                          <Table.Head class="w-[120px]">Key</Table.Head>
                          <Table.Head class="w-[100px]">Cast Time(s)</Table.Head>
                          <Table.Head class="w-[100px]">Cooldown(s)</Table.Head>
                          <Table.Head class="w-[120px]">CD Category</Table.Head>
                          <Table.Head class="w-[70px] text-center">Pinned</Table.Head>
                          <Table.Head class="w-[40px]"></Table.Head>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {#each sessionActions.actions as action, index (action.id)}
                          {@const parsed = parseKeybind(action.ingameKey)}
                          {@const state = comboboxStates[sessionActions.sessionId]?.[index] || {
                            keyOpen: false,
                            modifierOpen: false,
                            iconOpen: false,
                            categoryOpen: false
                          }}
                          <Table.Row class="hover:bg-muted/50">
                            <!-- Order -->
                            <Table.Cell class="py-3">
                              <div class="flex flex-col items-center justify-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon-xs"
                                  onclick={() => moveActionUp(sessionActions, index)}
                                  disabled={index === 0}
                                >
                                  <ChevronUp class="h-4 w-4"/>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon-xs"
                                  onclick={() => moveActionDown(sessionActions, index)}
                                  disabled={index === sessionActions.actions.length - 1}
                                >
                                  <ChevronDown class="h-4 w-4"/>
                                </Button>
                              </div>
                            </Table.Cell>
                            <!-- Icon -->
                            <Table.Cell class="py-3">
                              <Popover.Root open={state.iconOpen}
                                            onOpenChange={(open) => { if (comboboxStates[sessionActions.sessionId]?.[index]) comboboxStates[sessionActions.sessionId][index].iconOpen = open; }}>
                                <Popover.Trigger
                                  class="w-10 h-10 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                                  <img class="size-8" src="icons/{action.icon.slug}.png" alt=""/>
                                </Popover.Trigger>
                                <Popover.Content class="w-[280px] p-0">
                                  <Command.Root shouldFilter={true}>
                                    <Command.Input placeholder="Search icons..." class="h-10"/>
                                    <Command.Empty>No icon found.</Command.Empty>
                                    <Command.List class="max-h-[320px]">
                                      <Command.Group>
                                        {#each actionIcons as icon}
                                          {@const displayName = icon.includes('/') ? icon.split('/')[1] : icon}
                                          <Command.Item
                                            value={icon}
                                            keywords={[icon.replace(/_/g, ' ').replace(/\//g, ' ').toLowerCase()]}
                                            onSelect={() => {
                                                action.icon.slug = icon;
                                                state.iconOpen = false;
                                              }}
                                            class="py-2"
                                          >
                                            <img class="size-6 mr-2" src="icons/{icon}.png" alt=""/>
                                            <span class="text-xs truncate">{displayName}</span>
                                          </Command.Item>
                                        {/each}
                                      </Command.Group>
                                    </Command.List>
                                  </Command.Root>
                                </Popover.Content>
                              </Popover.Root>
                            </Table.Cell>

                            <!-- Label -->
                            <Table.Cell class="py-3">
                              <Input
                                class="h-9 text-sm"
                                bind:value={action.label}
                                placeholder="Action label"
                              />
                            </Table.Cell>

                            <!-- Modifier -->
                            <Table.Cell class="py-3">
                              <Popover.Root open={state.modifierOpen}
                                            onOpenChange={(open) => { if (comboboxStates[sessionActions.sessionId]?.[index]) comboboxStates[sessionActions.sessionId][index].modifierOpen = open; }}>
                                <Popover.Trigger
                                  class="w-full h-9 px-3 py-2 inline-flex items-center justify-between rounded-md border border-input bg-background text-sm shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                  {@const
                                    selectedMod = modifierOptions.find(m => m.value === parsed.modifier)?.label ?? 'None'}
                                  <span
                                    class="truncate {parsed.modifier ? 'text-foreground' : 'text-muted-foreground'}">
                                      {selectedMod}
                                    </span>
                                  <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                                </Popover.Trigger>
                                <Popover.Content class="w-[220px] p-0">
                                  <Command.Root shouldFilter={true}>
                                    <Command.Input placeholder="Search modifier..." class="h-10"/>
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
                                            class="py-2.5"
                                          >
                                            <Check
                                              class={parsed.modifier === modifier.value ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                            <span
                                              class={parsed.modifier === modifier.value ? "text-primary" : ""}>{modifier.label}</span>
                                          </Command.Item>
                                        {/each}
                                      </Command.Group>
                                    </Command.List>
                                  </Command.Root>
                                </Popover.Content>
                              </Popover.Root>
                            </Table.Cell>

                            <!-- Key -->
                            <Table.Cell class="py-3">
                              {@const keyOnly = parsed.key}
                              <Popover.Root open={state.keyOpen}
                                            onOpenChange={(open) => { if (comboboxStates[sessionActions.sessionId]?.[index]) comboboxStates[sessionActions.sessionId][index].keyOpen = open; }}>
                                <Popover.Trigger
                                  class="w-full h-9 px-3 py-2 inline-flex items-center justify-between rounded-md border border-input bg-background text-sm font-mono shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                    <span
                                      class="truncate {keyOnly ? 'text-foreground uppercase font-semibold' : 'text-muted-foreground font-sans font-normal lowercase'}">
                                      {keyOnly || "select key..."}
                                    </span>
                                  <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                                </Popover.Trigger>
                                <Popover.Content class="w-[220px] p-0">
                                  <Command.Root shouldFilter={true}>
                                    <Command.Input placeholder="Search key..." class="h-10"/>
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
                                            <Check
                                              class={keyOnly === key ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
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
                            <Table.Cell class="py-3">
                              <Input
                                type="number"
                                class="h-9 text-sm"
                                bind:value={action.castTime}
                                min="0"
                                step="0.1"
                                placeholder="0"
                              />
                            </Table.Cell>

                            <!-- Cooldown -->
                            <Table.Cell class="py-3">
                              <Input
                                type="number"
                                class="h-9 text-sm"
                                bind:value={action.cooldown}
                                min="0"
                                step="0.1"
                                placeholder="0"
                              />
                            </Table.Cell>

                            <!-- Cooldown Category -->
                            <Table.Cell class="py-3">
                              <Popover.Root open={state.categoryOpen}
                                            onOpenChange={(open) => { if (comboboxStates[sessionActions.sessionId]?.[index]) comboboxStates[sessionActions.sessionId][index].categoryOpen = open; }}>
                                <Popover.Trigger
                                  class="w-full h-9 px-3 py-2 inline-flex items-center justify-between rounded-md border border-input bg-background text-sm shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                  {@const
                                    selectedCategory = cooldownCategoryOptions.find(c => c.value === (action.cooldownCategory || ""))?.label ?? 'None'}
                                  <span
                                    class="truncate {action.cooldownCategory ? 'text-foreground' : 'text-muted-foreground'}">
                                      {selectedCategory}
                                    </span>
                                  <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                                </Popover.Trigger>
                                <Popover.Content class="w-[220px] p-0">
                                  <Command.Root shouldFilter={true}>
                                    <Command.Input placeholder="Search category..." class="h-10"/>
                                    <Command.Empty>No category found.</Command.Empty>
                                    <Command.List class="max-h-[320px]">
                                      <Command.Group>
                                        {#each cooldownCategoryOptions as category}
                                          <Command.Item
                                            value={category.value}
                                            keywords={[category.label.toLowerCase()]}
                                            onSelect={() => {
                                                action.cooldownCategory = category.value;
                                                state.categoryOpen = false;
                                              }}
                                            class="py-2.5"
                                          >
                                            <Check
                                              class={(action.cooldownCategory || "") === category.value ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                            <span
                                              class={(action.cooldownCategory || "") === category.value ? "text-primary" : ""}>{category.label}</span>
                                          </Command.Item>
                                        {/each}
                                      </Command.Group>
                                    </Command.List>
                                  </Command.Root>
                                </Popover.Content>
                              </Popover.Root>
                            </Table.Cell>

                            <!-- Pinned -->
                            <Table.Cell class="py-3">
                              <div class="flex items-center justify-center">
                                <Switch checked={action.pinned ?? false}
                                        onCheckedChange={(checked) => { action.pinned = checked; }}/>
                              </div>
                            </Table.Cell>
                            <!-- Delete -->
                            <Table.Cell class="py-3">
                              <Button
                                variant="outline"
                                size="icon"
                                onclick={() => removeAction(sessionActions, action.id)}
                                class="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 class="h-4 w-4"/>
                              </Button>
                            </Table.Cell>
                          </Table.Row>
                        {/each}
                      </Table.Body>
                    </Table.Root>
                  </div>
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
                  <Plus class="h-4 w-4 mr-2"/>
                  Add Action
                </Button>
              </div>
            </Collapsible.Content>
          </div>
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


