<script lang="ts">
  import {getContext} from "svelte";
  import type {MainWindowState} from "$lib/types";
  import * as Resizable from '$lib/components/ui/resizable'
  import NeuzClient from "./NeuzClient.svelte";
  import HomePage from "./HomePage.svelte";
  import FloatingWindowsPortal from "./FloatingWindowsPortal.svelte";
  import WidgetsManager from "./WidgetsManager.svelte";

  const mainWindowState = getContext<MainWindowState>('mainWindowState');

  let autofocusEnabled: boolean = true;
</script>

<div class="flex flex-1 p-4 relative">
  <FloatingWindowsPortal>
    <WidgetsManager/>
  </FloatingWindowsPortal>

  <div
    class="h-full w-full left-0 top-0 absolute bg-background {mainWindowState.tabs.activeLayoutId === 'home'
            ? 'z-[39]'
            : 'z-[0] hidden'} overflow-hidden"
  >
    <HomePage/>
  </div>
  {#each mainWindowState.layouts as layout (layout.id)}
    {#if mainWindowState.tabs.layoutsIds.includes(layout.id)}
      <div
        class="h-full w-full left-0 top-0 absolute bg-background select-none {layout.id === mainWindowState.tabs.activeLayoutId
            ? 'z-[39]'
            : 'z-[0] hidden'} overflow-hidden"
      >
        <Resizable.PaneGroup direction="vertical" class="h-full w-full" autoSaveId={'rows_' + layout.id}>
          {#each layout.rows as row, rowIndex}
            {#if row.sessionIds.length > 0}
              <Resizable.Pane>
                <Resizable.PaneGroup direction="horizontal" autoSaveId={'cells_' + row.sessionIds[0]}>
                  {#each row.sessionIds as sessionId, cellIndex}
                    {@const session = mainWindowState.sessions.find((s) => s.id === sessionId)}
                    <Resizable.Pane>
                      <NeuzClient
                        layoutId={layout.id}
                        bind:autofocusEnabled
                        session={mainWindowState.sessions.find((s) => {
                              return s.id === sessionId
                            })}
                        onUpdate={(_) => {

                            }}
                        src={session.srcOverwrite || 'https://universe.flyff.com/play'}
                      />
                    </Resizable.Pane>
                    {#if cellIndex < row.sessionIds.length - 1}
                      <Resizable.Handle disabled={layout.locked ?? false}/>
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
</div>
