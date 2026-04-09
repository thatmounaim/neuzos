import { getContext, setContext } from 'svelte';

const TODO_CONTEXT_KEY = Symbol('todoChecklist');
const STORAGE_KEY_PREFIX = 'todoChecklist';

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  subtasks: Subtask[];
  expanded: boolean;
}

interface PersistedState {
  todos: TodoItem[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function storageKeyFor(characterId: string | null): string {
  return characterId ? `${STORAGE_KEY_PREFIX}:${characterId}` : STORAGE_KEY_PREFIX;
}

function parseTodos(parsed: any): TodoItem[] {
  return Array.isArray(parsed.todos)
    ? parsed.todos.map((t: any) => ({
        id: t.id ?? generateId(),
        text: t.text ?? '',
        completed: !!t.completed,
        subtasks: Array.isArray(t.subtasks)
          ? t.subtasks.map((s: any) => ({
              id: s.id ?? generateId(),
              text: s.text ?? '',
              completed: !!s.completed,
            }))
          : [],
        expanded: !!t.expanded,
      }))
    : [];
}

function loadPersistedState(characterId: string | null): PersistedState {
  try {
    const key = storageKeyFor(characterId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return { todos: parseTodos(JSON.parse(stored)) };
    }
  } catch (e) {
    console.warn('[TodoChecklist] Failed to load persisted state:', e);
  }
  return { todos: [] };
}

export interface TodoContext {
  readonly todos: TodoItem[];
  addTodo: (text: string) => void;
  addMultipleTodos: (raw: string) => void;
  removeTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
  toggleExpand: (id: string) => void;
  addSubtask: (todoId: string, text: string) => void;
  toggleSubtask: (todoId: string, subtaskId: string) => void;
  removeSubtask: (todoId: string, subtaskId: string) => void;
  reorderTodos: (fromIndex: number, toIndex: number) => void;
  switchCharacter: (characterId: string | null) => void;
}

export function createTodoContext(): TodoContext {
  let currentCharacterId: string | null = null;
  const persisted = loadPersistedState(null);
  let todos = $state<TodoItem[]>(
    persisted.todos.map((t) => ({
      ...t,
      subtasks: t.subtasks.map((s) => ({ ...s })),
    }))
  );

  function serializeTodos(): object {
    return {
      todos: todos.map((t) => ({
        id: t.id,
        text: t.text,
        completed: t.completed,
        expanded: t.expanded,
        subtasks: t.subtasks.map((s) => ({
          id: s.id,
          text: s.text,
          completed: s.completed,
        })),
      })),
    };
  }

  function save() {
    try {
      const key = storageKeyFor(currentCharacterId);
      localStorage.setItem(key, JSON.stringify(serializeTodos()));
    } catch (e) {
      console.error('[TodoChecklist] Failed to persist state:', e);
    }
  }

  return {
    get todos() {
      return todos;
    },

    addTodo(text: string) {
      const trimmed = text.trim();
      if (!trimmed) return;
      todos = [
        ...todos,
        { id: generateId(), text: trimmed, completed: false, subtasks: [], expanded: false },
      ];
      save();
    },

    addMultipleTodos(raw: string) {
      const lines = raw
        .split(/[\r\n]+/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) return;
      const newItems: TodoItem[] = lines.map((l) => ({
        id: generateId(),
        text: l,
        completed: false,
        subtasks: [],
        expanded: false,
      }));
      todos = [...todos, ...newItems];
      save();
    },

    removeTodo(id: string) {
      todos = todos.filter((t) => t.id !== id);
      save();
    },

    toggleTodo(id: string) {
      const idx = todos.findIndex((t) => t.id === id);
      if (idx === -1) return;
      todos[idx].completed = !todos[idx].completed;
      todos = [...todos];
      save();
    },

    toggleExpand(id: string) {
      const idx = todos.findIndex((t) => t.id === id);
      if (idx === -1) return;
      todos[idx].expanded = !todos[idx].expanded;
      todos = [...todos];
      save();
    },

    addSubtask(todoId: string, text: string) {
      const trimmed = text.trim();
      if (!trimmed) return;
      const idx = todos.findIndex((t) => t.id === todoId);
      if (idx === -1) return;
      todos[idx].subtasks = [
        ...todos[idx].subtasks,
        { id: generateId(), text: trimmed, completed: false },
      ];
      todos[idx].expanded = true;
      todos = [...todos];
      save();
    },

    toggleSubtask(todoId: string, subtaskId: string) {
      const tIdx = todos.findIndex((t) => t.id === todoId);
      if (tIdx === -1) return;
      const sIdx = todos[tIdx].subtasks.findIndex((s) => s.id === subtaskId);
      if (sIdx === -1) return;
      todos[tIdx].subtasks[sIdx].completed = !todos[tIdx].subtasks[sIdx].completed;
      todos[tIdx].subtasks = [...todos[tIdx].subtasks];
      todos = [...todos];
      save();
    },

    removeSubtask(todoId: string, subtaskId: string) {
      const tIdx = todos.findIndex((t) => t.id === todoId);
      if (tIdx === -1) return;
      todos[tIdx].subtasks = todos[tIdx].subtasks.filter((s) => s.id !== subtaskId);
      todos = [...todos];
      save();
    },

    reorderTodos(fromIndex: number, toIndex: number) {
      if (fromIndex === toIndex) return;
      const updated = [...todos];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      todos = updated;
      save();
    },

    switchCharacter(characterId: string | null) {
      // Save current character's todos before switching
      if (currentCharacterId !== null) {
        save();
      }
      currentCharacterId = characterId;
      const loaded = loadPersistedState(characterId);
      todos = loaded.todos.map((t) => ({
        ...t,
        subtasks: t.subtasks.map((s) => ({ ...s })),
      }));
    },
  };
}

export function setTodoContext(context: TodoContext) {
  setContext(TODO_CONTEXT_KEY, context);
}

export function getTodoContext(): TodoContext {
  return getContext<TodoContext>(TODO_CONTEXT_KEY);
}
