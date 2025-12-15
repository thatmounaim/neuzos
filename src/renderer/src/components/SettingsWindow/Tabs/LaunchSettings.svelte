<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import {Switch} from "$lib/components/ui/switch";
  import * as Alert from "$lib/components/ui/alert";
  import {getContext, onMount} from "svelte";
  import { getElectronContext } from "$lib/contexts/electronContext";
  import type {NeuzConfig} from "$lib/types";
  import {AlertCircleIcon} from "@lucide/svelte";

  let availableCommandLineSwitches: Array<{ flag: string; description: string }> = [];

  const electronApi = getElectronContext();
  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");
  onMount(async () => {
    availableCommandLineSwitches = await electronApi.invoke("config.get_available_command_line_switches");
  });

</script>
<Card.Root class="h-full  overflow-y-auto">
  <Card.Header>
    <Card.Title class="text-lg font-semibold">Default Launch Mode</Card.Title>
    <Card.Description class="flex flex-col">
      <p>Configure how NeuzOS launches by default when no arguments are provided.</p>
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <Table.Root>
      <Table.Body>
        <Table.Row>
          <Table.Cell class="font-medium">Session Launcher Mode</Table.Cell>
          <Table.Cell class="text-sm text-muted-foreground">
            Launch directly to the session launcher instead of the main window
          </Table.Cell>
          <Table.Cell class="text-right">
            <Switch
              id="session-launcher-mode"
              checked={neuzosConfig.defaultLaunchMode === 'session_launcher'}
              onCheckedChange={(checked) => {
                neuzosConfig.defaultLaunchMode = checked ? 'session_launcher' : 'normal';
              }}
            />
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>
  </Card.Content>
  <Card.Header>
    <Card.Title class="text-lg font-semibold">Command Line Switches</Card.Title>
    <Card.Description class="flex flex-col">
      <p>Manage Chromium command line arguments to modify browser behavior.</p>
      <Alert.Root class="mt-4">
        <AlertCircleIcon/>
        <Alert.Title>Important Note.</Alert.Title>
        <Alert.Description class="pt-2">
          <ul>
            <li>- Changing these settings will only affect the next time you start NeuzOS.
            </li>
            <li>-  If somehow NeuzOS is not starting with the new settings, you can try edit the config file manually and get
        rid
        of
        the flags.</li>
          </ul>
        </Alert.Description>
      </Alert.Root>
      <b class="text-sm mt-4">
        <br/>

      </b>
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head class="font-bold">CLI Argument</Table.Head>
          <Table.Head class="font-bold">Description</Table.Head>
          <Table.Head></Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each availableCommandLineSwitches as switchItem}
          {@const enabled = neuzosConfig.chromium.commandLineSwitches.includes(switchItem.flag)}
          <Table.Row class="{enabled ? 'dark:text-green-300 text-green-600' : ''}">
            <Table.Cell>{switchItem.flag}</Table.Cell>
            <Table.Cell class="text-sm text-muted-foreground">{switchItem.description}</Table.Cell>
            <Table.Cell class="text-right">
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    neuzosConfig.chromium.commandLineSwitches.push(switchItem.flag);
                  } else {
                    const idx = neuzosConfig.chromium.commandLineSwitches.indexOf(switchItem.flag);
                    neuzosConfig.chromium.commandLineSwitches.splice(idx, 1);
                  }
                }}
              />
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>

  </Card.Content>
</Card.Root>
