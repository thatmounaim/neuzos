<script lang="ts">
  import {getContext} from 'svelte';
  import * as Card from '$lib/components/ui/card';
  import Button from '$lib/components/ui/button/button.svelte';
  import {toast} from 'svelte-sonner';
  import {neuzosBridge} from '$lib/core';
  import {
    buildExportPayload,
    computeCategoryPreview,
    exportCategories,
    getCategoryCountLabel,
    getDefaultCategorySelection,
    getSelectedCategories,
    sanitizeConfigForExport,
  } from '$lib/configExport';
  import type {ConfigImportResult, ExportCategory, NeuzConfig} from '$lib/types';

  const loadConfig = getContext<() => Promise<void>>('loadConfig');
  const neuzosConfig = getContext<NeuzConfig>('neuzosConfig');

  type ValidImportResult = Extract<ConfigImportResult, { valid: true }>;

  const categoryById = new Map(exportCategories.map((category) => [category.id, category]));

  let previewResult: ValidImportResult | null = $state(null);
  let importedPayload: ValidImportResult['payload'] | null = $state(null);
  let selectedMode: 'replace' | 'merge' = $state('replace');
  let isExporting = $state(false);
  let isImporting = $state(false);
  let isApplying = $state(false);
  let categorySelection = $state(getDefaultCategorySelection());

  const selectedCategories = $derived(getSelectedCategories(categorySelection));
  const selectedCategoryCount = $derived(selectedCategories.length);
  const categoryPreview = $derived(importedPayload ? computeCategoryPreview(importedPayload, selectedCategories, neuzosConfig) : []);
  const applyCount = $derived(categoryPreview.reduce((total, preview) => {
    if (!preview.foundInFile) {
      return total;
    }

    if (preview.type === 'object') {
      return total + 1;
    }

    return total + (selectedMode === 'merge' ? (preview.newCount ?? 0) : (preview.totalCount ?? 0));
  }, 0));

  const setCategorySelection = (category: ExportCategory, checked: boolean) => {
    if (!categoryById.get(category)?.enabled) {
      return;
    }

    categorySelection[category] = checked;
  };

  const exportConfig = async () => {
    if (isExporting || selectedCategoryCount === 0) return;

    isExporting = true;
    try {
      const payload = buildExportPayload(neuzosConfig, selectedCategories);
      const sanitized = sanitizeConfigForExport(payload);
      const result = await neuzosBridge.backup.export(sanitized.payload);
      if (result.success) {
        toast.success(`Config exported to ${result.filePath}`);
        if (sanitized.sanitized) {
          toast.warning('Some values were sanitized for safety.');
        }
      } else {
        toast.error(result.error ?? 'Export failed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      isExporting = false;
    }
  };

  const importConfig = async () => {
    if (isImporting) return;

    isImporting = true;
    try {
      const result = await neuzosBridge.backup.import();
      if (result.valid === false) {
        previewResult = null;
        importedPayload = null;
        toast.error(result.error);
        return;
      }

      previewResult = result;
      importedPayload = result.payload;
      selectedMode = 'replace';
      toast.success('Import preview loaded');
    } catch (error) {
      previewResult = null;
      importedPayload = null;
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      isImporting = false;
    }
  };

  const applyImport = async (mode: 'replace' | 'merge') => {
    if (!previewResult || !importedPayload || isApplying || selectedCategoryCount === 0) return;

    isApplying = true;
    try {
      const result = await neuzosBridge.backup.applyImport($state.snapshot(importedPayload), mode, selectedCategories);
      if (!result.success) {
        toast.error(result.error ?? 'Import application failed');
        return;
      }

      await loadConfig?.();
      previewResult = null;
      importedPayload = null;

      if (mode === 'merge' && result.added) {
        const {actions, binds, profiles} = result.added;
        const total = actions + binds + profiles;
        toast.success(total > 0
          ? `Merged: ${actions} action(s), ${binds} keybind(s), ${profiles} profile(s) added`
          : 'Nothing new to merge — all selected items already exist');
      } else {
        toast.success('Config updated successfully');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import application failed');
    } finally {
      isApplying = false;
    }
  };
</script>

<Card.Root class="h-full overflow-y-auto">
  <Card.Header>
    <Card.Title class="text-lg font-semibold">Backup</Card.Title>
    <Card.Description>
      Select the categories you want to export or import. The same checklist controls both actions.
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <div class="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="font-medium">Export / Import categories</h3>
          <p class="text-sm text-muted-foreground">
            The selection below is shared between export and import. UI Layout and General Settings are full replace categories.
          </p>
        </div>
        <div class="text-right text-xs text-muted-foreground">
          <div>{selectedCategoryCount} selected</div>
          <div>{selectedCategories.length} exportable category(ies)</div>
        </div>
      </div>

      <div class="grid gap-3">
        {#each exportCategories as category}
          <label class={`flex items-start gap-3 rounded-md border p-3 transition-colors ${category.enabled ? 'bg-background hover:border-primary/40' : 'bg-muted/40 opacity-70'}`}>
            <input
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-border text-primary"
              checked={categorySelection[category.id]}
              disabled={!category.enabled}
              onchange={(event) => setCategorySelection(category.id, (event.currentTarget as HTMLInputElement).checked)}
            />
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">{category.label}</span>
                {#if !category.enabled}
                  <span class="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Disabled</span>
                {/if}
              </div>
              <p class="text-sm text-muted-foreground">{category.description}</p>
            </div>
            <div class="shrink-0 text-right text-xs text-muted-foreground">
              <div>{getCategoryCountLabel(neuzosConfig, category.id)}</div>
            </div>
          </label>
        {/each}
      </div>

      <div class="rounded-md border border-border/60 bg-background p-3 text-xs text-muted-foreground space-y-1">
        <p><strong class="text-foreground">Shared selection</strong> — the same checklist controls export and import.</p>
        <p><strong class="text-foreground">Object categories</strong> — UI Layout and General Settings are always replaced as a whole.</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <Button onclick={exportConfig} disabled={isExporting || selectedCategoryCount === 0}>
        {isExporting ? 'Exporting...' : 'Export Config'}
      </Button>
      <Button variant="outline" onclick={importConfig} disabled={isImporting}>
        {isImporting ? 'Importing...' : 'Import Config'}
      </Button>
    </div>

    {#if previewResult}
      <div class="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="font-medium">Import preview</h3>
            <p class="text-sm text-muted-foreground">
              Schema version {previewResult.payload.schemaVersion} · Exported {previewResult.payload.exportedAt}
            </p>
          </div>
          <div class="text-right text-xs text-muted-foreground">
            <div>{selectedCategoryCount} selected</div>
            <div>Apply count: {applyCount}</div>
          </div>
        </div>

        {#if previewResult.warnings.length > 0}
          <div class="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <div class="font-medium text-amber-100">Warnings</div>
            <ul class="mt-2 list-disc space-y-1 pl-5 text-amber-50/90">
              {#each previewResult.warnings as warning}
                <li>{warning}</li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if selectedCategoryCount === 0}
          <div class="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            Select at least one category to preview import data.
          </div>
        {:else}
          <div class="grid gap-3 lg:grid-cols-2">
            {#each categoryPreview as preview}
              <div class={`rounded-md border bg-background p-3 ${preview.foundInFile ? '' : 'opacity-70'}`}>
                <div class="flex items-center justify-between gap-2">
                  <div>
                    <div class="font-medium">{categoryById.get(preview.category)?.label ?? preview.category}</div>
                    <div class="text-xs text-muted-foreground">{categoryById.get(preview.category)?.description}</div>
                  </div>
                  {#if !preview.foundInFile}
                    <span class="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Not found in file</span>
                  {:else if preview.type === 'object'}
                    <span class="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">Full replace</span>
                  {:else if selectedMode === 'merge'}
                    <span class="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Merge</span>
                  {:else}
                    <span class="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Replace</span>
                  {/if}
                </div>

                {#if preview.type === 'list' && preview.foundInFile}
                  <div class="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div class="rounded border border-border/70 bg-muted/30 p-2">
                      <div class="text-muted-foreground">New</div>
                      <div class="font-semibold">{preview.newCount ?? 0}</div>
                    </div>
                    <div class="rounded border border-border/70 bg-muted/30 p-2">
                      <div class="text-muted-foreground">Conflicts</div>
                      <div class="font-semibold">{preview.conflictCount ?? 0}</div>
                    </div>
                    <div class="rounded border border-border/70 bg-muted/30 p-2">
                      <div class="text-muted-foreground">Total</div>
                      <div class="font-semibold">{preview.totalCount ?? 0}</div>
                    </div>
                  </div>
                {/if}

                {#if preview.type === 'object' && preview.foundInFile}
                  <div class="mt-3 text-xs text-muted-foreground space-y-1">
                    <p>This category is written as a full replacement.</p>
                    <p>{preview.totalCount ?? 0} field group(s) present in the file.</p>
                    {#if preview.skippedSessionIds?.length}
                      <p class="text-amber-300">
                        {preview.skippedSessionIds.length} session ID(s) will be skipped: {preview.skippedSessionIds.join(', ')}
                      </p>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        <div class="space-y-1 text-xs text-muted-foreground rounded-md border border-border/50 bg-muted/20 p-3">
          <p><strong class="text-foreground">Replace</strong> — overwrites selected categories with the contents of the file.</p>
          <p><strong class="text-foreground">Merge</strong> — keeps existing list items and only adds entries that do not already exist.</p>
          <p><strong class="text-foreground">Object categories</strong> — UI Layout and General Settings always behave as full replace.</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <Button
            variant={selectedMode === 'replace' ? 'default' : 'outline'}
            onclick={() => selectedMode = 'replace'}
            disabled={isApplying}
          >
            Replace
          </Button>
          <Button
            variant={selectedMode === 'merge' ? 'default' : 'outline'}
            onclick={() => selectedMode = 'merge'}
            disabled={isApplying}
          >
            Merge
          </Button>
          <div class="flex-1"></div>
          <Button onclick={() => applyImport(selectedMode)} disabled={isApplying || selectedCategoryCount === 0} class="min-w-28">
            {isApplying ? 'Applying...' : `Apply — ${applyCount} item(s)`}
          </Button>
        </div>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
