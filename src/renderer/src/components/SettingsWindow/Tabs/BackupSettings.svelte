<script lang="ts">
  import {getContext} from 'svelte'
  import * as Card from '$lib/components/ui/card'
  import Button from '$lib/components/ui/button/button.svelte'
  import {toast} from 'svelte-sonner'
  import {neuzosBridge} from '$lib/core'
  import type {ConfigImportResult} from '$lib/types'

  const loadConfig = getContext<() => Promise<void>>('loadConfig')

  let previewResult: Extract<ConfigImportResult, { valid: true }> | null = $state(null)
  let selectedMode: 'replace' | 'merge' = $state('replace')
  let isExporting = $state(false)
  let isImporting = $state(false)
  let isApplying = $state(false)

  const exportConfig = async () => {
    if (isExporting) return

    isExporting = true
    try {
      const result = await neuzosBridge.backup.export()
      if (result.success) {
        toast.success(`Config exported to ${result.filePath}`)
      } else {
        toast.error(result.error ?? 'Export failed')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed')
    } finally {
      isExporting = false
    }
  }

  const importConfig = async () => {
    if (isImporting) return

    isImporting = true
    try {
      const result = await neuzosBridge.backup.import()
      if (!result.valid) {
        previewResult = null
        toast.error(result.error)
        return
      }

      previewResult = result
      selectedMode = 'replace'
      toast.success('Import preview loaded')
    } catch (error) {
      previewResult = null
      toast.error(error instanceof Error ? error.message : 'Import failed')
    } finally {
      isImporting = false
    }
  }

  const applyImport = async (mode: 'replace' | 'merge') => {
    if (!previewResult || isApplying) return

    isApplying = true
    try {
      const result = await neuzosBridge.backup.applyImport($state.snapshot(previewResult.payload), mode)
      if (!result.success) {
        toast.error(result.error ?? 'Import application failed')
        return
      }

      await loadConfig?.()
      previewResult = null

      if (mode === 'merge' && result.added) {
        const {actions, binds, profiles} = result.added
        const total = actions + binds + profiles
        toast.success(total > 0
          ? `Merged: ${actions} action(s), ${binds} keybind(s), ${profiles} profile(s) added`
          : 'Nothing new to merge — all items already exist')
      } else {
        toast.success('Config replaced successfully')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import application failed')
    } finally {
      isApplying = false
    }
  }
</script>

<Card.Root class="h-full overflow-y-auto">
  <Card.Header>
    <Card.Title class="text-lg font-semibold">Backup</Card.Title>
    <Card.Description>
      Export session actions and keybinds to JSON, or import a backup from another machine.
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <div class="flex flex-wrap gap-3">
      <Button onclick={exportConfig} disabled={isExporting}>
        {isExporting ? 'Exporting...' : 'Export Config'}
      </Button>
      <Button variant="outline" onclick={importConfig} disabled={isImporting}>
        {isImporting ? 'Importing...' : 'Import Config'}
      </Button>
    </div>

    {#if previewResult}
      <div class="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
        <div>
          <h3 class="font-medium">Import preview</h3>
          <p class="text-sm text-muted-foreground">
            Schema version {previewResult.payload.schemaVersion} · Exported {previewResult.payload.exportedAt}
          </p>
        </div>

        <div class="grid gap-2 text-sm sm:grid-cols-3">
          <div class="rounded-md border bg-background p-3">
            <div class="text-muted-foreground">Session actions</div>
            <div class="text-lg font-semibold">{previewResult.payload.sessionActions.length}</div>
          </div>
          <div class="rounded-md border bg-background p-3">
            <div class="text-muted-foreground">Keybinds</div>
            <div class="text-lg font-semibold">{previewResult.payload.keyBinds.length}</div>
          </div>
          <div class="rounded-md border bg-background p-3">
            <div class="text-muted-foreground">Profiles</div>
            <div class="text-lg font-semibold">{previewResult.payload.keyBindProfiles.length}</div>
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

        <div class="space-y-1 text-xs text-muted-foreground rounded-md border border-border/50 bg-muted/20 p-3">
          <p><strong class="text-foreground">Replace</strong> — overwrites all your current session actions, keybinds and profiles with the ones from the file. Nothing is kept.</p>
          <p><strong class="text-foreground">Merge</strong> — keeps everything you already have and only adds entries from the file that don't already exist (checked by ID / key). Nothing gets deleted.</p>
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
          <Button onclick={() => applyImport(selectedMode)} disabled={isApplying} class="min-w-28">
            {isApplying ? 'Applying...' : `Apply (${selectedMode === 'replace' ? 'Replace' : 'Merge'})`}
          </Button>
        </div>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
