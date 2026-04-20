import { getContext, onMount, setContext } from 'svelte';
import { neuzosBridge } from '$lib/core';

const QUEST_PANEL_CONTEXT_KEY = Symbol('questPanel');
const STORAGE_KEY = 'questPanel';

export const RECOMMENDATION_CATEGORIES = [
  'Mandatory',
  'Prioritize',
  'On the go',
  'Wait',
  'Skip',
  'Special',
] as const;

export type RecommendationCategory = (typeof RECOMMENDATION_CATEGORIES)[number];

function defaultRecommendationFilters(): Record<string, boolean> {
  return {
    'Mandatory': true,
    'Prioritize': true,
    'On the go': true,
    'Wait': true,
    'Skip': false,
    'Special': false,
  };
}

export type FlyffClassName = 'Mercenary' | 'Assist' | 'Magician' | 'Acrobat';

interface CharacterState {
  id: string;
  name: string;
  flyffClass: FlyffClassName | null;
  level: number | null;
  completedQuests: string[];
  hiddenQuests: string[];
  expandedQuestlines: string[];
}

interface PersistedState {
  characters: CharacterState[];
  activeCharacterId: string | null;
  recommendationFilters: Record<string, boolean>;
  levelAppropriateOnly: boolean;
  fwcFilterEnabled: boolean;
}

function createDefaultCharacter(name: string, flyffClass: FlyffClassName | null = null): CharacterState {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    flyffClass,
    level: null,
    completedQuests: [],
    hiddenQuests: [],
    expandedQuestlines: [],
  };
}

function loadPersistedState(): PersistedState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const characters: CharacterState[] = Array.isArray(parsed.characters)
        ? parsed.characters.map((c: any) => ({
            id: c.id ?? Date.now().toString(36),
            name: c.name ?? 'Character',
            flyffClass: c.flyffClass ?? null,
            level: c.level ?? null,
            completedQuests: Array.isArray(c.completedQuests) ? c.completedQuests : [],
            hiddenQuests: Array.isArray(c.hiddenQuests) ? c.hiddenQuests : [],
            expandedQuestlines: Array.isArray(c.expandedQuestlines) ? c.expandedQuestlines : [],
          }))
        : [];

      // Migrate old format: if no characters but old level/hiddenQuests exist, create one
      if (characters.length === 0 && (parsed.level != null || Array.isArray(parsed.hiddenQuests))) {
        const migrated = createDefaultCharacter('Character 1');
        migrated.level = parsed.level ?? null;
        migrated.hiddenQuests = Array.isArray(parsed.hiddenQuests) ? parsed.hiddenQuests : [];
        characters.push(migrated);
      }

      return {
        characters,
        activeCharacterId: parsed.activeCharacterId ?? characters[0]?.id ?? null,
        recommendationFilters: { ...defaultRecommendationFilters(), ...(parsed.recommendationFilters ?? {}) },
        levelAppropriateOnly: parsed.levelAppropriateOnly ?? false,
        fwcFilterEnabled: parsed.fwcFilterEnabled ?? false,
      };
    }
  } catch (e) {
    console.warn('[QuestPanel] Failed to load persisted state:', e);
  }
  return {
    characters: [],
    activeCharacterId: null,
    recommendationFilters: defaultRecommendationFilters(),
    levelAppropriateOnly: false,
    fwcFilterEnabled: false,
  };
}

export interface QuestPanelContext {
  readonly isOpen: boolean;
  readonly sidebarSide: 'left' | 'right';
  readonly characters: CharacterState[];
  readonly activeCharacterId: string | null;
  readonly flyffClass: FlyffClassName | null;
  readonly level: number | null;
  readonly expandedQuestlines: string[];
  readonly hiddenQuestKeys: string[];
  readonly completedQuestKeys: string[];
  readonly recommendationFilters: Record<string, boolean>;
  readonly levelAppropriateOnly: boolean;
  readonly fwcFilterEnabled: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  setSidebarSide: (side: 'left' | 'right') => void;
  // Character management
  addCharacter: (name: string, flyffClass: FlyffClassName) => void;
  removeCharacter: (id: string) => void;
  renameCharacter: (id: string, name: string) => void;
  setCharacterClass: (id: string, flyffClass: FlyffClassName) => void;
  setActiveCharacter: (id: string) => void;
  // Level (active character)
  setLevel: (level: number) => void;
  adjustLevel: (delta: number) => void;
  // Questline collapse (active character)
  toggleQuestline: (questline: string) => void;
  isQuestlineCollapsed: (questline: string) => boolean;
  // Office quest hide (active character)
  hideQuest: (key: string) => void;
  showQuest: (key: string) => void;
  isQuestHidden: (key: string) => boolean;
  // Quest completion (active character)
  completeQuest: (key: string) => void;
  uncompleteQuest: (key: string) => void;
  isQuestCompleted: (key: string) => boolean;
  // Filters (global)
  setRecommendationFilter: (category: string, enabled: boolean) => void;
  setLevelAppropriateOnly: (enabled: boolean) => void;
  setFwcFilterEnabled: (enabled: boolean) => void;
}

export function createQuestPanelContext(): QuestPanelContext {
  const persisted = loadPersistedState();

  let isOpen = $state(false);
  let sidebarSide = $state<'left' | 'right'>('left');
  let characters = $state<CharacterState[]>(persisted.characters.map(c => ({ ...c })));
  let activeCharacterId = $state<string | null>(persisted.activeCharacterId);
  let recommendationFilters = $state<Record<string, boolean>>({ ...persisted.recommendationFilters });
  let levelAppropriateOnly = $state(persisted.levelAppropriateOnly);
  let fwcFilterEnabled = $state(persisted.fwcFilterEnabled);

  onMount(() => {
    neuzosBridge.sidebarPanel.getSide()
      .then((side) => {
        sidebarSide = side;
      })
      .catch((error) => {
        console.warn('[QuestPanel] Failed to load sidebar side from config:', error);
      });
  });

  // Derived index for the active character -- we use a getter pattern to avoid $derived proxy issues
  function getActiveChar(): CharacterState | null {
    if (!activeCharacterId) return null;
    for (let i = 0; i < characters.length; i++) {
      if (characters[i].id === activeCharacterId) return characters[i];
    }
    return null;
  }

  function save() {
    try {
      const plain = {
        characters: characters.map(c => ({
          id: c.id,
          name: c.name,
          flyffClass: c.flyffClass,
          level: c.level,
          completedQuests: [...c.completedQuests],
          hiddenQuests: [...c.hiddenQuests],
          expandedQuestlines: [...c.expandedQuestlines],
        })),
        activeCharacterId,
        recommendationFilters: { ...recommendationFilters },
        levelAppropriateOnly,
        fwcFilterEnabled,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plain));
    } catch (e) {
      console.error('[QuestPanel] Failed to persist state:', e);
    }
  }

  function touchCharacters() {
    characters = [...characters];
  }

  function withActiveChar(fn: (c: CharacterState) => void, persist = true) {
    const c = getActiveChar();
    if (!c) return;
    fn(c);
    touchCharacters();
    if (persist) save();
  }

  return {
    get isOpen() { return isOpen; },
    get sidebarSide() { return sidebarSide; },
    get characters() { return characters; },
    get activeCharacterId() { return activeCharacterId; },
    get flyffClass() { return getActiveChar()?.flyffClass ?? null; },
    get level() { return getActiveChar()?.level ?? null; },
    get expandedQuestlines() { return getActiveChar()?.expandedQuestlines ?? []; },
    get hiddenQuestKeys() { return getActiveChar()?.hiddenQuests ?? []; },
    get completedQuestKeys() { return getActiveChar()?.completedQuests ?? []; },
    get recommendationFilters() { return recommendationFilters; },
    get levelAppropriateOnly() { return levelAppropriateOnly; },
    get fwcFilterEnabled() { return fwcFilterEnabled; },

    toggle() {
      isOpen = !isOpen;
    },
    open() { isOpen = true; },
    close() { isOpen = false; },
    setSidebarSide(side: 'left' | 'right') {
      sidebarSide = side;
      neuzosBridge.sidebarPanel.setSide(side);
    },

    // -- Character management --
    addCharacter(name: string, flyffClass: FlyffClassName) {
      const char = createDefaultCharacter(name, flyffClass);
      characters = [...characters, char];
      activeCharacterId = char.id;
      save();
    },

    removeCharacter(id: string) {
      characters = characters.filter(c => c.id !== id);
      if (activeCharacterId === id) {
        activeCharacterId = characters.length > 0 ? characters[0].id : null;
      }
      save();
    },

    renameCharacter(id: string, name: string) {
      const c = characters.find(ch => ch.id === id);
      if (!c) return;
      c.name = name;
      touchCharacters();
      save();
    },

    setCharacterClass(id: string, flyffClass: FlyffClassName) {
      const c = characters.find(ch => ch.id === id);
      if (!c) return;
      c.flyffClass = flyffClass;
      touchCharacters();
      save();
    },

    setActiveCharacter(id: string) {
      activeCharacterId = id;
    },

    // -- Level --
    setLevel(l: number) {
      withActiveChar(c => { c.level = Math.max(1, Math.min(300, l)); });
    },

    adjustLevel(delta: number) {
      withActiveChar(c => { c.level = Math.max(1, Math.min(300, (c.level ?? 1) + delta)); });
    },

    // -- Questline collapse --
    toggleQuestline(questline: string) {
      withActiveChar(c => {
        c.expandedQuestlines = c.expandedQuestlines.includes(questline)
          ? c.expandedQuestlines.filter(q => q !== questline)
          : [...c.expandedQuestlines, questline];
      }, false);
    },

    isQuestlineCollapsed(questline: string): boolean {
      return !(getActiveChar()?.expandedQuestlines.includes(questline) ?? false);
    },

    // -- Office quest hide --
    hideQuest(key: string) {
      withActiveChar(c => {
        if (!c.hiddenQuests.includes(key)) c.hiddenQuests = [...c.hiddenQuests, key];
      });
    },

    showQuest(key: string) {
      withActiveChar(c => { c.hiddenQuests = c.hiddenQuests.filter(k => k !== key); });
    },

    isQuestHidden(key: string): boolean {
      return getActiveChar()?.hiddenQuests.includes(key) ?? false;
    },

    // -- Quest completion --
    completeQuest(key: string) {
      withActiveChar(c => {
        if (!c.completedQuests.includes(key)) c.completedQuests = [...c.completedQuests, key];
      });
    },

    uncompleteQuest(key: string) {
      withActiveChar(c => { c.completedQuests = c.completedQuests.filter(k => k !== key); });
    },

    isQuestCompleted(key: string): boolean {
      return getActiveChar()?.completedQuests.includes(key) ?? false;
    },

    // -- Filters (global) --
    setRecommendationFilter(category: string, enabled: boolean) {
      recommendationFilters = { ...recommendationFilters, [category]: enabled };
      save();
    },

    setLevelAppropriateOnly(enabled: boolean) {
      levelAppropriateOnly = enabled;
      save();
    },

    setFwcFilterEnabled(enabled: boolean) {
      fwcFilterEnabled = enabled;
      save();
    },
  };
}

export function setQuestPanelContext(context: QuestPanelContext) {
  setContext(QUEST_PANEL_CONTEXT_KEY, context);
}

export function getQuestPanelContext(): QuestPanelContext {
  return getContext<QuestPanelContext>(QUEST_PANEL_CONTEXT_KEY);
}
