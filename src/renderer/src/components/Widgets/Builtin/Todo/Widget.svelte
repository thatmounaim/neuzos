<script lang="ts">
  import FloatingWindow from '../../../Shared/FloatingWindow.svelte';
  import TodoChecklist from './TodoChecklist.svelte';
  import {getTodoContext} from '$lib/contexts/todoContext.svelte';
  import {ListTodo} from '@lucide/svelte';
  import {readTodoWindowState, writeTodoWindowState} from '$lib/localStorageStores';

  interface Props {
    visible?: boolean;
    onClose?: () => void;
    data?: any;
  }

  let {visible = true, onClose, data: _data}: Props = $props();

  const WIDGET_IDENTIFIER = 'widget.builtin.todo';
  const todoCtx = getTodoContext();

  function handleClose() {
    todoCtx.clearTrash();
    onClose?.();
  }
</script>

<div style="display: {visible ? 'block' : 'none'};">
  <FloatingWindow
    persistId={WIDGET_IDENTIFIER}
    loadPersistedState={readTodoWindowState}
    savePersistedState={writeTodoWindowState}
    defaultX={240}
    defaultY={180}
    defaultWidth={320}
    defaultHeight={420}
    minWidth={260}
    minHeight={180}
    onClose={handleClose}
    resizable={true}
  >
    {#snippet titleSnippet()}
      <div class="flex items-center gap-2">
        <ListTodo size={16} />
        <span>To-Do</span>
      </div>
    {/snippet}

    <TodoChecklist />
  </FloatingWindow>
</div>
