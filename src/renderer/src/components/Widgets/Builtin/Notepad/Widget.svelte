<script lang="ts">
  import FloatingWindow from '../../../Shared/FloatingWindow.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import {
    StickyNote,
    Plus,
    X,
    Edit2,
    Check,
    ChevronLeft,
    ChevronRight,
    Bold,
    Italic,
    Underline,
    Heading,
    List,
    Code,
    NotebookPen,
    Eye
  } from '@lucide/svelte';
  import * as Tabs from '$lib/components/ui/tabs';

  interface NotepadFile {
    id: string;
    name: string;
    content: string;
  }

  interface TodoItem {
    id: string;
    text: string;
    checked: boolean;
  }

  interface TextBlock {
    id: string;
    type: 'text';
    content: string;
  }

  interface TodoBlock {
    id: string;
    type: 'todo';
    title: string;
    items: TodoItem[];
  }

  interface TextSelectionState {
    blockId: string;
    start: number;
    end: number;
  }

  type EditorMode = 'wysiwyg' | 'raw' | 'preview';

  type MarkdownBlock =
    | { type: 'heading'; level: number; text: string }
    | { type: 'unordered-list'; items: string[] }
    | { type: 'ordered-list'; items: string[] }
    | { type: 'blockquote'; text: string }
    | { type: 'horizontal-rule' }
    | { type: 'code'; language: string; content: string }
    | { type: 'paragraph'; text: string };

  type InlineToken =
    | { type: 'text'; value: string }
    | { type: 'bolditalic'; value: string }
    | { type: 'bold'; value: string }
    | { type: 'italic'; value: string }
    | { type: 'strikethrough'; value: string }
    | { type: 'underline'; value: string }
    | { type: 'code'; value: string }
    | { type: 'link'; value: string; href: string };

  interface TextTransformResult {
    content: string;
    start?: number;
    end?: number;
  }

  type NotepadBlock = TextBlock | TodoBlock;

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
  const TODO_START_MARKER = '$startTodo';
  const TODO_END_MARKER = '$endTodo';

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

  function createId(prefix: string): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function createTextBlock(content = ''): TextBlock {
    return {
      id: createId('text-block'),
      type: 'text',
      content
    };
  }

  function createTodoBlock(items?: TodoItem[], title = 'Todo'): TodoBlock {
    return {
      id: createId('todo-block'),
      type: 'todo',
      title,
      items: items ?? [
        {
          id: createId('todo-item'),
          text: 'New todo item',
          checked: false
        }
      ]
    };
  }

  function parseTodoLine(line: string): TodoItem | null {
    const match = line.match(/^(.*?)\s*\$\[(checked|unchecked)]\s*$/);
    if (!match) return null;

    const text = match[1].trim();
    if (!text) return null;

    return {
      id: createId('todo-item'),
      text,
      checked: match[2] === 'checked'
    };
  }

  function parseTodoTitleLine(line: string): string | null {
    const match = line.trim().match(/^#\s+(.+)$/);
    if (!match) return null;

    const title = match[1].trim();
    return title.length > 0 ? title : null;
  }

  function parseContentToBlocks(content: string): NotepadBlock[] {
    const lines = content.split('\n');
    const blocks: NotepadBlock[] = [];
    let textLines: string[] = [];
    let todoItems: TodoItem[] = [];
    let todoTitle = 'Todo';
    let todoLineIndex = 0;
    let inTodo = false;

    function pushTextBlock(force = false) {
      const text = textLines.join('\n');
      if (force || text.length > 0 || blocks.length === 0) {
        blocks.push(createTextBlock(text));
      }
      textLines = [];
    }

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine === TODO_START_MARKER && !inTodo) {
        pushTextBlock(blocks.length === 0);
        inTodo = true;
        todoItems = [];
        todoTitle = 'Todo';
        todoLineIndex = 0;
        continue;
      }

      if (trimmedLine === TODO_END_MARKER && inTodo) {
        blocks.push(createTodoBlock(todoItems, todoTitle));
        inTodo = false;
        todoItems = [];
        todoTitle = 'Todo';
        todoLineIndex = 0;
        continue;
      }

      if (inTodo) {
        if (todoLineIndex === 0) {
          const parsedTitle = parseTodoTitleLine(line);
          if (parsedTitle) {
            todoTitle = parsedTitle;
          }
          todoLineIndex += 1;
          continue;
        }

        const parsedItem = parseTodoLine(line);
        if (parsedItem) {
          todoItems.push(parsedItem);
        }
        todoLineIndex += 1;
        continue;
      }

      textLines.push(line);
    }

    if (inTodo) {
      blocks.push(createTodoBlock(todoItems, todoTitle));
    }

    if (textLines.length > 0 || blocks.length === 0) {
      pushTextBlock(true);
    }

    return normalizeBlocks(blocks);
  }

  function normalizeBlocks(blocks: NotepadBlock[]): NotepadBlock[] {
    const normalized: NotepadBlock[] = [];

    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      if (block.type === 'text') {
        // Keep text blocks stable while typing; merging here can replace the active editable node.
        normalized.push({ ...block });
        continue;
      }

      normalized.push({ ...block, title: block.title || 'Todo', items: [...block.items] });

      // Always keep an editable area below todo blocks for seamless continuation.
      const nextBlock = blocks[index + 1];
      if (!nextBlock || nextBlock.type !== 'text') {
        normalized.push(createTextBlock(''));
      }
    }

    return normalized.length > 0 ? normalized : [createTextBlock('')];
  }

  function serializeBlocks(blocks: NotepadBlock[]): string {
    const sections: string[] = [];

    for (const block of blocks) {
      if (block.type === 'text') {
        // Drop visual anchor-only text blocks from persisted content.
        if (block.content.trim().length === 0) continue;
        sections.push(block.content);
        continue;
      }

      const todoLines = block.items
        .map(item => {
          const text = item.text.trim();
          if (!text) return '';
          return `${text} $[${item.checked ? 'checked' : 'unchecked'}]`;
        })
        .filter(Boolean);

      const titleLine = `# ${(block.title || 'Todo').trim() || 'Todo'}`;
      sections.push([TODO_START_MARKER, titleLine, ...todoLines, TODO_END_MARKER].join('\n'));
    }

    return sections.join('\n');
  }

  function hydrateBlocks(filesToHydrate: NotepadFile[]): Record<string, NotepadBlock[]> {
    const hydrated: Record<string, NotepadBlock[]> = {};
    for (const file of filesToHydrate) {
      hydrated[file.id] = parseContentToBlocks(file.content);
    }
    return hydrated;
  }

  const initialFiles = loadFiles();
  let files = $state<NotepadFile[]>(initialFiles);
  let activeFileId = $state<string>(initialFiles[0]?.id || '1');
  let blocksByFile = $state<Record<string, NotepadBlock[]>>(hydrateBlocks(initialFiles));
  let textSelectionByFile = $state<Record<string, TextSelectionState | null>>({});
  let editorModeByFile = $state<Record<string, EditorMode>>({});
  let lastEditModeByFile = $state<Record<string, 'wysiwyg' | 'raw'>>({});
  let editingFileId = $state<string | null>(null);
  let editingFileName = $state<string>('');
  let tabsListRef: HTMLDivElement;
  let rawEditorRef: HTMLDivElement | null = null;
  let textEditorRefs = $state<Record<string, HTMLDivElement | null>>({});
  let previewTodoCollapsedByFile = $state<Record<string, Record<string, boolean>>>({});

  function normalizeEditableText(content: string | null | undefined): string {
    return (content ?? '').replace(/\u00a0/g, ' ');
  }

  function getEditableValue(node: HTMLElement): string {
    // innerText keeps visual line breaks generated by contenteditable (div/br based lines).
    let value = normalizeEditableText(node.innerText).replace(/\r\n?/g, '\n');
    // Browsers often append one trailing newline for contenteditable blocks.
    if (value.endsWith('\n')) {
      value = value.slice(0, -1);
    }
    return value;
  }

  function mergeTextContent(previous: string, next: string): string {
    if (!previous) return next;
    if (!next) return previous;
    if (previous.endsWith('\n') || next.startsWith('\n')) {
      return `${previous}${next}`;
    }
    return `${previous}\n${next}`;
  }

  function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function parseMarkdownBlocks(content: string): MarkdownBlock[] {
    const lines = content.split('\n');
    const blocks: MarkdownBlock[] = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed) {
        index += 1;
        continue;
      }

      const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
        index += 1;
        continue;
      }

      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        blocks.push({ type: 'horizontal-rule' });
        index += 1;
        continue;
      }

      const codeFence = trimmed.match(/^(```|~~~)\s*(.*)$/);
      if (codeFence) {
        const codeLines: string[] = [];
        const fence = codeFence[1];
        const language = codeFence[2]?.trim() ?? '';
        index += 1;
        while (index < lines.length && !lines[index].trim().startsWith(fence)) {
          codeLines.push(lines[index]);
          index += 1;
        }
        if (index < lines.length) index += 1;
        blocks.push({ type: 'code', language, content: codeLines.join('\n') });
        continue;
      }

      if (/^>\s?/.test(trimmed)) {
        const quoteLines: string[] = [];
        while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
          quoteLines.push(lines[index].replace(/^\s*>\s?/, ''));
          index += 1;
        }
        blocks.push({ type: 'blockquote', text: quoteLines.join('\n') });
        continue;
      }

      if (/^[-*+]\s+/.test(trimmed)) {
        const items: string[] = [];
        while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
          items.push(lines[index].replace(/^\s*[-*+]\s+/, ''));
          index += 1;
        }
        blocks.push({ type: 'unordered-list', items });
        continue;
      }

      if (/^\d+\.\s+/.test(trimmed)) {
        const items: string[] = [];
        while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
          items.push(lines[index].replace(/^\s*\d+\.\s+/, ''));
          index += 1;
        }
        blocks.push({ type: 'ordered-list', items });
        continue;
      }

      const paragraphLines: string[] = [];
      while (index < lines.length && lines[index].trim()) {
        if (/^(#{1,6})\s+/.test(lines[index].trim())) break;
        if (/^(```|~~~)/.test(lines[index].trim())) break;
        if (/^\s*[-*+]\s+/.test(lines[index])) break;
        if (/^\s*\d+\.\s+/.test(lines[index])) break;
        if (/^\s*>\s?/.test(lines[index])) break;
        if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[index])) break;
        paragraphLines.push(lines[index]);
        index += 1;
      }

      if (paragraphLines.length > 0) {
        blocks.push({ type: 'paragraph', text: paragraphLines.join('\n') });
      }
    }

    return blocks;
  }

  function parseInlineTokens(text: string): InlineToken[] {
    const tokens: InlineToken[] = [];
    let index = 0;

    function pushText(value: string) {
      if (!value) return;
      const previous = tokens[tokens.length - 1];
      if (previous?.type === 'text') {
        previous.value += value;
      } else {
        tokens.push({ type: 'text', value });
      }
    }

    while (index < text.length) {
      if (text[index] === '\\' && index + 1 < text.length) {
        pushText(text[index + 1]);
        index += 2;
        continue;
      }

      if (text.startsWith('```', index)) {
        // Triple backticks are block-level markdown; keep them as text in inline parser.
        pushText('```');
        index += 3;
        continue;
      }

      if (text[index] === '[') {
        const closeLabel = text.indexOf(']', index + 1);
        if (closeLabel > index + 1 && text[closeLabel + 1] === '(') {
          const closeUrl = text.indexOf(')', closeLabel + 2);
          if (closeUrl > closeLabel + 2) {
            const value = text.slice(index + 1, closeLabel);
            const href = text.slice(closeLabel + 2, closeUrl).trim();
            if (value && href) {
              tokens.push({ type: 'link', value, href });
              index = closeUrl + 1;
              continue;
            }
          }
        }
      }

      if (text[index] === '`') {
        const end = text.indexOf('`', index + 1);
        if (end > index + 1) {
          tokens.push({ type: 'code', value: text.slice(index + 1, end) });
          index = end + 1;
          continue;
        }
      }

      if (text.startsWith('***', index)) {
        const end = text.indexOf('***', index + 3);
        if (end > index + 3) {
          tokens.push({ type: 'bolditalic', value: text.slice(index + 3, end) });
          index = end + 3;
          continue;
        }
      }

      if (text.startsWith('**', index)) {
        const end = text.indexOf('**', index + 2);
        if (end > index + 2) {
          tokens.push({ type: 'bold', value: text.slice(index + 2, end) });
          index = end + 2;
          continue;
        }
      }

      if (text.startsWith('__', index)) {
        const end = text.indexOf('__', index + 2);
        if (end > index + 2) {
          tokens.push({ type: 'underline', value: text.slice(index + 2, end) });
          index = end + 2;
          continue;
        }
      }

      if (text[index] === '*') {
        const end = text.indexOf('*', index + 1);
        if (end > index + 1) {
          tokens.push({ type: 'italic', value: text.slice(index + 1, end) });
          index = end + 1;
          continue;
        }
      }

      if (text.startsWith('~~', index)) {
        const end = text.indexOf('~~', index + 2);
        if (end > index + 2) {
          tokens.push({ type: 'strikethrough', value: text.slice(index + 2, end) });
          index = end + 2;
          continue;
        }
      }

      pushText(text[index]);
      index += 1;
    }

    return tokens.length > 0 ? tokens : [{ type: 'text', value: text }];
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(text: string): string {
    return escapeHtml(text).replace(/`/g, '&#96;');
  }

  function parseInlineToHtml(input: string): string {
    let result = '';
    let index = 0;

    while (index < input.length) {
      if (input[index] === '\\' && index + 1 < input.length) {
        result += escapeHtml(input[index + 1]);
        index += 2;
        continue;
      }

      if (input[index] === '[') {
        const closeLabel = input.indexOf(']', index + 1);
        if (closeLabel > index + 1 && input[closeLabel + 1] === '(') {
          const closeUrl = input.indexOf(')', closeLabel + 2);
          if (closeUrl > closeLabel + 2) {
            const label = input.slice(index + 1, closeLabel);
            const href = input.slice(closeLabel + 2, closeUrl).trim();
            if (href.length > 0) {
              result += `<a href="${escapeAttr(href)}" class="text-primary underline" target="_blank" rel="noreferrer">${parseInlineToHtml(label)}</a>`;
              index = closeUrl + 1;
              continue;
            }
          }
        }
      }

      if (input[index] === '`') {
        const end = input.indexOf('`', index + 1);
        if (end > index + 1) {
          result += `<code class="rounded bg-muted px-1">${escapeHtml(input.slice(index + 1, end))}</code>`;
          index = end + 1;
          continue;
        }
      }

      const markers: Array<{ marker: string; open: string; close: string }> = [
        { marker: '***', open: '<strong><em>', close: '</em></strong>' },
        { marker: '**', open: '<strong>', close: '</strong>' },
        { marker: '__', open: '<u>', close: '</u>' },
        { marker: '~~', open: '<s>', close: '</s>' },
        { marker: '*', open: '<em>', close: '</em>' }
      ];

      let matched = false;
      for (const rule of markers) {
        if (!input.startsWith(rule.marker, index)) continue;
        const end = input.indexOf(rule.marker, index + rule.marker.length);
        if (end <= index + rule.marker.length) continue;

        const inner = input.slice(index + rule.marker.length, end);
        result += `${rule.open}${parseInlineToHtml(inner)}${rule.close}`;
        index = end + rule.marker.length;
        matched = true;
        break;
      }

      if (matched) continue;

      result += escapeHtml(input[index]);
      index += 1;
    }

    return result;
  }

  function renderInlineMarkdown(text: string): string {
    return parseInlineToHtml(text);
  }

  function syncEditableContent(node: HTMLDivElement | null, content: string) {
    if (!node) return;
    const current = getEditableValue(node);
    if (current !== content) {
      node.textContent = content;
    }
  }

  function bindRawEditorNode(node: HTMLDivElement) {
    rawEditorRef = node;
    syncEditableContent(node, activeFile?.content ?? '');

    return {
      destroy() {
        if (rawEditorRef === node) {
          rawEditorRef = null;
        }
      }
    };
  }

  function bindTextEditorNode(node: HTMLDivElement, blockId: string) {
    textEditorRefs = { ...textEditorRefs, [blockId]: node };
    const block = activeBlocks.find(b => b.type === 'text' && b.id === blockId);
    syncEditableContent(node, block?.type === 'text' ? block.content : '');

    return {
      update(nextBlockId: string) {
        if (nextBlockId === blockId) return;
        const { [blockId]: _removed, ...remaining } = textEditorRefs;
        textEditorRefs = { ...remaining, [nextBlockId]: node };
        blockId = nextBlockId;
      },
      destroy() {
        const { [blockId]: _removed, ...remaining } = textEditorRefs;
        textEditorRefs = remaining;
      }
    };
  }

  function getSelectionOffsets(editable: HTMLElement): { start: number; end: number } | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!editable.contains(range.startContainer) || !editable.contains(range.endContainer)) {
      return null;
    }

    const startRange = document.createRange();
    startRange.selectNodeContents(editable);
    startRange.setEnd(range.startContainer, range.startOffset);

    const endRange = document.createRange();
    endRange.selectNodeContents(editable);
    endRange.setEnd(range.endContainer, range.endOffset);

    return {
      start: startRange.toString().length,
      end: endRange.toString().length
    };
  }

  function setSelectionOffsets(editable: HTMLElement, start: number, end: number) {
    const selection = window.getSelection();
    if (!selection) return;

    const clampedStart = Math.max(0, start);
    const clampedEnd = Math.max(clampedStart, end);
    const range = document.createRange();

    let currentOffset = 0;
    let startSet = false;
    let endSet = false;

    const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode() as Text | null;

    while (node) {
      const nodeLength = node.data.length;
      const nextOffset = currentOffset + nodeLength;

      if (!startSet && clampedStart <= nextOffset) {
        range.setStart(node, Math.max(0, clampedStart - currentOffset));
        startSet = true;
      }

      if (!endSet && clampedEnd <= nextOffset) {
        range.setEnd(node, Math.max(0, clampedEnd - currentOffset));
        endSet = true;
      }

      if (startSet && endSet) break;

      currentOffset = nextOffset;
      node = walker.nextNode() as Text | null;
    }

    if (!startSet || !endSet) {
      range.selectNodeContents(editable);
      range.collapse(false);
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }

  const activeFile = $derived(files.find(f => f.id === activeFileId));
  const activeBlocks = $derived(blocksByFile[activeFileId] ?? [createTextBlock('')]);
  const hasOnlyTextBlock = $derived(
    activeBlocks.length === 1 && activeBlocks[0]?.type === 'text'
  );
  const activeEditorMode = $derived(editorModeByFile[activeFileId] ?? 'preview');
  const isEditMode = $derived(activeEditorMode !== 'preview');

  $effect(() => {
    if (activeEditorMode !== 'raw' || !rawEditorRef) return;
    if (document.activeElement === rawEditorRef) return;
    syncEditableContent(rawEditorRef, activeFile?.content ?? '');
  });

  $effect(() => {
    if (activeEditorMode !== 'wysiwyg') return;

    for (const block of activeBlocks) {
      if (block.type !== 'text') continue;
      const node = textEditorRefs[block.id];
      if (!node || document.activeElement === node) continue;
      syncEditableContent(node, block.content);
    }
  });

  function ensureFileBlocks(fileId: string) {
    if (blocksByFile[fileId]) return;
    const file = files.find(f => f.id === fileId);
    blocksByFile = {
      ...blocksByFile,
      [fileId]: parseContentToBlocks(file?.content ?? '')
    };
    editorModeByFile = {
      ...editorModeByFile,
      [fileId]: editorModeByFile[fileId] ?? 'preview'
    };
    lastEditModeByFile = {
      ...lastEditModeByFile,
      [fileId]: lastEditModeByFile[fileId] ?? 'wysiwyg'
    };
  }

  function updateBlocksForFile(fileId: string, nextBlocks: NotepadBlock[]) {
    const normalizedBlocks = normalizeBlocks(nextBlocks);
    const serializedContent = serializeBlocks(normalizedBlocks);
    blocksByFile = { ...blocksByFile, [fileId]: normalizedBlocks };
    files = files.map(file =>
      file.id === fileId ? { ...file, content: serializedContent } : file
    );
    saveFiles();
  }

  function updateActiveBlocks(updater: (blocks: NotepadBlock[]) => NotepadBlock[]) {
    const currentBlocks = blocksByFile[activeFileId] ?? [createTextBlock('')];
    const nextBlocks = updater(currentBlocks);
    updateBlocksForFile(activeFileId, nextBlocks);
  }

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
    blocksByFile = { ...blocksByFile, [newId]: [createTextBlock('')] };
    editorModeByFile = { ...editorModeByFile, [newId]: 'preview' };
    lastEditModeByFile = { ...lastEditModeByFile, [newId]: 'wysiwyg' };
    activeFileId = newId;
    saveFiles();
  }

  function deleteFile(id: string) {
    if (files.length === 1) return; // Keep at least one file

    files = files.filter(f => f.id !== id);
    const { [id]: _removed, ...remaining } = blocksByFile;
    const { [id]: _removedMode, ...remainingModes } = editorModeByFile;
    const { [id]: _removedLastEdit, ...remainingLastEditModes } = lastEditModeByFile;
    blocksByFile = remaining;
    editorModeByFile = remainingModes;
    lastEditModeByFile = remainingLastEditModes;

    // If we deleted the active file, switch to the first available
    if (activeFileId === id) {
      activeFileId = files[0].id;
      ensureFileBlocks(activeFileId);
    }

    saveFiles();
  }

  function handleTabChange(value: string | undefined) {
    if (!value) return;
    activeFileId = value;
    ensureFileBlocks(value);
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

  function updateTextBlock(blockId: string, content: string) {
    updateActiveBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId && block.type === 'text' ? { ...block, content } : block
      )
    );
  }

  function updateRawContent(content: string) {
    const parsedBlocks = parseContentToBlocks(content);
    blocksByFile = {
      ...blocksByFile,
      [activeFileId]: parsedBlocks
    };
    files = files.map(file =>
      file.id === activeFileId ? { ...file, content } : file
    );
    saveFiles();
  }

  function updateTextSelection(blockId: string, editable: HTMLElement) {
    const offsets = getSelectionOffsets(editable);
    if (!offsets) return;

    textSelectionByFile = {
      ...textSelectionByFile,
      [activeFileId]: {
        blockId,
        start: offsets.start,
        end: offsets.end
      }
    };
  }

  function captureSelectionFromEditors(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);

    for (const [blockId, node] of Object.entries(textEditorRefs)) {
      if (!node) continue;
      if (!node.contains(range.startContainer) || !node.contains(range.endContainer)) continue;
      updateTextSelection(blockId, node);
      return true;
    }

    return false;
  }

  function runToolbarAction(action: () => void) {
    captureSelectionFromEditors();
    action();
    syncActiveEditorImmediately();
  }

  function syncActiveEditorImmediately() {
    const selectionState = textSelectionByFile[activeFileId];
    if (!selectionState) return;

    const node = textEditorRefs[selectionState.blockId];
    if (!node) return;

    const blocks = blocksByFile[activeFileId] ?? [];
    const block = blocks.find(
      (item): item is TextBlock => item.type === 'text' && item.id === selectionState.blockId
    );
    if (!block) return;

    syncEditableContent(node, block.content);
    setSelectionOffsets(node, selectionState.start, selectionState.end);
  }

  function getPreviewTodoCollapsed(blockId: string): boolean {
    return previewTodoCollapsedByFile[activeFileId]?.[blockId] ?? true;
  }

  function togglePreviewTodoCollapsed(blockId: string) {
    const fileState = previewTodoCollapsedByFile[activeFileId] ?? {};
    previewTodoCollapsedByFile = {
      ...previewTodoCollapsedByFile,
      [activeFileId]: {
        ...fileState,
        [blockId]: !(fileState[blockId] ?? true)
      }
    };
  }

  function insertTodoBlock(afterBlockId?: string) {
    updateActiveBlocks(blocks => {
      const selectionState = textSelectionByFile[activeFileId];
      const targetTextBlockId = selectionState?.blockId ?? afterBlockId;
      const targetIndex = targetTextBlockId
        ? blocks.findIndex(block => block.id === targetTextBlockId && block.type === 'text')
        : -1;

      if (targetIndex >= 0) {
        const targetBlock = blocks[targetIndex] as TextBlock;
        const fallbackCursor = targetBlock.content.length;
        const rawCursor =
          selectionState && selectionState.blockId === targetBlock.id
            ? selectionState.start
            : fallbackCursor;
        const cursor = Math.max(0, Math.min(rawCursor, targetBlock.content.length));
        const beforeText = targetBlock.content.slice(0, cursor);
        const afterText = targetBlock.content.slice(cursor);

        const replacement: NotepadBlock[] = [];
        if (beforeText.length > 0) {
          replacement.push(createTextBlock(beforeText));
        }
        replacement.push(createTodoBlock());
        if (afterText.length > 0 || targetIndex === blocks.length - 1) {
          replacement.push(createTextBlock(afterText));
        }

        return [...blocks.slice(0, targetIndex), ...replacement, ...blocks.slice(targetIndex + 1)];
      }

      const fallbackBlocks = [...blocks, createTodoBlock()];
      if (fallbackBlocks[fallbackBlocks.length - 2]?.type !== 'text') {
        fallbackBlocks.push(createTextBlock(''));
      }

      return fallbackBlocks;
    });
  }

  function setEditorMode(mode: EditorMode) {
    editorModeByFile = {
      ...editorModeByFile,
      [activeFileId]: mode
    };

    if (mode === 'wysiwyg' || mode === 'raw') {
      lastEditModeByFile = {
        ...lastEditModeByFile,
        [activeFileId]: mode
      };
    }
  }

  function setTopLevelMode(mode: 'preview' | 'edit') {
    if (mode === 'preview') {
      setEditorMode('preview');
      return;
    }

    setEditorMode(lastEditModeByFile[activeFileId] ?? 'wysiwyg');
  }

  function updateActiveTextBlock(
    transformer: (content: string, start: number, end: number) => TextTransformResult | string
  ) {
    updateActiveBlocks(blocks => {
      const selectionState = textSelectionByFile[activeFileId];
      const targetBlockId = selectionState?.blockId;
      const targetIndex = targetBlockId
        ? blocks.findIndex(block => block.id === targetBlockId && block.type === 'text')
        : blocks.findIndex(block => block.type === 'text');

      if (targetIndex < 0) return blocks;

      const targetBlock = blocks[targetIndex] as TextBlock;
      const start =
        selectionState?.blockId === targetBlock.id ? selectionState.start : targetBlock.content.length;
      const end =
        selectionState?.blockId === targetBlock.id ? selectionState.end : targetBlock.content.length;
      const transformResult = transformer(targetBlock.content, start, end);
      const resolvedResult =
        typeof transformResult === 'string'
          ? ({ content: transformResult, start, end } satisfies TextTransformResult)
          : transformResult;

      const nextStart = Math.max(0, Math.min(resolvedResult.start ?? start, resolvedResult.content.length));
      const nextEnd = Math.max(nextStart, Math.min(resolvedResult.end ?? nextStart, resolvedResult.content.length));

      textSelectionByFile = {
        ...textSelectionByFile,
        [activeFileId]: {
          blockId: targetBlock.id,
          start: nextStart,
          end: nextEnd
        }
      };

      return blocks.map((block, index) =>
        index === targetIndex && block.type === 'text'
          ? { ...block, content: resolvedResult.content }
          : block
      );
    });
  }

  function replaceSelection(content: string, start: number, end: number, replacement: string): TextTransformResult {
    const nextContent = `${content.slice(0, start)}${replacement}${content.slice(end)}`;
    const caret = start + replacement.length;
    return {
      content: nextContent,
      start: caret,
      end: caret
    };
  }

  function countCharBackward(content: string, index: number, char: string): number {
    let count = 0;
    let cursor = index - 1;
    while (cursor >= 0 && content[cursor] === char) {
      count += 1;
      cursor -= 1;
    }
    return count;
  }

  function countCharForward(content: string, index: number, char: string): number {
    let count = 0;
    let cursor = index;
    while (cursor < content.length && content[cursor] === char) {
      count += 1;
      cursor += 1;
    }
    return count;
  }

  interface InlineStyleState {
    underline: boolean;
    bold: boolean;
    italic: boolean;
  }

  interface InlineToggleContext {
    replaceStart: number;
    replaceEnd: number;
    text: string;
    styles: InlineStyleState;
  }

  function stylesFromStarCount(starCount: number, underline = false): InlineStyleState {
    const capped = Math.max(0, Math.min(3, starCount));
    return {
      underline,
      bold: capped >= 2,
      italic: capped % 2 === 1
    };
  }

  function starCountFromStyles(styles: InlineStyleState): number {
    if (styles.bold && styles.italic) return 3;
    if (styles.bold) return 2;
    if (styles.italic) return 1;
    return 0;
  }

  function buildWrappedText(text: string, styles: InlineStyleState): { wrapped: string; innerStart: number } {
    const stars = '*'.repeat(starCountFromStyles(styles));
    const left = `${styles.underline ? '__' : ''}${stars}`;
    const right = `${stars}${styles.underline ? '__' : ''}`;
    return {
      wrapped: `${left}${text}${right}`,
      innerStart: left.length
    };
  }

  function peelSelectedToken(text: string): { text: string; styles: InlineStyleState } {
    let value = text;
    let underline = false;
    let starCount = 0;
    let changed = true;

    while (changed) {
      changed = false;

      if (value.length >= 4 && value.startsWith('__') && value.endsWith('__')) {
        underline = true;
        value = value.slice(2, -2);
        changed = true;
        continue;
      }

      if (value.length >= 6 && value.startsWith('***') && value.endsWith('***')) {
        starCount = Math.min(3, starCount + 3);
        value = value.slice(3, -3);
        changed = true;
        continue;
      }

      if (value.length >= 4 && value.startsWith('**') && value.endsWith('**')) {
        starCount = Math.min(3, starCount + 2);
        value = value.slice(2, -2);
        changed = true;
        continue;
      }

      if (value.length >= 2 && value.startsWith('*') && value.endsWith('*')) {
        starCount = Math.min(3, starCount + 1);
        value = value.slice(1, -1);
        changed = true;
      }
    }

    return {
      text: value,
      styles: stylesFromStarCount(starCount, underline)
    };
  }

  function detectInlineToggleContext(content: string, start: number, end: number): InlineToggleContext {
    const selectedText = content.slice(start, end);
    const peeled = peelSelectedToken(selectedText);
    if (peeled.text !== selectedText) {
      return {
        replaceStart: start,
        replaceEnd: end,
        text: peeled.text,
        styles: peeled.styles
      };
    }

    const innerStars = Math.min(3, countCharBackward(content, start, '*'), countCharForward(content, end, '*'));
    const directUnderline =
      start >= 2 && end + 2 <= content.length &&
      content.slice(start - 2, start) === '__' &&
      content.slice(end, end + 2) === '__';

    const underlineAroundInnerStars =
      innerStars > 0 &&
      start - innerStars - 2 >= 0 &&
      end + innerStars + 2 <= content.length &&
      content.slice(start - innerStars - 2, start - innerStars) === '__' &&
      content.slice(end + innerStars, end + innerStars + 2) === '__';

    const outerStarsAroundDirectUnderline = directUnderline
      ? Math.min(
          3,
          countCharBackward(content, start - 2, '*'),
          countCharForward(content, end + 2, '*')
        )
      : 0;

    const stars = innerStars > 0 ? innerStars : outerStarsAroundDirectUnderline;
    const underline = directUnderline || underlineAroundInnerStars;

    const leftOffset = stars + (underline ? 2 : 0);
    const rightOffset = stars + (underline ? 2 : 0);

    if (leftOffset > 0 || rightOffset > 0) {
      return {
        replaceStart: Math.max(0, start - leftOffset),
        replaceEnd: Math.min(content.length, end + rightOffset),
        text: selectedText,
        styles: stylesFromStarCount(stars, underline)
      };
    }

    return {
      replaceStart: start,
      replaceEnd: end,
      text: selectedText,
      styles: { underline: false, bold: false, italic: false }
    };
  }

  function toggleInlineStyle(style: 'bold' | 'italic' | 'underline') {
    updateActiveTextBlock((content, start, end) => {
      if (start === end) {
        const marker = style === 'bold' ? '**' : style === 'italic' ? '*' : '__';
        const insertion = `${marker}${marker}`;
        return {
          content: `${content.slice(0, start)}${insertion}${content.slice(end)}`,
          start: start + marker.length,
          end: start + marker.length
        };
      }

      const context = detectInlineToggleContext(content, start, end);
      const nextStyles: InlineStyleState = {
        ...context.styles,
        [style]: !context.styles[style]
      };

      const { wrapped, innerStart } = buildWrappedText(context.text, nextStyles);
      const nextContent =
        content.slice(0, context.replaceStart) +
        wrapped +
        content.slice(context.replaceEnd);

      return {
        content: nextContent,
        start: context.replaceStart + innerStart,
        end: context.replaceStart + innerStart + context.text.length
      };
    });
  }

  function wrapSelection(prefix: string, suffix = prefix) {
    if (prefix === '**' && suffix === '**') {
      toggleInlineStyle('bold');
      return;
    }
    if (prefix === '*' && suffix === '*') {
      toggleInlineStyle('italic');
      return;
    }
    if (prefix === '__' && suffix === '__') {
      toggleInlineStyle('underline');
      return;
    }

    updateActiveTextBlock((content, start, end) => {
      if (start === end) {
        const insertion = `${prefix}${suffix}`;
        return {
          content: `${content.slice(0, start)}${insertion}${content.slice(end)}`,
          start: start + prefix.length,
          end: start + prefix.length
        };
      }

      const selected = content.slice(start, end);
      return {
        content: `${content.slice(0, start)}${prefix}${selected}${suffix}${content.slice(end)}`,
        start: start + prefix.length,
        end: end + prefix.length
      };
    });
  }

  function applyUnderline() {
    wrapSelection('__');
  }

  function toggleListMarker(marker: string) {
    updateActiveTextBlock((content, start, end) => {
      const from = Math.max(0, content.lastIndexOf('\n', Math.max(0, start - 1)) + 1);
      const toNewline = content.indexOf('\n', end);
      const to = toNewline === -1 ? content.length : toNewline;
      const segment = content.slice(from, to);
      const lines = segment.split('\n');
      const canUnmark = lines.every(line => line.trim().length === 0 || line.trimStart().startsWith(marker));
      const updated = lines
        .map(line => {
          if (line.trim().length === 0) return line;
          if (canUnmark) {
            const indent = line.match(/^\s*/)?.[0] ?? '';
            const rest = line.slice(indent.length).replace(new RegExp(`^${escapeRegExp(marker)}\\s*`), '');
            return `${indent}${rest}`;
          }

          const indent = line.match(/^\s*/)?.[0] ?? '';
          const rest = line.slice(indent.length);
          return `${indent}${marker} ${rest}`;
        })
        .join('\n');

      return {
        content: `${content.slice(0, from)}${updated}${content.slice(to)}`,
        start: from,
        end: from + updated.length
      };
    });
  }

  function applyHeading() {
    updateActiveTextBlock((content, start, end) => {
      const from = Math.max(0, content.lastIndexOf('\n', Math.max(0, start - 1)) + 1);
      const toNewline = content.indexOf('\n', end);
      const to = toNewline === -1 ? content.length : toNewline;
      const segment = content.slice(from, to);
      const lines = segment.split('\n');
      const canUnmark = lines.every(line => line.trim().length === 0 || /^\s*#\s+/.test(line));
      const updated = lines
        .map(line => {
          if (line.trim().length === 0) return line;
          const indent = line.match(/^\s*/)?.[0] ?? '';
          const stripped = line.slice(indent.length).replace(/^#{1,6}\s+/, '');
          return canUnmark ? `${indent}${stripped}` : `${indent}# ${stripped}`;
        })
        .join('\n');

      return {
        content: `${content.slice(0, from)}${updated}${content.slice(to)}`,
        start: from,
        end: from + updated.length
      };
    });
  }

  function applyBulletList() {
    toggleListMarker('-');
  }

  function handleListContinuation(blockId: string, editable: HTMLElement): boolean {
    const offsets = getSelectionOffsets(editable);
    if (!offsets || offsets.start !== offsets.end) return false;

    const blocks = blocksByFile[activeFileId] ?? [];
    const block = blocks.find((item): item is TextBlock => item.type === 'text' && item.id === blockId);
    if (!block) return false;

    const caret = offsets.start;
    const lineStart = Math.max(0, block.content.lastIndexOf('\n', Math.max(0, caret - 1)) + 1);
    const lineEndIndex = block.content.indexOf('\n', caret);
    const lineEnd = lineEndIndex === -1 ? block.content.length : lineEndIndex;
    const currentLine = block.content.slice(lineStart, lineEnd);

    const unorderedMatch = currentLine.match(/^(\s*[-*+]\s+)(.*)$/);
    if (unorderedMatch) {
      const replacement = unorderedMatch[2].trim().length === 0 ? '' : `\n${unorderedMatch[1]}`;
      updateTextBlock(blockId, replaceSelection(block.content, caret, caret, replacement).content);
      textSelectionByFile = {
        ...textSelectionByFile,
        [activeFileId]: { blockId, start: caret + replacement.length, end: caret + replacement.length }
      };
      syncActiveEditorImmediately();
      return true;
    }

    const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      const replacement =
        orderedMatch[3].trim().length === 0
          ? ''
          : `\n${orderedMatch[1]}${Number.parseInt(orderedMatch[2], 10) + 1}. `;
      updateTextBlock(blockId, replaceSelection(block.content, caret, caret, replacement).content);
      textSelectionByFile = {
        ...textSelectionByFile,
        [activeFileId]: { blockId, start: caret + replacement.length, end: caret + replacement.length }
      };
      syncActiveEditorImmediately();
      return true;
    }

    const quoteMatch = currentLine.match(/^(\s*>\s?)(.*)$/);
    if (quoteMatch) {
      const replacement = quoteMatch[2].trim().length === 0 ? '' : `\n${quoteMatch[1]}`;
      updateTextBlock(blockId, replaceSelection(block.content, caret, caret, replacement).content);
      textSelectionByFile = {
        ...textSelectionByFile,
        [activeFileId]: { blockId, start: caret + replacement.length, end: caret + replacement.length }
      };
      syncActiveEditorImmediately();
      return true;
    }

    return false;
  }

  function handleTextEditorKeydown(event: KeyboardEvent, blockId: string) {
    if (event.key === 'Enter' && handleListContinuation(blockId, event.currentTarget as HTMLElement)) {
      event.preventDefault();
    }
  }

  function removeTodoBlock(blockId: string) {
    updateActiveBlocks(blocks => {
      const filteredBlocks = blocks.filter(block => block.id !== blockId);

      const mergedBlocks: NotepadBlock[] = [];
      for (const block of filteredBlocks) {
        const previousBlock = mergedBlocks[mergedBlocks.length - 1];
        if (block.type === 'text' && previousBlock?.type === 'text') {
          previousBlock.content = mergeTextContent(previousBlock.content, block.content);
        } else {
          mergedBlocks.push(block);
        }
      }

      return mergedBlocks.length > 0 ? mergedBlocks : [createTextBlock('')];
    });
  }

  function toggleTodoItem(blockId: string, itemId: string) {
    updateActiveBlocks(blocks =>
      blocks.map(block => {
        if (block.id !== blockId || block.type !== 'todo') return block;
        return {
          ...block,
          items: block.items.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          )
        };
      })
    );
  }

  function updateTodoTitle(blockId: string, title: string) {
    updateActiveBlocks(blocks =>
      blocks.map(block => {
        if (block.id !== blockId || block.type !== 'todo') return block;
        return {
          ...block,
          title
        };
      })
    );
  }

  function updateTodoItemText(blockId: string, itemId: string, text: string) {
    updateActiveBlocks(blocks =>
      blocks.map(block => {
        if (block.id !== blockId || block.type !== 'todo') return block;
        return {
          ...block,
          items: block.items.map(item =>
            item.id === itemId ? { ...item, text } : item
          )
        };
      })
    );
  }

  function addTodoItem(blockId: string) {
    updateActiveBlocks(blocks =>
      blocks.map(block => {
        if (block.id !== blockId || block.type !== 'todo') return block;
        return {
          ...block,
          items: [
            ...block.items,
            {
              id: createId('todo-item'),
              text: '',
              checked: false
            }
          ]
        };
      })
    );
  }

  function removeTodoItem(blockId: string, itemId: string) {
    updateActiveBlocks(blocks =>
      blocks.map(block => {
        if (block.id !== blockId || block.type !== 'todo') return block;
        return {
          ...block,
          items: block.items.filter(item => item.id !== itemId)
        };
      })
    );
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
      <Tabs.Root value={activeFileId} onValueChange={handleTabChange} class="flex flex-col h-full">
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
                  <div class="flex items-center gap-1">
                    <Input
                      value={editingFileName}
                      onmousedown={(e) => e.stopPropagation()}
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
                      onmousedown={(e) => e.stopPropagation()}
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

        <div class="shrink-0 border-b border-border bg-muted/20 px-3 py-2 flex items-center justify-between gap-3">
          <div class="flex items-center gap-1 rounded-md border border-border bg-background p-1">
            <Button
              size="sm"
              variant={activeEditorMode === 'preview' ? 'default' : 'ghost'}
              class="h-7 px-2"
              onclick={() => setTopLevelMode('preview')}
            >
              <Eye class="h-3.5 w-3.5 mr-1" />
              Preview
            </Button>
            <Button
              size="sm"
              variant={isEditMode ? 'default' : 'ghost'}
              class="h-7 px-2"
              onclick={() => setTopLevelMode('edit')}
            >
              <NotebookPen class="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          </div>

          {#if activeEditorMode === 'wysiwyg'}
            <div class="flex items-center gap-1 rounded-md border border-border bg-background p-1">
              <Button size="icon" variant="ghost" class="h-7 w-7" onmousedown={(e) => e.preventDefault()} onclick={() => runToolbarAction(() => wrapSelection('**'))} title="Bold">
                <Bold class="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" class="h-7 w-7" onmousedown={(e) => e.preventDefault()} onclick={() => runToolbarAction(() => wrapSelection('*'))} title="Italic">
                <Italic class="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" class="h-7 w-7" onmousedown={(e) => e.preventDefault()} onclick={() => runToolbarAction(applyUnderline)} title="Underline">
                <Underline class="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" class="h-7 w-7" onmousedown={(e) => e.preventDefault()} onclick={() => runToolbarAction(applyHeading)} title="Heading">
                <Heading class="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" class="h-7 w-7" onmousedown={(e) => e.preventDefault()} onclick={() => runToolbarAction(applyBulletList)} title="List">
                <List class="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" class="h-7 w-7" onmousedown={(e) => e.preventDefault()} onclick={() => runToolbarAction(() => wrapSelection('`'))} title="Inline Code">
                <Code class="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="secondary" class="h-7 w-7" onmousedown={(e) => e.preventDefault()} onclick={() => runToolbarAction(() => insertTodoBlock())} title="Insert Todo Block">
                <Check class="h-3.5 w-3.5" />
              </Button>
            </div>
          {/if}
        </div>

        <div class="relative flex-1 overflow-auto p-3 space-y-3 bg-background/40">
          {#if isEditMode}
            <div class="absolute right-3 top-3 z-10">
              <Button
                size="sm"
                variant="outline"
                class="h-7 px-2"
                onclick={() => setEditorMode(activeEditorMode === 'raw' ? 'wysiwyg' : 'raw')}
                title="Toggle edit mode"
              >
                {activeEditorMode === 'raw' ? 'Raw' : 'Editor'}
              </Button>
            </div>
          {/if}

          {#if activeEditorMode === 'raw'}
            <div
              contenteditable="true"
              role="textbox"
              aria-multiline="true"
              tabindex="0"
              use:bindRawEditorNode
              data-placeholder="Write markdown and todo blocks directly..."
              class="editable-content w-full h-full overflow-auto rounded-md border border-border/60 bg-background p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              oninput={(e) => updateRawContent(getEditableValue(e.currentTarget))}
            ></div>
          {:else}
            {#each activeBlocks as block (block.id)}
              {#if block.type === 'text'}
                {#if activeEditorMode !== 'preview' || block.content.trim().length > 0}
                <div class={hasOnlyTextBlock ? 'h-full flex flex-col space-y-2' : 'space-y-1'}>


                  {#if activeEditorMode === 'wysiwyg'}
                    <div
                      contenteditable="true"
                      role="textbox"
                      aria-multiline="true"
                      tabindex="0"
                      use:bindTextEditorNode={block.id}
                      data-placeholder="Start typing..."
                      class={hasOnlyTextBlock
                        ? 'editable-content w-full h-full bg-transparent p-0 font-mono text-sm focus:outline-none'
                        : 'editable-content min-h-10 w-full bg-transparent p-0 font-mono text-sm focus:outline-none'}
                      onfocus={(e) => updateTextSelection(block.id, e.currentTarget)}
                      onclick={(e) => updateTextSelection(block.id, e.currentTarget)}
                      onmouseup={(e) => updateTextSelection(block.id, e.currentTarget)}
                      onselect={(e) => updateTextSelection(block.id, e.currentTarget)}
                      onkeyup={(e) => updateTextSelection(block.id, e.currentTarget)}
                      onkeydown={(e) => handleTextEditorKeydown(e, block.id)}
                      oninput={(e) => {
                        updateTextBlock(block.id, getEditableValue(e.currentTarget));
                        updateTextSelection(block.id, e.currentTarget);
                      }}
                    ></div>
                  {:else}
                    <div class="space-y-2 rounded-md border border-border/60 bg-background p-3 text-sm">
                      {#if block.content.trim().length > 0}
                        {#each parseMarkdownBlocks(block.content) as markdownBlock, markdownIndex (`${block.id}-${markdownIndex}`)}
                          {#if markdownBlock.type === 'heading'}
                            {#if markdownBlock.level === 1}
                              <h1 class="text-xl font-semibold whitespace-pre-wrap">
                                {@html renderInlineMarkdown(markdownBlock.text)}
                              </h1>
                            {:else if markdownBlock.level === 2}
                              <h2 class="text-lg font-semibold whitespace-pre-wrap">
                                {@html renderInlineMarkdown(markdownBlock.text)}
                              </h2>
                            {:else}
                              <h3 class="text-base font-semibold whitespace-pre-wrap">
                                {@html renderInlineMarkdown(markdownBlock.text)}
                              </h3>
                            {/if}
                          {:else if markdownBlock.type === 'unordered-list'}
                            <ul class="list-disc pl-5 space-y-1">
                              {#each markdownBlock.items as item, listIndex (`${block.id}-ul-${listIndex}`)}
                                <li class="whitespace-pre-wrap">
                                  {@html renderInlineMarkdown(item)}
                                </li>
                              {/each}
                            </ul>
                          {:else if markdownBlock.type === 'ordered-list'}
                            <ol class="list-decimal pl-5 space-y-1">
                              {#each markdownBlock.items as item, listIndex (`${block.id}-ol-${listIndex}`)}
                                <li class="whitespace-pre-wrap">
                                  {@html renderInlineMarkdown(item)}
                                </li>
                              {/each}
                            </ol>
                          {:else if markdownBlock.type === 'blockquote'}
                            <blockquote class="border-l-2 border-border pl-3 text-muted-foreground whitespace-pre-wrap">
                              {@html renderInlineMarkdown(markdownBlock.text)}
                            </blockquote>
                          {:else if markdownBlock.type === 'horizontal-rule'}
                            <hr class="border-border/70" />
                          {:else if markdownBlock.type === 'code'}
                            <div class="rounded-md border border-border/60 bg-muted/40">
                              {#if markdownBlock.language}
                                <div class="border-b border-border/60 px-2 py-1 text-xs text-muted-foreground">{markdownBlock.language}</div>
                              {/if}
                              <pre class="overflow-auto p-2 text-xs"><code>{markdownBlock.content}</code></pre>
                            </div>
                          {:else}
                            <p class="whitespace-pre-wrap">
                              {@html renderInlineMarkdown(markdownBlock.text)}
                            </p>
                          {/if}
                        {/each}
                      {/if}
                    </div>
                  {/if}
                </div>
                {/if}
              {:else}
                {#if activeEditorMode === 'preview'}
                  <div class="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-2 space-y-2">
                    <button
                      type="button"
                      class="flex w-full items-center justify-between text-left"
                      onclick={() => togglePreviewTodoCollapsed(block.id)}
                    >
                      <div class="text-sm font-medium">{block.title || 'Todo'}</div>
                      <div class="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{block.items.filter((item) => item.checked).length}/{block.items.length}</span>
                        <ChevronRight class={`h-4 w-4 transition-transform ${getPreviewTodoCollapsed(block.id) ? '' : 'rotate-90'}`} />
                      </div>
                    </button>

                    {#if !getPreviewTodoCollapsed(block.id)}
                      <div class="space-y-1.5">
                        {#if block.items.length === 0}
                          <div class="text-xs text-muted-foreground">No todo items</div>
                        {/if}
                        {#each block.items as item (item.id)}
                          <label class="flex items-center gap-2 rounded px-1 py-1 text-sm">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onchange={() => toggleTodoItem(block.id, item.id)}
                              class="h-4 w-4 shrink-0 accent-primary"
                            />
                            <span class={item.checked ? 'line-through text-muted-foreground' : ''}>{item.text}</span>
                          </label>
                        {/each}
                      </div>
                    {/if}

                  </div>
                {:else}
                  <div class="rounded-md border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5 p-2.5 space-y-2 shadow-sm">
                    <div class="flex items-center justify-between gap-2">
                      <Input
                        value={block.title}
                        oninput={(e) => updateTodoTitle(block.id, e.currentTarget.value)}
                        placeholder="# title here"
                        class="h-7 text-sm font-medium border-0 px-0 shadow-none focus-visible:ring-0"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        class="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
                        onclick={() => removeTodoBlock(block.id)}
                        title="Remove Todo Block"
                      >
                        <X class="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {#if block.items.length === 0}
                      <div class="text-xs text-muted-foreground">No valid todo lines. Add one below.</div>
                    {/if}

                    <div class="space-y-1.5">
                      {#each block.items as item (item.id)}
                        <div class="flex items-center gap-2 rounded-md bg-background/80 border border-border/60 px-2 py-1">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onchange={() => toggleTodoItem(block.id, item.id)}
                            class="h-4 w-4 shrink-0 accent-primary"
                          />
                          <Input
                            value={item.text}
                            oninput={(e) => updateTodoItemText(block.id, item.id, e.currentTarget.value)}
                            placeholder="Todo item text"
                            class="h-7 border-0 shadow-none focus-visible:ring-0"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            class="h-6 w-6 shrink-0 hover:bg-destructive hover:text-destructive-foreground"
                            onclick={() => removeTodoItem(block.id, item.id)}
                            title="Delete item"
                          >
                            <X class="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      {/each}
                    </div>

                    <Button size="sm" variant="outline" class="h-7" onclick={() => addTodoItem(block.id)}>
                      <Plus class="h-3.5 w-3.5 mr-1" />
                      Add item
                    </Button>

                  </div>
                {/if}
              {/if}
            {/each}
          {/if}
        </div>
      </Tabs.Root>
    </div>
  </FloatingWindow>
</div>

<style>
  .editable-content {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .editable-content:empty::before {
    content: attr(data-placeholder);
    color: hsl(var(--muted-foreground));
    pointer-events: none;
  }

  .editable-content[data-placeholder='Start typing...']:empty::before {
    color: hsl(var(--primary));
    opacity: 0.7;
  }
</style>

