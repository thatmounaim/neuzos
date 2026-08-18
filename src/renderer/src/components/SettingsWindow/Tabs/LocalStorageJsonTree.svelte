<script lang="ts">
  import {Check, ChevronDown, ChevronRight, Trash, X} from '@lucide/svelte';
  import * as Tooltip from '$lib/components/ui/tooltip';

  export type LocalStorageJsonViewMode = 'tree' | 'raw';

  type TextPart = {
    text: string;
    reference?: unknown;
  };

  interface Props {
    value: string;
    editable?: boolean;
    viewMode?: LocalStorageJsonViewMode;
    idDisplayMode?: 'default' | 'id-only';
    expandAllRequest?: number;
    collapseAllRequest?: number;
    getTextParts?: (text: string) => TextPart[];
    getReferenceClass?: (reference: unknown) => string;
    getReferenceDisplayText?: (reference: unknown) => string;
    getReferenceTooltip?: (reference: unknown) => string[];
    onValueChange?: (value: string) => void;
    onExpansionStateChange?: (allExpanded: boolean) => void;
    onExpandableStateChange?: (hasExpandableNodes: boolean) => void;
  }

  type JsonPath = Array<string | number>;
  type JsonValue = null | boolean | number | string | JsonValue[] | {[key: string]: JsonValue};

  let {
    value,
    editable = false,
    viewMode = 'tree',
    idDisplayMode = 'default',
    expandAllRequest = 0,
    collapseAllRequest = 0,
    getTextParts,
    getReferenceClass,
    getReferenceDisplayText,
    getReferenceTooltip,
    onValueChange,
    onExpansionStateChange,
    onExpandableStateChange
  }: Props = $props();

  let expandedPaths: Record<string, boolean> = $state({'': true});
  let editingPathKey: string | null = $state(null);
  let editingValue = $state('');
  let editingKeyPathKey: string | null = $state(null);
  let editingKeyValue = $state('');
  let currentValue = $state('');
  let lastInitializedValue = '';
  let handledInitialExpandCollapseRequests = false;
  let handledExpandAllRequest = 0;
  let handledCollapseAllRequest = 0;

  $effect(() => {
    currentValue = value;
  });

  const parsedValue = $derived.by((): {valid: true; data: JsonValue} | {valid: false} => {
    try {
      return {valid: true, data: JSON.parse(currentValue) as JsonValue};
    } catch {
      return {valid: false};
    }
  });
  const effectiveViewMode = $derived(parsedValue.valid ? viewMode : 'raw');

  const isArray = (node: JsonValue): node is JsonValue[] => Array.isArray(node);
  const isObjectLike = (node: JsonValue) => node !== null && typeof node === 'object';
  const pathKey = (path: JsonPath) => path.join('.');
  const isExpanded = (path: JsonPath) => expandedPaths[pathKey(path)] ?? false;
  const getChildEntries = (node: JsonValue): Array<[string | number, JsonValue]> => {
    if (isArray(node)) {
      return node.map((item, index) => [index, item]);
    }
    if (node !== null && typeof node === 'object') {
      return Object.entries(node);
    }
    return [];
  };

  const expandablePathKeys = $derived.by(() => {
    if (!parsedValue.valid) return [];

    const keys: string[] = [];
    const collectExpandablePaths = (node: JsonValue, path: JsonPath) => {
      if (!isObjectLike(node)) return;

      const children = getChildEntries(node);
      if (children.length === 0) return;

      keys.push(pathKey(path));
      for (const [childKey, childValue] of children) {
        collectExpandablePaths(childValue, [...path, childKey]);
      }
    };

    collectExpandablePaths(parsedValue.data, []);
    return keys;
  });
  const allExpanded = $derived(expandablePathKeys.length > 0 && expandablePathKeys.every((key) => expandedPaths[key] ?? false));

  function getDefaultExpandedPaths(node: JsonValue, path: JsonPath = []): Record<string, boolean> {
    if (!isObjectLike(node)) return {};

    const nextPaths: Record<string, boolean> = {
      [pathKey(path)]: true,
    };

    for (const [childKey, childValue] of getChildEntries(node)) {
      Object.assign(nextPaths, getDefaultExpandedPaths(childValue, [...path, childKey]));
    }

    return nextPaths;
  }

  $effect(() => {
    if (!parsedValue.valid || currentValue === lastInitializedValue) return;
    expandedPaths = getDefaultExpandedPaths(parsedValue.data);
    lastInitializedValue = currentValue;
  });

  $effect(() => {
    if (!handledInitialExpandCollapseRequests) {
      handledExpandAllRequest = expandAllRequest;
      handledCollapseAllRequest = collapseAllRequest;
      handledInitialExpandCollapseRequests = true;
      return;
    }

    if (!parsedValue.valid) return;

    if (expandAllRequest !== handledExpandAllRequest) {
      handledExpandAllRequest = expandAllRequest;
      if (expandAllRequest) {
        expandedPaths = Object.fromEntries(expandablePathKeys.map((key) => [key, true]));
      }
    }

    if (collapseAllRequest !== handledCollapseAllRequest) {
      handledCollapseAllRequest = collapseAllRequest;
      if (collapseAllRequest) {
        expandedPaths = {
          ...Object.fromEntries(expandablePathKeys.map((key) => [key, false])),
          '': true,
        };
      }
    }
  });

  $effect(() => {
    onExpansionStateChange?.(allExpanded);
  });

  $effect(() => {
    onExpandableStateChange?.(expandablePathKeys.length > 0);
  });

  function toggleExpanded(path: JsonPath) {
    const key = pathKey(path);
    expandedPaths = {
      ...expandedPaths,
      [key]: !isExpanded(path),
    };
  }

  function getInlineSummary(node: JsonValue) {
    if (isArray(node)) return `${node.length} ${node.length === 1 ? 'Item' : 'Items'}`;
    if (node !== null && typeof node === 'object') {
      const keyCount = Object.keys(node).length;
      return `${keyCount} ${keyCount === 1 ? 'Key' : 'Keys'}`;
    }
    return '';
  }

  function formatPrimitive(node: JsonValue) {
    if (node === null) return 'null';
    if (typeof node === 'string') return node;
    return String(node);
  }

  function getPrimitiveClass(node: JsonValue) {
    if (node === null) return 'text-purple-300';
    if (typeof node === 'string') return 'text-green-300';
    if (typeof node === 'number') return 'text-sky-300';
    if (typeof node === 'boolean') return 'text-amber-300';
    return 'text-foreground';
  }

  function getStringTextParts(text: string): TextPart[] {
    if (!getTextParts) {
      return [{text}];
    }

    const jsonText = JSON.stringify(text);
    const parts = getTextParts(jsonText);
    const result: TextPart[] = [];

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      const isFirstTextPart = index === 0 && !part.reference;
      const isLastTextPart = index === parts.length - 1 && !part.reference;

      if (part.reference) {
        result.push(part);
        continue;
      }

      let displayText = part.text;
      if (isFirstTextPart && displayText.startsWith('"')) {
        displayText = displayText.slice(1);
      }
      if (isLastTextPart && displayText.endsWith('"')) {
        displayText = displayText.slice(0, -1);
      }

      if (displayText) {
        result.push({text: displayText});
      }
    }

    return result;
  }

  function cloneWithUpdatedPath(node: JsonValue, path: JsonPath, nextValue: JsonValue): JsonValue {
    if (path.length === 0) {
      return nextValue;
    }

    const [head, ...rest] = path;
    if (isArray(node)) {
      return node.map((item, index) => index === head ? cloneWithUpdatedPath(item, rest, nextValue) : item);
    }
    if (node !== null && typeof node === 'object' && typeof head === 'string') {
      return {
        ...node,
        [head]: cloneWithUpdatedPath(node[head], rest, nextValue),
      };
    }

    return node;
  }

  function cloneWithoutPath(node: JsonValue, path: JsonPath): JsonValue {
    if (path.length === 0) {
      return node;
    }

    const [head, ...rest] = path;
    if (isArray(node)) {
      if (rest.length === 0 && typeof head === 'number') {
        return node.filter((_, index) => index !== head);
      }
      return node.map((item, index) => index === head ? cloneWithoutPath(item, rest) : item);
    }
    if (node !== null && typeof node === 'object' && typeof head === 'string') {
      if (rest.length === 0) {
        const {[head]: _removed, ...remaining} = node;
        return remaining;
      }
      return {
        ...node,
        [head]: cloneWithoutPath(node[head], rest),
      };
    }

    return node;
  }

  function cloneWithRenamedKey(node: JsonValue, path: JsonPath, nextKey: string): JsonValue {
    if (path.length === 0) {
      return node;
    }

    const [head, ...rest] = path;
    if (isArray(node)) {
      return node.map((item, index) => index === head ? cloneWithRenamedKey(item, rest, nextKey) : item);
    }
    if (node !== null && typeof node === 'object' && typeof head === 'string') {
      if (rest.length === 0) {
        const entries = Object.entries(node).map(([key, value]) => key === head ? [nextKey, value] : [key, value]);
        return Object.fromEntries(entries);
      }

      return {
        ...node,
        [head]: cloneWithRenamedKey(node[head], rest, nextKey),
      };
    }

    return node;
  }

  function updateJson(nextData: JsonValue) {
    const nextValue = JSON.stringify(nextData, null, 2);
    currentValue = nextValue;
    lastInitializedValue = nextValue;
    onValueChange?.(nextValue);
  }

  function updateRawValue(nextValue: string) {
    currentValue = nextValue;
    lastInitializedValue = nextValue;
    onValueChange?.(nextValue);
  }

  function parsePrimitiveEditValue(originalValue: JsonValue, rawValue: string): JsonValue {
    if (typeof originalValue === 'number') {
      const numberValue = Number(rawValue);
      return Number.isFinite(numberValue) ? numberValue : originalValue;
    }
    if (typeof originalValue === 'boolean') {
      return rawValue === 'true';
    }
    if (originalValue === null) {
      return rawValue === 'null' ? null : rawValue;
    }
    return rawValue;
  }

  function startPrimitiveEdit(path: JsonPath, node: JsonValue) {
    if (!editable) return;
    editingPathKey = pathKey(path);
    editingValue = formatPrimitive(node);
  }

  function savePrimitiveEdit(path: JsonPath, originalValue: JsonValue) {
    if (!parsedValue.valid) return;
    const nextValue = parsePrimitiveEditValue(originalValue, editingValue);
    updateJson(cloneWithUpdatedPath(parsedValue.data, path, nextValue));
    editingPathKey = null;
  }

  function cancelPrimitiveEdit() {
    editingPathKey = null;
    editingValue = '';
  }

  function startKeyEdit(path: JsonPath, label: string | number | null, parentIsArray: boolean) {
    if (!editable || parentIsArray || typeof label !== 'string') return;
    editingKeyPathKey = pathKey(path);
    editingKeyValue = label;
  }

  function saveKeyEdit(path: JsonPath, originalKey: string) {
    if (!parsedValue.valid) return;
    const nextKey = editingKeyValue.trim();
    if (!nextKey || nextKey === originalKey) {
      editingKeyPathKey = null;
      return;
    }

    updateJson(cloneWithRenamedKey(parsedValue.data, path, nextKey));
    editingKeyPathKey = null;
  }

  function cancelKeyEdit() {
    editingKeyPathKey = null;
    editingKeyValue = '';
  }

  function deleteNode(path: JsonPath) {
    if (!editable || !parsedValue.valid || path.length === 0) return;
    updateJson(cloneWithoutPath(parsedValue.data, path));
    if (editingPathKey === pathKey(path)) {
      cancelPrimitiveEdit();
    }
  }
</script>

{#snippet textWithReferences(text: string)}
  {#if getTextParts && getReferenceClass && getReferenceDisplayText && getReferenceTooltip}
    {#each getTextParts(text) as part}
      {#if part.reference}
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger class={`mx-0.5 ${idDisplayMode === 'id-only' ? 'underline decoration-dotted underline-offset-2' : getReferenceClass(part.reference)}`}>
              {idDisplayMode === 'id-only' ? part.text : getReferenceDisplayText(part.reference)}
            </Tooltip.Trigger>
            <Tooltip.Content>
              <div class="space-y-1 text-xs">
                {#each getReferenceTooltip(part.reference) as line}
                  <div>{line}</div>
                {/each}
              </div>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      {:else}
        <span>{part.text}</span>
      {/if}
    {/each}
  {:else}
    <span>{text}</span>
  {/if}
{/snippet}

{#snippet textPartsWithReferences(parts: TextPart[])}
  {#if getReferenceClass && getReferenceDisplayText && getReferenceTooltip}
    {#each parts as part}
      {#if part.reference}
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger class={`mx-0.5 ${idDisplayMode === 'id-only' ? 'underline decoration-dotted underline-offset-2' : getReferenceClass(part.reference)}`}>
              {idDisplayMode === 'id-only' ? part.text : getReferenceDisplayText(part.reference)}
            </Tooltip.Trigger>
            <Tooltip.Content>
              <div class="space-y-1 text-xs">
                {#each getReferenceTooltip(part.reference) as line}
                  <div>{line}</div>
                {/each}
              </div>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      {:else}
        <span>{part.text}</span>
      {/if}
    {/each}
  {:else}
    {#each parts as part}
      <span>{part.text}</span>
    {/each}
  {/if}
{/snippet}

{#snippet keyLabel(label: string | number | null, path: JsonPath, parentIsArray = false)}
  {#if label !== null}
    {#if parentIsArray && typeof label === 'number'}
      <span class="text-muted-foreground/70 opacity-0 transition-opacity group-hover/json-line:opacity-100 group-hover/json-value:opacity-100">[{label}]</span><span class="text-muted-foreground opacity-0 transition-opacity group-hover/json-line:opacity-100 group-hover/json-value:opacity-100">: </span>
    {:else if editable && typeof label === 'string' && editingKeyPathKey === pathKey(path)}
      <span class="inline-flex items-center gap-1">
        <span class="text-muted-foreground">"</span>
        <input
          class="h-6 min-w-40 rounded border border-input bg-background px-1.5 font-mono text-xs text-foreground outline-none focus:border-ring"
          value={editingKeyValue}
          oninput={(event) => editingKeyValue = event.currentTarget.value}
          onkeydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              saveKeyEdit(path, label);
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              cancelKeyEdit();
            }
          }}
        />
        <span class="text-muted-foreground">"</span><span class="text-muted-foreground">: </span>
        <button
          type="button"
          class="inline-flex h-5 w-5 items-center justify-center rounded text-green-300 hover:bg-green-400/10 hover:text-green-200"
          onclick={() => saveKeyEdit(path, label)}
          title="Save Key"
        >
          <Check class="h-3.5 w-3.5"/>
        </button>
        <button
          type="button"
          class="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          onclick={cancelKeyEdit}
          title="Cancel"
        >
          <X class="h-3.5 w-3.5"/>
        </button>
      </span>
    {:else}
      <button
        type="button"
        class={`rounded px-0.5 text-left font-mono ${editable ? 'hover:bg-muted/70' : 'cursor-text'}`}
        onclick={() => startKeyEdit(path, label, parentIsArray)}
      >
        <span class="text-muted-foreground">"</span>{@render textPartsWithReferences(getStringTextParts(String(label)))}<span class="text-muted-foreground">"</span><span class="text-muted-foreground">: </span>
      </button>
    {/if}
  {/if}
{/snippet}

{#snippet primitiveValue(node: JsonValue, path: JsonPath)}
  {#if editable && editingPathKey === pathKey(path)}
    <span class="inline-flex items-center gap-1">
      {#if typeof node === 'boolean'}
        <select
          class="h-6 rounded border border-input bg-background px-1.5 font-mono text-xs outline-none focus:border-ring"
          value={editingValue}
          onchange={(event) => editingValue = event.currentTarget.value}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      {:else}
        <input
          class="h-6 min-w-32 rounded border border-input bg-background px-1.5 font-mono text-xs outline-none focus:border-ring"
          type={typeof node === 'number' ? 'number' : 'text'}
          value={editingValue}
          oninput={(event) => editingValue = event.currentTarget.value}
          onkeydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              savePrimitiveEdit(path, node);
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              cancelPrimitiveEdit();
            }
          }}
        />
      {/if}
      <button
        type="button"
        class="inline-flex h-5 w-5 items-center justify-center rounded text-green-300 hover:bg-green-400/10 hover:text-green-200"
        onclick={() => savePrimitiveEdit(path, node)}
        title="Save Value"
      >
        <Check class="h-3.5 w-3.5"/>
      </button>
      <button
        type="button"
        class="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        onclick={cancelPrimitiveEdit}
        title="Cancel"
      >
        <X class="h-3.5 w-3.5"/>
      </button>
    </span>
  {:else}
    <button
      type="button"
      class={`rounded px-0.5 text-left font-mono ${getPrimitiveClass(node)} ${editable ? 'hover:bg-muted/70' : 'cursor-text'}`}
      onclick={() => startPrimitiveEdit(path, node)}
    >
      {#if typeof node === 'string'}
        <span>"</span>{@render textPartsWithReferences(getStringTextParts(formatPrimitive(node)))}<span>"</span>
      {:else}
        {formatPrimitive(node)}
      {/if}
    </button>
  {/if}
{/snippet}

{#snippet rowActions(path: JsonPath)}
  {#if editable && path.length > 0}
    <button
      type="button"
      class="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-red-300 opacity-0 transition-opacity group-hover/json-line:opacity-100 hover:bg-red-400/10 hover:text-red-200 focus-visible:opacity-100"
      onclick={() => deleteNode(path)}
      title="Delete Entry"
      aria-label="Delete JSON Entry"
    >
      <Trash class="h-3.5 w-3.5"/>
    </button>
  {/if}
{/snippet}

{#snippet collapsedSummary(node: JsonValue)}
  <span class="text-muted-foreground">
    {isArray(node) ? '[' : '{'}<span class="hidden group-hover/json-line:inline"> {getInlineSummary(node)} </span>{isArray(node) ? ']' : '}'}
  </span>
{/snippet}

{#snippet renderNode(node: JsonValue, path: JsonPath, label: string | number | null = null, parentIsArray = false, trailingComma = false)}
  {@const objectLike = isObjectLike(node)}
  {@const expanded = isExpanded(path)}
  {@const children = getChildEntries(node)}
  {@const openBracket = isArray(node) ? '[' : '{'}
  {@const closeBracket = isArray(node) ? ']' : '}'}
  <div class="font-mono text-xs leading-6">
    {#if objectLike}
      <div class="group/json-line flex min-w-0 items-start rounded px-1 transition-colors hover:bg-muted/30">
        {#if children.length > 0}
          <button
            type="button"
            class="mr-1 mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-colors group-hover/json-line:opacity-100 group-hover/json-value:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
            onclick={() => toggleExpanded(path)}
            aria-label={expanded ? 'Collapse JSON Node' : 'Expand JSON Node'}
          >
            {#if expanded}
              <ChevronDown class="h-3.5 w-3.5"/>
            {:else}
              <ChevronRight class="h-3.5 w-3.5"/>
            {/if}
          </button>
        {:else}
          {#if label !== null}
            <span class="mr-1 h-5 w-5 shrink-0"></span>
          {/if}
        {/if}
        <div class="min-w-0 flex-1 break-words">
          {@render keyLabel(label, path, parentIsArray)}
          {#if children.length === 0}
            <span class="text-muted-foreground">{isArray(node) ? '[]' : '{}'}</span>{#if trailingComma}<span class="text-muted-foreground">,</span>{/if}
          {:else if !expanded}
            {@render collapsedSummary(node)}{#if trailingComma}<span class="text-muted-foreground">,</span>{/if}
          {:else}
            <span class="text-muted-foreground">{openBracket}</span>
          {/if}
        </div>
        {@render rowActions(path)}
      </div>

      {#if expanded && children.length > 0}
        <div class="ml-6 border-l border-border/40 pl-3">
          {#each children as [childKey, childValue], index}
            {@render renderNode(childValue, [...path, childKey], childKey, isArray(node), index < children.length - 1)}
          {/each}
        </div>
        <div class="ml-6 font-mono text-xs leading-6 text-muted-foreground">{closeBracket}{#if trailingComma},{/if}</div>
      {/if}
    {:else}
      <div class="group/json-line flex min-w-0 items-start rounded px-1 transition-colors hover:bg-muted/30">
        {#if label !== null}
          <span class="mr-1 h-5 w-5 shrink-0"></span>
        {/if}
        <div class="min-w-0 flex-1 break-words">
          {@render keyLabel(label, path, parentIsArray)}{@render primitiveValue(node, path)}{#if trailingComma}<span class="text-muted-foreground">,</span>{/if}
        </div>
        {@render rowActions(path)}
      </div>
    {/if}
  </div>
{/snippet}

{#if effectiveViewMode === 'tree' && parsedValue.valid}
  <div class={`group/json-value min-h-40 max-h-80 flex-1 overflow-auto p-3 ${editable ? 'bg-background' : 'bg-muted/30'}`}>
    {@render renderNode(parsedValue.data, [], null)}
  </div>
{:else if editable}
  <textarea
    class="min-h-40 flex-1 w-full border-0 bg-background px-3 py-2 font-mono text-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    value={currentValue}
    oninput={(event) => updateRawValue(event.currentTarget.value)}
  ></textarea>
{:else}
  <div class="min-h-40 max-h-80 flex-1 overflow-auto bg-muted/30 p-3 text-xs whitespace-pre-wrap">
    {@render textWithReferences(parsedValue.valid ? JSON.stringify(parsedValue.data, null, 2) : currentValue)}
  </div>
{/if}
