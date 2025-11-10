<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";

  import { getContext, onMount } from "svelte";
  import type { IpcRenderer } from "@electron-toolkit/preload";
  import { Button } from "$lib/components/ui/button";
  import type { NeuzConfig } from "$lib/types";

  let availableCommandLineSwitches: string[] = [];
  const electronApi = getContext<IpcRenderer>("electronApi");
  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");
  onMount(async () => {
    availableCommandLineSwitches = await electronApi.invoke("config.get_available_command_line_switches");
  });

</script>
<Card.Root class="h-full  overflow-y-auto">
  <Card.Content class="flex flex-col gap-4">
    <p class="text-sm">
      Changing these settings will only affect the next time you start NeuzOS.
    </p>
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head class="font-bold">CLI Argument</Table.Head>
          <Table.Head></Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each availableCommandLineSwitches as switchName}
          {@const enabled = neuzosConfig.chromium.commandLineSwitches.includes(switchName)}
          <Table.Row class="{enabled ? 'dark:text-green-300 text-green-600' : ''}">
            <Table.Cell>{switchName}</Table.Cell>
            <Table.Cell>
              <Button variant="outline" size="sm" class="w-full" onclick={() => {
                if (enabled) {
                  const idx = neuzosConfig.chromium.commandLineSwitches.indexOf(switchName);
                  neuzosConfig.chromium.commandLineSwitches.splice(idx, 1);
                } else {
                  neuzosConfig.chromium.commandLineSwitches.push(switchName);
                }
              }}>
                {#if enabled}
                  Disable
                {:else}
                  Enable
                {/if}
              </Button>
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>

  </Card.Content>
</Card.Root>
