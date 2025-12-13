<script lang="ts">
  import FloatingWindow from '../../../Shared/FloatingWindow.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { StickyNote, Plus, X, Edit2, Check, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import * as Tabs from '$lib/components/ui/tabs';

  interface NotepadFile {
    id: string;
    name: string;
    content: string;
  }

  interface Props {
    visible?: boolean;
    onClose?: () => void;
    onHide?: () => void;
    data?: any;
  }

  let { visible = true, onClose, onHide, data: _data }: Props = $props();
  let windowRef: FloatingWindow;

  const WIDGET_IDENTIFIER = 'widget.builtin.notepad';
  const STORAGE_KEY = WIDGET_IDENTIFIER;

  // Load files from localStorage
  function loadFiles(): NotepadFile[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.files || [];
      }
    } catch (e) {
      console.error('Failed to load notepad files:', e);
    }
    return [{ id: '1', name: 'Untitled', content: '' }];
  }

  // Save files to localStorage
  function saveFiles() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ files: files }));
    } catch (e) {
      console.error('Failed to save notepad files:', e);
    }
  }

  let files = $state<NotepadFile[]>(loadFiles());
  let activeFileId = $state<string>(files[0]?.id || '1');
  let editingFileId = $state<string | null>(null);
  let editingFileName = $state<string>('');
  let tabsListRef: HTMLDivElement;

  const activeFile = $derived(files.find(f => f.id === activeFileId));

  function scrollTabs(direction: 'left' | 'right') {
    if (tabsListRef) {
      const scrollAmount = 200;
      tabsListRef.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }

  function createNewFile() {
    const newId = Date.now().toString();
    const newFile: NotepadFile = {
      id: newId,
      name: 'Untitled',
      content: ''
    };
    files = [...files, newFile];
    activeFileId = newId;
    saveFiles();
  }

  function deleteFile(id: string) {
    if (files.length === 1) return; // Keep at least one file

    files = files.filter(f => f.id !== id);

    // If we deleted the active file, switch to the first available
    if (activeFileId === id) {
      activeFileId = files[0].id;
    }

    saveFiles();
  }

  function startEditingName(id: string, currentName: string) {
    editingFileId = id;
    editingFileName = currentName;
  }

  function finishEditingName() {
    if (editingFileId && editingFileName.trim()) {
      files = files.map(f =>
        f.id === editingFileId ? { ...f, name: editingFileName.trim() } : f
      );
      saveFiles();
    }
    editingFileId = null;
    editingFileName = '';
  }

  function cancelEditingName() {
    editingFileId = null;
    editingFileName = '';
  }

  function updateContent(content: string) {
    files = files.map(f =>
      f.id === activeFileId ? { ...f, content } : f
    );
    saveFiles();
  }

  export function reset() {
    windowRef?.reset();
  }
</script>

<div style="display: {visible ? 'block' : 'none'};">
  <FloatingWindow
    bind:this={windowRef}
    persistId={WIDGET_IDENTIFIER}
    defaultX={300}
    defaultY={200}
    defaultWidth={600}
    defaultHeight={450}
    minWidth={400}
    minHeight={300}
    onClose={onClose}
    onHide={onHide}
  >
    {#snippet titleSnippet()}
      <div class="flex items-center gap-2">
        <StickyNote size={16} />
        <span>Notepad - {activeFile?.name || 'Untitled'}</span>
      </div>
    {/snippet}

    <div class="flex flex-col h-full -m-3">
      <Tabs.Root value={activeFileId} onValueChange={(val) => activeFileId = val || activeFileId} class="flex flex-col h-full">
        <!-- Tabs List with Add Button -->
        <div class="flex items-center border-b border-border bg-muted/30 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            class="h-9 w-9 shrink-0"
            onclick={() => scrollTabs('left')}
            title="Scroll Left"
          >
            <ChevronLeft class="h-4 w-4" />
          </Button>

          <div bind:this={tabsListRef} class="flex-1 overflow-x-auto scrollbar-hide">
            <Tabs.List class="justify-start rounded-none bg-transparent h-auto p-0">
              {#each files as file (file.id)}
              <Tabs.Trigger
                value={file.id}
                class="relative group rounded-none data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary px-3 py-2 text-sm shrink-0"
              >
                {#if editingFileId === file.id}
                  <div class="flex items-center gap-1" onclick={(e) => e.stopPropagation()}>
                    <Input
                      value={editingFileName}
                      oninput={(e) => editingFileName = e.currentTarget.value}
                      onkeydown={(e) => {
                        if (e.key === 'Enter') finishEditingName();
                        if (e.key === 'Escape') cancelEditingName();
                      }}
                      class="h-6 w-24 px-2 text-xs"
                      autofocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      class="h-5 w-5"
                      onclick={finishEditingName}
                    >
                      <Check class="h-3 w-3" />
                    </Button>
                  </div>
                {:else}
                  <div class="flex items-center gap-2">
                    <span class="max-w-[120px] truncate">{file.name}</span>
                    <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        class="h-5 w-5"
                        onclick={(e) => {
                          e.stopPropagation();
                          startEditingName(file.id, file.name);
                        }}
                        title="Rename"
                      >
                        <Edit2 class="h-3 w-3" />
                      </Button>
                      {#if files.length > 1}
                        <Button
                          size="icon"
                          variant="ghost"
                          class="h-5 w-5 hover:bg-destructive hover:text-destructive-foreground"
                          onclick={(e) => {
                            e.stopPropagation();
                            deleteFile(file.id);
                          }}
                          title="Delete"
                        >
                          <X class="h-3 w-3" />
                        </Button>
                      {/if}
                    </div>
                  </div>
                {/if}
              </Tabs.Trigger>
              {/each}
            </Tabs.List>
          </div>

          <Button
            size="icon"
            variant="ghost"
            class="h-9 w-9 shrink-0"
            onclick={() => scrollTabs('right')}
            title="Scroll Right"
          >
            <ChevronRight class="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            class="h-9 w-9 shrink-0"
            onclick={createNewFile}
            title="New File"
          >
            <Plus class="h-4 w-4" />
          </Button>
        </div>

        <!-- Tab Content -->
        {#each files as file (file.id)}
          <Tabs.Content value={file.id} class="flex-1 p-0 m-0 data-[state=inactive]:hidden overflow-hidden">
            {#if activeFile?.id === file.id}
              <Textarea
                value={activeFile.content}
                oninput={(e) => updateContent(e.currentTarget.value)}
                placeholder="Start typing..."
                class="w-full h-full resize-none font-mono text-sm border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 p-3"
              />
            {/if}
          </Tabs.Content>
        {/each}
      </Tabs.Root>
    </div>
  </FloatingWindow>
</div>

