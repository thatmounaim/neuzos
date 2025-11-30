<script lang="ts">
  import {ModeWatcher} from "mode-watcher";
  import {onMount} from "svelte";
  import {initElectronApi} from "$lib/core";
  import * as Card from "$lib/components/ui/card";
  import {Button} from "$lib/components/ui/button";
  import type {NeuzSession} from "$lib/types";

  initElectronApi(window.electron.ipcRenderer);

  let sessions: NeuzSession[] = $state([]);
  const electronApi = window.electron.ipcRenderer;

  onMount(async () => {
    sessions = await electronApi.invoke("session_launcher.get_sessions");
  });

  function launchSession(sessionId: string, mode: 'session' | 'focus' | 'focus_fullscreen') {
    electronApi.send("session_launcher.launch_session", sessionId, mode);
  }

  function closeWindow() {
    electronApi.send("session_launcher.close");
  }

  function minimizeWindow() {
    electronApi.send("session_launcher.minimize");
  }

  function getIconPath(session: NeuzSession): string {
    return `icons/${session.icon.slug}.png`;
  }
</script>

<ModeWatcher/>

<div class="w-screen h-screen flex flex-col bg-background text-foreground">
  <!-- Title Bar -->
  <div class="flex items-center justify-between px-2 bg-card border-b border-border min-h-8 select-none">
    <div
      class="flex-1 cursor-grab active:cursor-grabbing h-full w-full flex items-center gap-2 select-none"
      style="-webkit-app-region: drag;"
    >
      <div class="flex items-center gap-2">
        <img src="neuzos_pang.png" alt="NeuZOS" class="w-4 h-4"/>
        <span class="text-sm font-semibold">Session Launcher</span>
      </div>

    </div>
    <div class="flex gap-1">
      <Button variant="ghost" size="icon" class="h-6 w-6" onclick={minimizeWindow}>
        <span class="text-base">−</span>
      </Button>
      <Button variant="ghost" size="icon" class="h-6 w-6" onclick={closeWindow}>
        <span class="text-base">×</span>
      </Button>
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-auto p-3">
    {#if sessions.length === 0}
      <div class="flex items-center justify-center h-full">
        <p class="text-muted-foreground text-sm">No sessions available</p>
      </div>
    {:else}
      <div class="grid gap-2">
        {#each sessions as session}
          <Card.Root class="p-3 gap-2">
            <Card.Header class="p-0 ">
              <Card.Title class="text-base flex items-center gap-2">
                <img src={getIconPath(session)} alt={session.label} class="w-6 h-6"/>
                <span>{session.label}</span>
                <span class="text-xs font-normal text-muted-foreground">({session.id})</span>
              </Card.Title>
              {#if session.srcOverwrite}
                <Card.Description class="text-xs truncate">{session.srcOverwrite}</Card.Description>
              {/if}
            </Card.Header>
            <Card.Content class="p-0">
              <div class="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  class="text-xs h-7 flex-1"
                  onclick={() => launchSession(session.id, 'session')}
                >
                  Normal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="text-xs h-7 flex-1"
                  onclick={() => launchSession(session.id, 'focus')}
                >
                  Focus
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="text-xs h-7 flex-1"
                  onclick={() => launchSession(session.id, 'focus_fullscreen')}
                >
                  Focus Fullscreen
                </Button>
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    {/if}
  </div>
</div>

