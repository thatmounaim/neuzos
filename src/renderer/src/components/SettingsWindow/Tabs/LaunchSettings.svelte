<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import {Switch} from "$lib/components/ui/switch";
  import {Input} from "$lib/components/ui/input";
  import {Label} from "$lib/components/ui/label";
  import * as Alert from "$lib/components/ui/alert";
  import {Separator} from "$lib/components/ui/separator";
  import {getContext, onMount} from "svelte";
  import { getElectronContext } from "$lib/contexts/electronContext";
  import type {NeuzConfig} from "$lib/types";
  import {AlertCircleIcon} from "@lucide/svelte";

  let availableCommandLineSwitches = $state<Array<{ flag: string; description: string; tooltip?: string }>>([]);
  let userAgentEnabled = $state(false);
  let userAgentValue = $state("");
  let defaultUserAgent = $state("");

  const electronApi = getElectronContext();
  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");

  onMount(async () => {
    availableCommandLineSwitches = await electronApi.invoke("config.get_available_command_line_switches");

    try {
      defaultUserAgent = await electronApi.invoke("app.get_default_user_agent");
    } catch (e) {
      defaultUserAgent = navigator.userAgent;
    }

    if (neuzosConfig.userAgent) {
      userAgentEnabled = true;
      userAgentValue = neuzosConfig.userAgent;
    } else {
      userAgentEnabled = false;
      userAgentValue = defaultUserAgent;
    }
  });

  function handleUserAgentToggle(enabled: boolean) {
    userAgentEnabled = enabled;
    if (enabled) {
      if (!userAgentValue || userAgentValue === "") {
        userAgentValue = defaultUserAgent;
      }
      neuzosConfig.userAgent = userAgentValue;
    } else {
      delete neuzosConfig.userAgent;
    }
  }

  function handleUserAgentInput(value: string) {
    userAgentValue = value;
    if (userAgentEnabled) {
      neuzosConfig.userAgent = value;
    }
  }
</script>
<Card.Root class="h-full overflow-y-auto">
  <Card.Header>
    <Card.Title class="text-lg font-semibold">Advanced Launch Settings</Card.Title>
  </Card.Header>
  <Card.Content class="flex flex-col gap-6">
    <section class="space-y-3">
      <div class="space-y-1">
        <h3 class="text-base font-semibold">Default Launch Mode</h3>
        <p class="text-sm text-muted-foreground">Configure How NeuzOS Launches by Default.</p>
      </div>

      <div class="flex items-center justify-between py-2">
        <div class="space-y-0.5">
          <Label for="session-launcher-mode" class="text-sm font-medium">Session Launcher Mode</Label>
          <p class="text-xs text-muted-foreground">
            Launch Directly to the Session Launcher instead of the Main Window
          </p>
        </div>
        <Switch
          id="session-launcher-mode"
          checked={neuzosConfig.defaultLaunchMode === 'session_launcher'}
          onCheckedChange={(checked) => {
            neuzosConfig.defaultLaunchMode = checked ? 'session_launcher' : 'normal';
          }}
        />
      </div>
    </section>

    <Separator/>

    <section class="space-y-3">
      <div class="space-y-1">
        <h3 class="text-base font-semibold">User Agent</h3>
        <p class="text-sm text-muted-foreground">Configure Custom User Agent for Webviews and Sessions.</p>
      </div>

      <Alert.Root variant="destructive">
        <AlertCircleIcon class="h-4 w-4"/>
        <Alert.Title>Important before Changing the User Agent!</Alert.Title>
        <Alert.Description>
          In some cases logged in Sessions might become invalid with a new User Agent.
        </Alert.Description>
      </Alert.Root>

      <div class="flex items-center justify-between py-2">
        <div class="space-y-0.5">
          <Label for="custom-user-agent" class="text-sm font-medium">Custom User Agent</Label>
          <p class="text-xs text-muted-foreground">
            Enable Custom User Agent for All Webviews and Sessions
          </p>
        </div>
        <Switch
          id="custom-user-agent"
          checked={userAgentEnabled}
          onCheckedChange={handleUserAgentToggle}
        />
      </div>

      {#if userAgentEnabled}
        <div class="space-y-2">
          <Label for="user-agent-input" class="text-xs">User Agent String</Label>
          <Input
            id="user-agent-input"
            type="text"
            placeholder="Enter custom user agent..."
            bind:value={userAgentValue}
            oninput={(e) => {
              const target = e.target as HTMLInputElement;
              handleUserAgentInput(target.value);
            }}
            class="h-8 text-sm w-full"
          />
          <p class="text-xs text-muted-foreground">
            Default: <code class="bg-muted px-1 py-0.5 rounded text-xs">{defaultUserAgent}</code>
          </p>
        </div>
      {:else}
        <p class="text-xs text-muted-foreground">
          When Disabled, the Default Electron User Agent will be used.
        </p>
      {/if}
    </section>

    <Separator/>

    <section class="space-y-3">
      <div class="space-y-1">
        <h3 class="text-base font-semibold">Command Line Switches</h3>
        <p class="text-sm text-muted-foreground">
          Manage Chromium Command Line Arguments to modify Browser behavior.
        </p>
      </div>

      <Alert.Root>
        <AlertCircleIcon class="h-4 w-4"/>
        <Alert.Title>Important Note!</Alert.Title>
        <Alert.Description>
          Changing these Settings will only Affect the next Time you start NeuzOS.
        </Alert.Description>
      </Alert.Root>

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
            <Table.Row class={enabled ? 'dark:text-green-300 text-green-600' : ''}>
              <Table.Cell
                class={switchItem.tooltip ? 'cursor-help' : ''}
                title={switchItem.tooltip ?? switchItem.description}
              >
                {switchItem.flag}
              </Table.Cell>
              <Table.Cell
                class={switchItem.tooltip ? 'text-sm text-muted-foreground cursor-help' : 'text-sm text-muted-foreground'}
                title={switchItem.tooltip ?? switchItem.description}
              >
                {switchItem.description}
              </Table.Cell>
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
    </section>
  </Card.Content>
</Card.Root>
