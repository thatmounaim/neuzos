<script lang="ts">
  import {getContext} from "svelte";
  import type {MainWindowState} from "$lib/types";
  import * as Resizable from '$lib/components/ui/resizable'
  import NeuzClient from "../../Shared/NeuzClient.svelte";

  const mainWindowState = getContext<MainWindowState>('mainWindowState');
</script>

{#each mainWindowState.layouts as layout (layout.id)}
  {#if mainWindowState.tabs.layoutsIds.includes(layout.id)}
    <div
      class="h-full w-full left-0 top-0 absolute bg-background select-none {layout.id === mainWindowState.tabs.activeLayoutId
          ? 'z-[39]'
          : 'z-[0] hidden'} overflow-hidden"
    >
      <Resizable.PaneGroup direction={layout.columnFirst ? "horizontal" : "vertical"} class="h-full w-full" autoSaveId={(layout.columnFirst ? 'cols_' : 'rows_') + layout.id}>
        {#each layout.rows as row, rowIndex}
          {@const existingSessionIds = row.sessionIds.filter((sid) => mainWindowState.sessions.some((s) => s.id === sid))}
          {#if existingSessionIds.length > 0}
            <Resizable.Pane>
              <Resizable.PaneGroup direction={layout.columnFirst ? "vertical" : "horizontal"} autoSaveId={(layout.columnFirst ? 'cells_' : 'cells_') + existingSessionIds[0]}>
                {#each existingSessionIds as sessionId, cellIndex}
                  {@const session = mainWindowState.sessions.find((s) => s.id === sessionId)}
                  {#if session}
                    <Resizable.Pane>
                      <NeuzClient
                        layoutId={layout.id}
                        autofocusEnabled={layout.autoFocus ?? true}
                        session={session}
                        onUpdate={(_) => {

                            }}
                        src={session.srcOverwrite || 'https://universe.flyff.com/play'}
                        userAgent={mainWindowState.config.userAgent}
                      />
                    </Resizable.Pane>
                    {#if cellIndex < existingSessionIds.length - 1}
                      <Resizable.Handle disabled={layout.locked ?? false}/>
                    {/if}
                  {/if}
                {/each}
              </Resizable.PaneGroup>
            </Resizable.Pane>
            {#if rowIndex < layout.rows.length - 1}
              <Resizable.Handle disabled={layout.locked ?? false}/>
            {/if}
          {/if}
        {/each}
      </Resizable.PaneGroup>
    </div>
  {/if}
{/each}
