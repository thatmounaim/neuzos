<script lang="ts">
  import { ChevronDown, ChevronRight, Plus, GripVertical, Check, Trash2 } from '@lucide/svelte';
  import { Badge } from '$lib/components/ui/badge';
  import * as ContextMenu from '$lib/components/ui/context-menu';
  import { getTodoContext, type TodoItem } from '$lib/contexts/todoContext.svelte';
  import { dndzone } from 'svelte-dnd-action';

  const todoCtx = getTodoContext();

  let collapsed = $state(false);
  let newTodoText = $state('');
  let addingSubtaskFor = $state<string | null>(null);
  let newSubtaskText = $state('');

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      todoCtx.addTodo(newTodoText);
      newTodoText = '';
    }
  }

  function handlePaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (text.includes('\n') || text.includes('\r')) {
      e.preventDefault();
      todoCtx.addMultipleTodos(text);
      newTodoText = '';
    }
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

  function submitSubtask(todoId: string) {
    todoCtx.addSubtask(todoId, newSubtaskText);
    newSubtaskText = '';
    addingSubtaskFor = null;
  }

  function startAddingSubtask(todoId: string) {
    addingSubtaskFor = todoId;
    newSubtaskText = '';
  }

  const pendingCount = $derived(todoCtx.todos.filter(t => !t.completed).length);
  const totalCount = $derived(todoCtx.todos.length);

  // dnd items need an `id` field - our TodoItem already has one
  let dndItems = $derived(todoCtx.todos.map(t => ({ ...t })));

  function handleDndConsider(e: CustomEvent<{ items: TodoItem[] }>) {
    dndItems = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent<{ items: TodoItem[] }>) {
    const newOrder = e.detail.items;
    // Reconcile by finding where items moved
    for (let i = 0; i < newOrder.length; i++) {
      const origIdx = todoCtx.todos.findIndex(t => t.id === newOrder[i].id);
      if (origIdx !== i) {
        todoCtx.reorderTodos(origIdx, i);
        break;
      }
    }
  }

  function subtaskProgress(todo: TodoItem): { completed: number; total: number; percent: number } {
    const total = todo.subtasks.length;
    const completed = todo.subtasks.filter(s => s.completed).length;
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }
</script>

<div class="border-b border-border">
  <button
    class="w-full flex items-center gap-1 px-3 py-2 text-left hover:bg-accent/50 transition-colors cursor-pointer"
    onclick={() => collapsed = !collapsed}
  >
    {#if collapsed}
      <ChevronRight class="size-3.5 text-muted-foreground" />
    {:else}
      <ChevronDown class="size-3.5 text-muted-foreground" />
    {/if}
    <span class="text-xs font-semibold">TODO</span>
    {#if totalCount > 0}
      <Badge variant="secondary" class="text-[10px] ml-auto px-1.5 py-0 h-4">
        {pendingCount}/{totalCount}
      </Badge>
    {/if}
  </button>

  {#if !collapsed}
    <div class="px-3 pb-2 space-y-0.5">
      <!-- Add todo input -->
      <div class="flex items-center gap-1 mb-1">
        <Plus class="size-3 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Add New Todo"
          class="flex-1 bg-transparent border-b border-border text-xs outline-none py-0.5 placeholder:text-muted-foreground focus:border-muted-foreground transition-colors"
          bind:value={newTodoText}
          onkeydown={handleKeydown}
          onpaste={handlePaste}
        />
      </div>

      <!-- Sortable todo list -->
      <div
        use:dndzone={{ items: dndItems, flipDurationMs: 200, type: 'todos', dragDisabled: false }}
        onconsider={handleDndConsider}
        onfinalize={handleDndFinalize}
        class="flex flex-col"
      >
        {#each dndItems as todo (todo.id)}
          {@const progress = subtaskProgress(todo)}
          <div>
            <ContextMenu.Root>
              <ContextMenu.Trigger class="w-full">
                <div
                  class="flex items-center gap-1 px-0.5 py-0.5 rounded-sm group transition-colors hover:bg-accent/30 cursor-pointer"
                  onclick={() => todoCtx.toggleExpand(todo.id)}
                >
                  <!-- Drag handle -->
                  <div class="cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical class="size-3 text-muted-foreground" />
                  </div>

                  <!-- Expand toggle -->
                  <button
                    class="shrink-0 cursor-pointer"
                    onclick={(e) => { e.stopPropagation(); todoCtx.toggleExpand(todo.id); }}
                  >
                    {#if todo.expanded}
                      <ChevronDown class="size-3 text-muted-foreground" />
                    {:else}
                      <ChevronRight class="size-3 text-muted-foreground" />
                    {/if}
                  </button>

                  <!-- Checkbox -->
                  <button
                    class="size-4 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors
                      {todo.completed ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'border-border hover:border-muted-foreground'}"
                    onclick={(e) => { e.stopPropagation(); todoCtx.toggleTodo(todo.id); }}
                  >
                    {#if todo.completed}
                      <Check class="size-2.5" />
                    {/if}
                  </button>

                  <!-- Title + progress -->
                  <div class="flex items-center gap-1.5 flex-1 min-w-0">
                    <span
                      class="text-xs flex-1 truncate {todo.completed ? 'line-through opacity-50' : ''}"
                      title={todo.text}
                    >
                      {todo.text}
                    </span>
                    {#if progress.total > 0}
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
                  Add subtask
                </ContextMenu.Item>
                <ContextMenu.Item class="text-destructive" onclick={() => todoCtx.removeTodo(todo.id)}>
                  <Trash2 class="size-3 mr-2" />
                  Delete
                </ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu.Root>

            <!-- Expanded subtasks -->
            {#if todo.expanded}
              <div class="ml-7 pl-2 border-l border-border/50 space-y-0.5 pb-1">
                {#each todo.subtasks as subtask (subtask.id)}
                  <div class="flex items-center gap-1.5 px-1 py-0.5 rounded-sm group/sub hover:bg-accent/20">
                    <button
                      class="size-3.5 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors
                        {subtask.completed ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'border-border hover:border-muted-foreground'}"
                      onclick={() => todoCtx.toggleSubtask(todo.id, subtask.id)}
                    >
                      {#if subtask.completed}
                        <Check class="size-2" />
                      {/if}
                    </button>
                    <span
                      class="text-xs flex-1 truncate {subtask.completed ? 'line-through opacity-50' : ''}"
                      title={subtask.text}
                    >
                      {subtask.text}
                    </span>
                    <button
                      class="size-4 flex items-center justify-center rounded hover:bg-accent/50 opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0 cursor-pointer"
                      onclick={() => todoCtx.removeSubtask(todo.id, subtask.id)}
                      title="Remove subtask"
                    >
                      <Trash2 class="size-2.5 text-muted-foreground" />
                    </button>
                  </div>
                {/each}

                <!-- Add subtask inline -->
                {#if addingSubtaskFor === todo.id}
                  <div class="flex items-center gap-1 px-1">
                    <input
                      type="text"
                      placeholder="Subtask title"
                      class="flex-1 bg-transparent border-b border-border text-xs outline-none py-0.5 placeholder:text-muted-foreground focus:border-muted-foreground transition-colors"
                      bind:value={newSubtaskText}
                      onkeydown={(e) => handleSubtaskKeydown(e, todo.id)}
                    />
                  </div>
                {:else}
                  <button
                    class="flex items-center gap-1 px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    onclick={() => startAddingSubtask(todo.id)}
                  >
                    <Plus class="size-2.5" />
                    Add subtask
                  </button>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
