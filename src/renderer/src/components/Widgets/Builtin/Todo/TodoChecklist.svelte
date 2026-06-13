<script lang="ts">
  import { ChevronDown, ChevronRight, Plus, GripVertical, Check, Trash2, Pencil, ListTodo, RotateCcw } from '@lucide/svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import * as ContextMenu from '$lib/components/ui/context-menu';
  import { getTodoContext, type Subtask, type TodoItem } from '$lib/contexts/todoContext.svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { tick } from 'svelte';

  const todoCtx = getTodoContext();

  let collapsedListIds = $state<Set<string>>(new Set());
  let newTodoTextByList = $state<Record<string, string>>({});
  let addingTodoForList = $state<string | null>(null);
  let addingSubtaskFor = $state<string | null>(null);
  let newSubtaskText = $state('');
  let editingListId = $state<string | null>(null);
  let editingListName = $state('');
  let editingTodoId = $state<string | null>(null);
  let editingTodoText = $state('');
  let editingSubtaskId = $state<string | null>(null);
  let editingSubtaskText = $state('');
  let editingListInput: HTMLInputElement | null = $state(null);
  let editingTodoInput: HTMLInputElement | null = $state(null);
  let editingSubtaskInput: HTMLInputElement | null = $state(null);
  let addItemInput: HTMLInputElement | null = $state(null);
  let noticeInput: HTMLInputElement | null = $state(null);
  let dndItemsByList = $state<Record<string, TodoItem[]>>({});
  let dndSubtasksByTodo = $state<Record<string, Subtask[]>>({});
  let viewMode = $state<'open' | 'done' | 'trash'>('open');

  function getNewTodoText(listId: string): string {
    return newTodoTextByList[listId] ?? '';
  }

  function setNewTodoText(listId: string, value: string) {
    newTodoTextByList = {...newTodoTextByList, [listId]: value};
  }

  function clearNewTodoText(listId: string) {
    const {[listId]: _removed, ...rest} = newTodoTextByList;
    newTodoTextByList = rest;
  }

  function addTodoToList(listId: string) {
    todoCtx.setActiveList(listId);
    todoCtx.addTodo(getNewTodoText(listId));
    clearNewTodoText(listId);
  }

  function addMultipleTodosToList(listId: string, text: string) {
    todoCtx.setActiveList(listId);
    todoCtx.addMultipleTodos(text);
    clearNewTodoText(listId);
  }

  function handleKeydown(e: KeyboardEvent, listId: string) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTodoToList(listId);
    }
    if (e.key === 'Escape') {
      clearNewTodoText(listId);
      addingTodoForList = null;
    }
  }

  function handlePaste(e: ClipboardEvent, listId: string) {
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (text.includes('\n') || text.includes('\r')) {
      e.preventDefault();
      addMultipleTodosToList(listId, text);
      addingTodoForList = null;
    }
  }

  async function startAddingTodo(listId: string) {
    addingTodoForList = listId;
    await tick();
    addItemInput?.focus();
  }

  function handleAddItemBlur(listId: string) {
    if (getNewTodoText(listId).trim()) {
      addTodoToList(listId);
    } else {
      clearNewTodoText(listId);
    }
    addingTodoForList = null;
  }

  function handleSubtaskKeydown(e: KeyboardEvent, todoId: string) {
    if (e.key === 'Enter') {
      e.preventDefault();
      todoCtx.addSubtask(todoId, newSubtaskText);
      newSubtaskText = '';
    }
    if (e.key === 'Escape') {
      addingSubtaskFor = null;
      newSubtaskText = '';
    }
  }

  function handleSubitemBlur(todoId: string) {
    const trimmed = newSubtaskText.trim();
    if (trimmed) {
      todoCtx.addSubtask(todoId, trimmed);
    }
    newSubtaskText = '';
    addingSubtaskFor = null;
  }

  function handleNoticePaste(e: ClipboardEvent, todoId: string) {
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (text.includes('\n') || text.includes('\r')) {
      e.preventDefault();
      todoCtx.addMultipleSubtasks(todoId, text);
      newSubtaskText = '';
      addingSubtaskFor = null;
    }
  }

  async function startAddingSubtask(todoId: string) {
    addingSubtaskFor = todoId;
    newSubtaskText = '';
    await tick();
    noticeInput?.focus();
  }

  function toggleList(listId: string) {
    const next = new Set(collapsedListIds);
    if (next.has(listId)) {
      next.delete(listId);
    } else {
      next.add(listId);
    }
    collapsedListIds = next;
  }

  function isListCollapsed(listId: string): boolean {
    return collapsedListIds.has(listId);
  }

  function startRenamingList(listId: string, name: string) {
    editingListId = listId;
    editingListName = name;
  }

  function submitListRename() {
    if (!editingListId) return;
    todoCtx.renameList(editingListId, editingListName);
    editingListId = null;
    editingListName = '';
  }

  function handleListRenameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitListRename();
    }
    if (e.key === 'Escape') {
      editingListId = null;
      editingListName = '';
    }
  }

  async function startRenamingTodo(listId: string, todo: TodoItem) {
    todoCtx.setActiveList(listId);
    editingTodoId = todo.id;
    editingTodoText = todo.text;
    await tick();
    editingTodoInput?.focus();
    editingTodoInput?.select();
  }

  function submitTodoRename(listId: string) {
    if (!editingTodoId) return;
    todoCtx.setActiveList(listId);
    todoCtx.renameTodo(editingTodoId, editingTodoText);
    editingTodoId = null;
    editingTodoText = '';
  }

  function handleTodoRenameKeydown(e: KeyboardEvent, listId: string) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitTodoRename(listId);
    }
    if (e.key === 'Escape') {
      editingTodoId = null;
      editingTodoText = '';
    }
  }

  async function startRenamingSubtask(listId: string, todoId: string, subtaskId: string, text: string) {
    todoCtx.setActiveList(listId);
    editingSubtaskId = subtaskId;
    editingSubtaskText = text;
    await tick();
    editingSubtaskInput?.focus();
    editingSubtaskInput?.select();
  }

  function submitSubtaskRename(listId: string, todoId: string) {
    if (!editingSubtaskId) return;
    todoCtx.setActiveList(listId);
    todoCtx.renameSubtask(todoId, editingSubtaskId, editingSubtaskText);
    editingSubtaskId = null;
    editingSubtaskText = '';
  }

  function handleSubtaskRenameKeydown(e: KeyboardEvent, listId: string, todoId: string) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitSubtaskRename(listId, todoId);
    }
    if (e.key === 'Escape') {
      editingSubtaskId = null;
      editingSubtaskText = '';
    }
  }

  async function addList() {
    const id = todoCtx.addList();
    collapsedListIds = new Set([...collapsedListIds].filter((listId) => listId !== id));
    editingListId = id;
    editingListName = '';
    await tick();
    editingListInput?.focus();
  }

  function getVisibleTodos(listId: string, todos: TodoItem[]): TodoItem[] {
    return dndItemsByList[listId] ?? todos;
  }

  function getVisibleSubtasks(todoId: string, subtasks: Subtask[]): Subtask[] {
    return dndSubtasksByTodo[todoId] ?? subtasks;
  }

  const doneItems = $derived(todoCtx.doneItems);

  function handleDndConsider(e: CustomEvent<{ items: TodoItem[] }>, listId: string) {
    dndItemsByList = {...dndItemsByList, [listId]: e.detail.items};
  }

  function handleDndFinalize(e: CustomEvent<{ items: TodoItem[] }>, listId: string) {
    todoCtx.setActiveList(listId);
    const newOrder = e.detail.items;
    for (let i = 0; i < newOrder.length; i++) {
      const origIdx = todoCtx.lists.find(list => list.id === listId)?.todos.findIndex(t => t.id === newOrder[i].id) ?? -1;
      if (origIdx !== i) {
        todoCtx.reorderTodos(origIdx, i);
        break;
      }
    }
    const {[listId]: _removed, ...rest} = dndItemsByList;
    dndItemsByList = rest;
  }

  function handleSubtaskDndConsider(e: CustomEvent<{ items: Subtask[] }>, todoId: string) {
    dndSubtasksByTodo = {...dndSubtasksByTodo, [todoId]: e.detail.items};
  }

  function handleSubtaskDndFinalize(e: CustomEvent<{ items: Subtask[] }>, listId: string, todo: TodoItem) {
    todoCtx.setActiveList(listId);
    const newOrder = e.detail.items;
    for (let i = 0; i < newOrder.length; i++) {
      const origIdx = todo.subtasks.findIndex((subtask) => subtask.id === newOrder[i].id);
      if (origIdx !== i) {
        todoCtx.reorderSubtasks(todo.id, origIdx, i);
        break;
      }
    }
    const {[todo.id]: _removed, ...rest} = dndSubtasksByTodo;
    dndSubtasksByTodo = rest;
  }

  function subtaskProgress(todo: TodoItem): { completed: number; total: number; percent: number } {
    const total = todo.subtasks.length;
    const completed = todo.subtasks.filter(s => s.completed).length;
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }
</script>

<div class="flex h-full min-h-0 flex-col">
  <div class="mb-2 flex items-center gap-1 rounded-md border border-border bg-background p-1">
    <Button
      size="sm"
      variant={viewMode === 'open' ? 'default' : 'ghost'}
      class="h-7 flex-1 px-2"
      onclick={() => viewMode = 'open'}
    >
      <ListTodo class="mr-1 h-3.5 w-3.5" />
      Open
    </Button>
    <Button
      size="sm"
      variant={viewMode === 'done' ? 'default' : 'ghost'}
      class="h-7 flex-1 px-2"
      onclick={() => viewMode = 'done'}
    >
      <Check class="mr-1 h-3.5 w-3.5" />
      Done
    </Button>
    <Button
      size="icon"
      variant={viewMode === 'trash' ? 'default' : 'ghost'}
      class="h-7 w-7"
      onclick={() => viewMode = 'trash'}
      title="Trash"
    >
      <Trash2 class="h-3.5 w-3.5" />
    </Button>
  </div>

  {#if viewMode === 'open'}
  {#if todoCtx.lists.length === 0}
    <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
      <ListTodo class="h-12 w-12 text-muted-foreground opacity-50" />
      <p class="text-sm text-muted-foreground">No Entries found!</p>
      <p class="text-xs text-muted-foreground">Add a New List to get started.</p>
    </div>
  {:else}
    <div class="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
      {#each todoCtx.lists as list (list.id)}
        {@const listCollapsed = isListCollapsed(list.id)}
        {@const visibleTodos = getVisibleTodos(list.id, list.todos)}
        <section class="rounded border border-border/70 px-2 py-1.5">
          <div class="group/list flex items-center gap-1">
            <button
              class="shrink-0 cursor-pointer hover:text-foreground text-muted-foreground transition-colors"
              onclick={() => toggleList(list.id)}
            >
              {#if listCollapsed}
                <ChevronRight class="size-3.5 text-muted-foreground" />
              {:else}
                <ChevronDown class="size-3.5 text-muted-foreground" />
              {/if}
            </button>

            {#if editingListId === list.id}
              <input
                bind:this={editingListInput}
                class="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
                bind:value={editingListName}
                placeholder="New List"
                onkeydown={handleListRenameKeydown}
              />
              <button class="rounded p-1 hover:bg-accent" onclick={submitListRename} title="Save List Name">
                <Check class="size-3.5" />
              </button>
            {:else}
              <button
                class="min-w-0 flex-1 truncate text-left text-xs font-semibold"
                onclick={() => toggleList(list.id)}
                title={list.name}
              >
                {list.name}
              </button>
              <button class="rounded p-1 opacity-0 transition-opacity hover:bg-accent group-hover/list:opacity-100" onclick={() => startRenamingList(list.id, list.name)} title="Rename List">
                <Pencil class="size-3.5 text-muted-foreground" />
              </button>
              <button class="rounded p-1 opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover/list:opacity-100" onclick={() => todoCtx.removeList(list.id)} title="Delete List">
                <Trash2 class="size-3.5" />
              </button>
              {#if list.todos.length > 0}
                <Badge variant="secondary" class="ml-auto text-[10px] px-1.5 py-0 h-4">
                  {list.todos.length}
                </Badge>
              {/if}
            {/if}
          </div>

          {#if !listCollapsed}
            <div class="mt-1.5 space-y-0.5">
              {#if addingTodoForList === list.id}
                <div class="flex items-center gap-1 mb-1">
                  <input
                    bind:this={addItemInput}
                    type="text"
                    placeholder="Add New Item"
                    class="flex-1 bg-transparent border-b border-border text-xs outline-none py-0.5 placeholder:text-muted-foreground focus:border-muted-foreground transition-colors"
                    value={getNewTodoText(list.id)}
                    oninput={(e) => setNewTodoText(list.id, e.currentTarget.value)}
                    onkeydown={(e) => handleKeydown(e, list.id)}
                    onpaste={(e) => handlePaste(e, list.id)}
                    onblur={() => handleAddItemBlur(list.id)}
                  />
                </div>
              {:else}
                <button
                  class="mb-1 flex w-full items-center justify-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onclick={() => startAddingTodo(list.id)}
                  title="Add Item"
                >
                  <Plus class="size-3" />
                  Add Item
                </button>
              {/if}

              <div
                use:dndzone={{ items: visibleTodos, flipDurationMs: 200, type: `todos-${list.id}`, dragDisabled: false }}
                onconsider={(event) => handleDndConsider(event, list.id)}
                onfinalize={(event) => handleDndFinalize(event, list.id)}
                class="flex flex-col"
              >
                {#each visibleTodos as todo (todo.id)}
                  {@const progress = subtaskProgress(todo)}
                  {@const hasSubitems = todo.subtasks.length > 0}
                  {@const todoDone = todoCtx.isTodoDone(todo)}
                  {@const visibleSubtasks = getVisibleSubtasks(todo.id, todo.subtasks)}
                  <div>
                    <ContextMenu.Root>
                      <ContextMenu.Trigger class="w-full">
                        <div
                          class="flex items-center gap-1 px-0.5 py-0.5 rounded-sm group transition-colors hover:bg-accent/30 cursor-pointer"
                          role="button"
                          tabindex="0"
                          onclick={() => { todoCtx.setActiveList(list.id); todoCtx.toggleExpand(todo.id); }}
                          onkeydown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            todoCtx.setActiveList(list.id);
                            todoCtx.toggleExpand(todo.id);
                          }}
                        >
                          <div class="cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical class="size-3 text-muted-foreground" />
                          </div>

                          <button
                            class="shrink-0 cursor-pointer"
                            onclick={(e) => { e.stopPropagation(); todoCtx.setActiveList(list.id); todoCtx.toggleExpand(todo.id); }}
                          >
                            {#if todo.expanded}
                              <ChevronDown class="size-3 text-muted-foreground" />
                            {:else}
                              <ChevronRight class="size-3 text-muted-foreground" />
                            {/if}
                          </button>

                          <button
                            class="size-4 rounded border flex items-center justify-center shrink-0 transition-colors
                              {todoDone ? 'bg-green-500/20 border-green-500/50 text-green-400' : hasSubitems ? 'border-border opacity-60 cursor-default' : 'border-border hover:border-muted-foreground cursor-pointer'}"
                            onclick={(e) => {
                              e.stopPropagation();
                              if (hasSubitems) return;
                              todoCtx.setActiveList(list.id);
                              todoCtx.toggleTodo(todo.id);
                            }}
                            title={hasSubitems ? 'Complete all Subitems first.' : 'Mark Item Done'}
                          >
                            {#if todoDone}
                              <Check class="size-2.5" />
                            {/if}
                          </button>

                          <div class="flex items-center gap-1.5 flex-1 min-w-0">
                            {#if editingTodoId === todo.id}
                              <input
                                bind:this={editingTodoInput}
                                class="min-w-0 flex-1 rounded border border-border bg-background px-2 py-0.5 text-xs"
                                bind:value={editingTodoText}
                                onclick={(e) => e.stopPropagation()}
                                onkeydown={(e) => handleTodoRenameKeydown(e, list.id)}
                              />
                              <button
                                class="rounded p-1 hover:bg-accent"
                                onclick={(e) => { e.stopPropagation(); submitTodoRename(list.id); }}
                                title="Save Item Name"
                              >
                                <Check class="size-3.5" />
                              </button>
                            {:else}
                              <span
                                class="text-xs flex-1 truncate {todoDone ? 'line-through opacity-50' : ''}"
                                title={todo.text}
                              >
                                {todo.text}
                              </span>
                              <div class="flex min-w-[86px] shrink-0 items-center justify-end">
                                {#if todoDone}
                                  <div class="flex items-center gap-1 group-hover:hidden">
                                    {#if progress.total > 0}
                                      <span class="text-[10px] text-muted-foreground font-medium">
                                        {progress.completed}/{progress.total}
                                      </span>
                                      <div class="h-1 w-10 overflow-hidden rounded-full bg-muted">
                                        <div
                                          class="h-full bg-primary transition-all"
                                          style="width: {progress.percent}%"
                                        ></div>
                                      </div>
                                    {/if}
                                  </div>
                                  <div class="hidden items-center gap-1 group-hover:flex">
                                    <button
                                      class="rounded p-1 transition-colors hover:bg-accent"
                                      onclick={(e) => { e.stopPropagation(); startRenamingTodo(list.id, todo); }}
                                      title="Rename Item"
                                    >
                                      <Pencil class="size-3 text-muted-foreground" />
                                    </button>
                                    <button
                                      class="rounded p-1 transition-colors hover:bg-destructive hover:text-destructive-foreground"
                                      onclick={(e) => { e.stopPropagation(); todoCtx.setActiveList(list.id); todoCtx.removeTodo(todo.id); }}
                                      title="Delete Item"
                                    >
                                      <Trash2 class="size-3" />
                                    </button>
                                    <button
                                      class="rounded border border-green-500/50 bg-green-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-green-400 transition-colors hover:bg-green-500/20"
                                      onclick={(e) => {
                                        e.stopPropagation();
                                        todoCtx.moveTodoToDone(list.id, todo.id);
                                      }}
                                      title="Move to Done"
                                    >
                                      Done
                                    </button>
                                  </div>
                                {:else}
                                  <div class="flex items-center gap-1">
                                    <button
                                      class="rounded p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                                      onclick={(e) => { e.stopPropagation(); startRenamingTodo(list.id, todo); }}
                                      title="Rename Item"
                                    >
                                      <Pencil class="size-3 text-muted-foreground" />
                                    </button>
                                    <button
                                      class="rounded p-1 opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                                      onclick={(e) => { e.stopPropagation(); todoCtx.setActiveList(list.id); todoCtx.removeTodo(todo.id); }}
                                      title="Delete Item"
                                    >
                                      <Trash2 class="size-3" />
                                    </button>
                                  </div>
                                {/if}
                              </div>
                            {/if}
                            {#if progress.total > 0 && !todoDone}
                              <div class="flex items-center gap-1 shrink-0">
                                <span class="text-[10px] text-muted-foreground font-medium">
                                  {progress.completed}/{progress.total}
                                </span>
                                <div class="h-1 w-10 overflow-hidden rounded-full bg-muted">
                                  <div
                                    class="h-full bg-primary transition-all"
                                    style="width: {progress.percent}%"
                                  ></div>
                                </div>
                              </div>
                            {/if}
                          </div>
                        </div>
                      </ContextMenu.Trigger>
                      <ContextMenu.Content class="w-36">
                        <ContextMenu.Item onclick={() => startAddingSubtask(todo.id)}>
                          <Plus class="size-3 mr-2" />
                          Add Subitem
                        </ContextMenu.Item>
                        <ContextMenu.Item class="text-destructive" onclick={() => { todoCtx.setActiveList(list.id); todoCtx.removeTodo(todo.id); }}>
                          <Trash2 class="size-3 mr-2" />
                          Delete
                        </ContextMenu.Item>
                      </ContextMenu.Content>
                    </ContextMenu.Root>

                    {#if todo.expanded}
                      <div class="ml-7 pl-2 border-l border-border/50 space-y-0.5 pb-1">
                        <div
                          use:dndzone={{ items: visibleSubtasks, flipDurationMs: 200, type: `subtasks-${todo.id}`, dragDisabled: false }}
                          onconsider={(event) => handleSubtaskDndConsider(event, todo.id)}
                          onfinalize={(event) => handleSubtaskDndFinalize(event, list.id, todo)}
                          class="space-y-0.5"
                        >
                          {#each visibleSubtasks as subtask (subtask.id)}
                            <div class="flex items-center gap-1.5 px-1 py-0.5 rounded-sm group/sub hover:bg-accent/20">
                              <div class="cursor-grab active:cursor-grabbing shrink-0 opacity-0 transition-opacity group-hover/sub:opacity-100">
                                <GripVertical class="size-2.5 text-muted-foreground" />
                              </div>
                              <button
                                class="size-3.5 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors
                                  {subtask.completed ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'border-border hover:border-muted-foreground'}"
                                onclick={() => { todoCtx.setActiveList(list.id); todoCtx.toggleSubtask(todo.id, subtask.id); }}
                              >
                                {#if subtask.completed}
                                  <Check class="size-2" />
                                {/if}
                              </button>
                              {#if editingSubtaskId === subtask.id}
                                <input
                                  bind:this={editingSubtaskInput}
                                  class="min-w-0 flex-1 rounded border border-border bg-background px-2 py-0.5 text-xs"
                                  bind:value={editingSubtaskText}
                                  onkeydown={(e) => handleSubtaskRenameKeydown(e, list.id, todo.id)}
                                />
                                <button
                                  class="rounded p-1 hover:bg-accent"
                                  onclick={() => submitSubtaskRename(list.id, todo.id)}
                                  title="Save Subitem Name"
                                >
                                  <Check class="size-3" />
                                </button>
                              {:else}
                                <span
                                  class="text-xs flex-1 truncate {subtask.completed ? 'line-through opacity-50' : ''}"
                                  title={subtask.text}
                                >
                                  {subtask.text}
                                </span>
                                <button
                                  class="size-4 flex items-center justify-center rounded hover:bg-accent/50 opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0 cursor-pointer"
                                  onclick={() => startRenamingSubtask(list.id, todo.id, subtask.id, subtask.text)}
                                  title="Rename Subitem"
                                >
                                  <Pencil class="size-2.5 text-muted-foreground" />
                                </button>
                                <button
                                  class="size-4 flex items-center justify-center rounded hover:bg-accent/50 opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0 cursor-pointer"
                                  onclick={() => { todoCtx.setActiveList(list.id); todoCtx.removeSubtask(todo.id, subtask.id); }}
                                  title="Remove Subitem"
                                >
                                  <Trash2 class="size-2.5 text-muted-foreground" />
                                </button>
                              {/if}
                            </div>
                          {/each}
                        </div>

                        {#if addingSubtaskFor === todo.id}
                          <div class="flex items-center gap-1 px-1">
                            <input
                              bind:this={noticeInput}
                              type="text"
                              aria-label="Subitem"
                              class="flex-1 bg-transparent border-b border-border text-xs outline-none py-0.5 placeholder:text-muted-foreground focus:border-muted-foreground transition-colors"
                              bind:value={newSubtaskText}
                              onkeydown={(e) => { todoCtx.setActiveList(list.id); handleSubtaskKeydown(e, todo.id); }}
                              onpaste={(e) => { todoCtx.setActiveList(list.id); handleNoticePaste(e, todo.id); }}
                              onblur={() => handleSubitemBlur(todo.id)}
                              placeholder="Add Subitem..."
                            />
                          </div>
                        {:else}
                          <button
                            class="group flex items-center gap-1.5 px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                            onclick={() => startAddingSubtask(todo.id)}
                          >
                            <span class="flex size-3.5 items-center justify-center rounded border border-border transition-colors group-hover:border-muted-foreground">
                              <Plus class="size-2.5" />
                            </span>
                            Add Subitem
                          </button>
                        {/if}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </section>
      {/each}
    </div>
  {/if}

  <button
    class="mt-2 flex w-full items-center justify-center gap-1 rounded border border-border px-3 py-1.5 text-xs hover:bg-accent transition-colors"
    onclick={addList}
  >
    <Plus class="size-3" />
    Add New List
  </button>
  {:else if viewMode === 'done'}
    <div class="min-h-0 flex-1 overflow-auto pr-1">
      {#if doneItems.length === 0}
        <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <Check class="h-12 w-12 text-muted-foreground opacity-50" />
          <p class="text-sm text-muted-foreground">No Done Items found.</p>
        </div>
      {:else}
        <div class="space-y-1">
          {#each doneItems as item (item.id)}
            <div class="rounded border border-border/70 px-2 py-1.5">
              <div class="flex items-center gap-2">
                <Check class="size-3.5 text-green-400" />
                <span class="min-w-0 flex-1 truncate text-xs" title={item.text}>{item.text}</span>
                <span class="text-[10px] text-muted-foreground">{item.sourceListName ?? 'Open'}</span>
                <button
                  class="rounded p-1 transition-colors hover:bg-accent"
                  onclick={() => todoCtx.restoreDoneItem(item.id)}
                  title="Restore to Open"
                >
                  <RotateCcw class="size-3 text-muted-foreground" />
                </button>
                <button
                  class="rounded p-1 transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  onclick={() => todoCtx.moveDoneItemToTrash(item.id)}
                  title="Move to Trash"
                >
                  <Trash2 class="size-3" />
                </button>
              </div>
              {#if item.subtasks.length > 0}
                <div class="mt-1 ml-5 space-y-0.5">
                  {#each item.subtasks as subtask (subtask.id)}
                    <div class="flex items-center gap-1 text-xs text-muted-foreground">
                      <Check class="size-3 text-green-400" />
                      <span class="truncate">{subtask.text}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
    <button
      class="mt-2 flex w-full items-center justify-center gap-1 rounded border border-destructive px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:pointer-events-none disabled:opacity-50"
      onclick={() => todoCtx.deleteDoneItems()}
      disabled={doneItems.length === 0}
    >
      <Trash2 class="size-3" />
      Move All to Trash
    </button>
  {:else}
    <div class="min-h-0 flex-1 overflow-auto pr-1">
      {#if todoCtx.trashItems.length === 0}
        <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <Trash2 class="h-12 w-12 text-muted-foreground opacity-50" />
          <p class="text-sm text-muted-foreground">Trash is empty.</p>
        </div>
      {:else}
        <div class="space-y-1">
          {#each todoCtx.trashItems as item (item.id)}
            <div class="rounded border border-border/70 px-2 py-1.5">
              <div class="flex items-center gap-2">
                <Trash2 class="size-3.5 text-muted-foreground" />
                <span class="min-w-0 flex-1 truncate text-xs" title={item.text}>{item.text}</span>
                <button
                  class="rounded p-1 transition-colors hover:bg-accent"
                  onclick={() => todoCtx.restoreTrashItem(item.id)}
                  title="Restore to Done"
                >
                  <RotateCcw class="size-3 text-muted-foreground" />
                </button>
              </div>
              {#if item.subtasks.length > 0}
                <div class="mt-1 ml-5 space-y-0.5">
                  {#each item.subtasks as subtask (subtask.id)}
                    <div class="text-xs text-muted-foreground truncate">{subtask.text}</div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
    <button
      class="mt-2 flex w-full items-center justify-center gap-1 rounded border border-destructive px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:pointer-events-none disabled:opacity-50"
      onclick={() => todoCtx.clearTrash()}
      disabled={todoCtx.trashItems.length === 0}
    >
      <Trash2 class="size-3" />
      Delete All
    </button>
  {/if}
</div>
