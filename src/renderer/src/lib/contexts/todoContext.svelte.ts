import { getContext, setContext } from 'svelte';
import {readTodoState, writeTodoState} from '$lib/localStorageStores';

const TODO_CONTEXT_KEY = Symbol('todoChecklist');

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

export interface TodoList {
  id: string;
  name: string;
  todos: TodoItem[];
}

export interface ArchivedTodoItem extends TodoItem {
  sourceListId?: string;
  sourceListName?: string;
}

interface PersistedState {
  lists: TodoList[];
  activeListId: string | null;
  doneItems: ArchivedTodoItem[];
  trashItems: ArchivedTodoItem[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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

function parseArchivedTodos(parsed: any): ArchivedTodoItem[] {
  return parseTodos(parsed).map((todo, index) => {
    const source = Array.isArray(parsed.todos) ? parsed.todos[index] : null;
    return {
      ...todo,
      sourceListId: typeof source?.sourceListId === 'string' ? source.sourceListId : undefined,
      sourceListName: typeof source?.sourceListName === 'string' ? source.sourceListName : undefined,
    };
  });
}

function createList(name = 'To-Do', todos: TodoItem[] = []): TodoList {
  return {
    id: generateId(),
    name,
    todos,
  };
}

function createDefaultListName(lists: TodoList[], excludeId?: string): string {
  const names = new Set(lists.filter((list) => list.id !== excludeId).map((list) => list.name));
  if (!names.has('New List')) return 'New List';

  let index = 1;
  while (names.has(`New List (${index})`)) {
    index += 1;
  }
  return `New List (${index})`;
}

function cloneTodo(todo: TodoItem): TodoItem {
  return {
    ...todo,
    subtasks: todo.subtasks.map((subtask) => ({...subtask})),
  };
}

function cloneArchivedTodo(todo: ArchivedTodoItem): ArchivedTodoItem {
  return {
    ...cloneTodo(todo),
    sourceListId: todo.sourceListId,
    sourceListName: todo.sourceListName,
  };
}

function isTodoDone(todo: TodoItem): boolean {
  if (todo.subtasks.length === 0) {
    return todo.completed;
  }
  return todo.subtasks.every((subtask) => subtask.completed);
}

function loadPersistedState(characterId: string | null): PersistedState {
  try {
    const parsed = readTodoState(characterId);
    if (parsed) {
      if (Array.isArray(parsed.lists)) {
        const lists = parsed.lists.map((list: any) => ({
          id: list.id ?? generateId(),
          name: typeof list.name === 'string' && list.name.trim() ? list.name : 'To-Do',
          todos: parseTodos({todos: list.todos}),
        }));

        return {
          lists,
          activeListId: typeof parsed.activeListId === 'string' ? parsed.activeListId : lists[0]?.id ?? null,
          doneItems: parseArchivedTodos({todos: parsed.doneItems}),
          trashItems: parseArchivedTodos({todos: parsed.trashItems}),
        };
      }

      const todos = parseTodos(parsed);
      if (todos.length > 0) {
        const list = createList('To-Do', todos);
        return { lists: [list], activeListId: list.id, doneItems: [], trashItems: [] };
      }

      return { lists: [], activeListId: null, doneItems: [], trashItems: [] };
    }
  } catch (e) {
    console.warn('[TodoWidget] Failed to load persisted state:', e);
  }
  const defaultList = createList();
  return { lists: [defaultList], activeListId: defaultList.id, doneItems: [], trashItems: [] };
}

export interface TodoContext {
  readonly lists: TodoList[];
  readonly activeListId: string | null;
  readonly todos: TodoItem[];
  readonly doneItems: ArchivedTodoItem[];
  readonly trashItems: ArchivedTodoItem[];
  isTodoDone: (todo: TodoItem) => boolean;
  addList: () => string;
  removeList: (id: string) => void;
  renameList: (id: string, name: string) => void;
  setActiveList: (id: string) => void;
  addTodo: (text: string) => void;
  addMultipleTodos: (raw: string) => void;
  renameTodo: (id: string, text: string) => void;
  removeTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
  toggleExpand: (id: string) => void;
  addSubtask: (todoId: string, text: string) => void;
  addMultipleSubtasks: (todoId: string, raw: string) => void;
  renameSubtask: (todoId: string, subtaskId: string, text: string) => void;
  toggleSubtask: (todoId: string, subtaskId: string) => void;
  removeSubtask: (todoId: string, subtaskId: string) => void;
  reorderSubtasks: (todoId: string, fromIndex: number, toIndex: number) => void;
  reorderTodos: (fromIndex: number, toIndex: number) => void;
  moveTodoToDone: (listId: string, todoId: string) => void;
  restoreDoneItem: (id: string) => void;
  moveDoneItemToTrash: (id: string) => void;
  deleteDoneItems: () => void;
  restoreTrashItem: (id: string) => void;
  clearTrash: () => void;
  switchCharacter: (characterId: string | null) => void;
}

export function createTodoContext(): TodoContext {
  let currentCharacterId: string | null = null;
  const persisted = loadPersistedState(null);
  let lists = $state<TodoList[]>(
    persisted.lists.map((list) => ({
      ...list,
      todos: list.todos.map((t) => ({
        ...t,
        subtasks: t.subtasks.map((s) => ({ ...s })),
      })),
    }))
  );
  let activeListId = $state<string | null>(persisted.activeListId);
  let doneItems = $state<ArchivedTodoItem[]>(
    persisted.doneItems.map((t) => ({
      ...t,
      subtasks: t.subtasks.map((s) => ({ ...s })),
    }))
  );
  let trashItems = $state<ArchivedTodoItem[]>(
    persisted.trashItems.map((t) => ({
      ...t,
      subtasks: t.subtasks.map((s) => ({ ...s })),
    }))
  );

  function getActiveList(): TodoList | null {
    return lists.find((list) => list.id === activeListId) ?? lists[0] ?? null;
  }

  function updateActiveTodos(updater: (todos: TodoItem[]) => TodoItem[]) {
    const active = getActiveList();
    if (!active) return;

    lists = lists.map((list) =>
      list.id === active.id ? {...list, todos: updater(list.todos)} : list
    );
    activeListId = active.id;
    save();
  }

  function serializeTodos(): object {
    return {
      activeListId,
      doneItems: doneItems.map((t) => ({
        id: t.id,
        text: t.text,
        completed: t.completed,
        expanded: t.expanded,
        sourceListId: t.sourceListId,
        sourceListName: t.sourceListName,
        subtasks: t.subtasks.map((s) => ({
          id: s.id,
          text: s.text,
          completed: s.completed,
        })),
      })),
      trashItems: trashItems.map((t) => ({
        id: t.id,
        text: t.text,
        completed: t.completed,
        expanded: t.expanded,
        sourceListId: t.sourceListId,
        sourceListName: t.sourceListName,
        subtasks: t.subtasks.map((s) => ({
          id: s.id,
          text: s.text,
          completed: s.completed,
        })),
      })),
      lists: lists.map((list) => ({
        id: list.id,
        name: list.name,
        todos: list.todos.map((t) => ({
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
      })),
    };
  }

  function save() {
    try {
      writeTodoState(currentCharacterId, serializeTodos() as Record<string, unknown>);
    } catch (e) {
      console.error('[TodoWidget] Failed to persist state:', e);
    }
  }

  return {
    get lists() {
      return lists;
    },

    get activeListId() {
      return activeListId;
    },

    get todos() {
      return getActiveList()?.todos ?? [];
    },

    get doneItems() {
      return doneItems;
    },

    get trashItems() {
      return trashItems;
    },

    isTodoDone,

    addList() {
      const list = createList(createDefaultListName(lists));
      lists = [...lists, list];
      activeListId = list.id;
      save();
      return list.id;
    },

    removeList(id: string) {
      lists = lists.filter((list) => list.id !== id);
      if (activeListId === id) {
        activeListId = lists[0]?.id ?? null;
      }
      save();
    },

    renameList(id: string, name: string) {
      const trimmed = name.trim();
      const fallback = createDefaultListName(lists, id);
      lists = lists.map((list) => list.id === id ? {...list, name: trimmed || fallback} : list);
      save();
    },

    setActiveList(id: string) {
      if (!lists.some((list) => list.id === id)) return;
      activeListId = id;
      save();
    },

    addTodo(text: string) {
      const trimmed = text.trim();
      if (!trimmed) return;
      updateActiveTodos((todos) => [
          ...todos,
          { id: generateId(), text: trimmed, completed: false, subtasks: [], expanded: false },
        ]
      );
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
      updateActiveTodos((todos) => [...todos, ...newItems]);
    },

    renameTodo(id: string, text: string) {
      const trimmed = text.trim();
      if (!trimmed) return;
      updateActiveTodos((todos) => todos.map((todo) =>
        todo.id === id ? {...todo, text: trimmed} : todo
      ));
    },

    removeTodo(id: string) {
      updateActiveTodos((todos) => todos.filter((t) => t.id !== id));
    },

    toggleTodo(id: string) {
      const active = getActiveList();
      if (!active) return;
      const todos = active.todos.map((todo) =>
        todo.id === id && todo.subtasks.length === 0 ? {...todo, completed: !todo.completed} : todo
      );
      updateActiveTodos(() => todos);
    },

    toggleExpand(id: string) {
      const active = getActiveList();
      if (!active) return;
      const todos = active.todos.map((todo) =>
        todo.id === id ? {...todo, expanded: !todo.expanded} : todo
      );
      updateActiveTodos(() => todos);
    },

    addSubtask(todoId: string, text: string) {
      const trimmed = text.trim();
      if (!trimmed) return;
      const active = getActiveList();
      if (!active) return;
      const todos = active.todos.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              expanded: true,
              subtasks: [
                ...todo.subtasks,
                { id: generateId(), text: trimmed, completed: false },
              ],
            }
          : todo
      );
      updateActiveTodos(() => todos);
    },

    addMultipleSubtasks(todoId: string, raw: string) {
      const lines = raw
        .split(/[\r\n]+/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) return;
      const active = getActiveList();
      if (!active) return;
      const todos = active.todos.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              expanded: true,
              subtasks: [
                ...todo.subtasks,
                ...lines.map((line) => ({ id: generateId(), text: line, completed: false })),
              ],
            }
          : todo
      );
      updateActiveTodos(() => todos);
    },

    renameSubtask(todoId: string, subtaskId: string, text: string) {
      const trimmed = text.trim();
      if (!trimmed) return;
      const active = getActiveList();
      if (!active) return;
      const todos = active.todos.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              subtasks: todo.subtasks.map((subtask) =>
                subtask.id === subtaskId ? {...subtask, text: trimmed} : subtask
              ),
            }
          : todo
      );
      updateActiveTodos(() => todos);
    },

    toggleSubtask(todoId: string, subtaskId: string) {
      const active = getActiveList();
      if (!active) return;
      const todos = active.todos.map((todo) =>
        todo.id === todoId
          ? (() => {
              const subtasks = todo.subtasks.map((subtask) =>
                subtask.id === subtaskId ? {...subtask, completed: !subtask.completed} : subtask
              );
              return {
                ...todo,
                completed: subtasks.length > 0 && subtasks.every((subtask) => subtask.completed),
                subtasks,
              };
            })()
          : todo
      );
      updateActiveTodos(() => todos);
    },

    removeSubtask(todoId: string, subtaskId: string) {
      const active = getActiveList();
      if (!active) return;
      const todos = active.todos.map((todo) =>
        todo.id === todoId
          ? {...todo, subtasks: todo.subtasks.filter((subtask) => subtask.id !== subtaskId)}
          : todo
      );
      updateActiveTodos(() => todos);
    },

    reorderSubtasks(todoId: string, fromIndex: number, toIndex: number) {
      if (fromIndex === toIndex) return;
      const active = getActiveList();
      if (!active) return;
      const todos = active.todos.map((todo) => {
        if (todo.id !== todoId) return todo;
        const subtasks = [...todo.subtasks];
        const [moved] = subtasks.splice(fromIndex, 1);
        subtasks.splice(toIndex, 0, moved);
        return {...todo, subtasks};
      });
      updateActiveTodos(() => todos);
    },

    reorderTodos(fromIndex: number, toIndex: number) {
      if (fromIndex === toIndex) return;
      const active = getActiveList();
      if (!active) return;
      const updated = [...active.todos];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      updateActiveTodos(() => updated);
    },

    moveTodoToDone(listId: string, todoId: string) {
      const sourceList = lists.find((list) => list.id === listId);
      const todo = sourceList?.todos.find((item) => item.id === todoId);
      if (!sourceList || !todo || !isTodoDone(todo)) return;

      doneItems = [
        ...doneItems,
        {
          ...cloneTodo(todo),
          sourceListId: sourceList.id,
          sourceListName: sourceList.name,
        },
      ];
      lists = lists.map((list) =>
        list.id === listId
          ? {...list, todos: list.todos.filter((item) => item.id !== todoId)}
          : list
      );
      save();
    },

    restoreDoneItem(id: string) {
      const item = doneItems.find((todo) => todo.id === id);
      if (!item) return;

      const restored = cloneTodo(item);
      const targetListId = lists.some((list) => list.id === item.sourceListId)
        ? item.sourceListId
        : lists[0]?.id;

      if (targetListId) {
        lists = lists.map((list) =>
          list.id === targetListId ? {...list, todos: [...list.todos, restored]} : list
        );
        activeListId = targetListId;
      } else {
        const list = createList(item.sourceListName || 'New List', [restored]);
        lists = [list];
        activeListId = list.id;
      }

      doneItems = doneItems.filter((todo) => todo.id !== id);
      save();
    },

    moveDoneItemToTrash(id: string) {
      const item = doneItems.find((todo) => todo.id === id);
      if (!item) return;

      trashItems = [...trashItems, cloneArchivedTodo(item)];
      doneItems = doneItems.filter((todo) => todo.id !== id);
      save();
    },

    deleteDoneItems() {
      if (doneItems.length === 0) return;
      trashItems = [...trashItems, ...doneItems.map(cloneArchivedTodo)];
      doneItems = [];
      save();
    },

    restoreTrashItem(id: string) {
      const item = trashItems.find((todo) => todo.id === id);
      if (!item) return;

      doneItems = [...doneItems, cloneArchivedTodo(item)];
      trashItems = trashItems.filter((todo) => todo.id !== id);
      save();
    },

    clearTrash() {
      if (trashItems.length === 0) return;
      trashItems = [];
      save();
    },

    switchCharacter(characterId: string | null) {
      // Save current character's todos before switching
      if (currentCharacterId !== null) {
        save();
      }
      currentCharacterId = characterId;
      const loaded = loadPersistedState(characterId);
      lists = loaded.lists.map((list) => ({
        ...list,
        todos: list.todos.map((t) => ({
          ...t,
          subtasks: t.subtasks.map((s) => ({ ...s })),
        })),
      }));
      activeListId = loaded.activeListId;
      doneItems = loaded.doneItems.map((t) => ({
        ...t,
        subtasks: t.subtasks.map((s) => ({ ...s })),
      }));
      trashItems = loaded.trashItems.map((t) => ({
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
