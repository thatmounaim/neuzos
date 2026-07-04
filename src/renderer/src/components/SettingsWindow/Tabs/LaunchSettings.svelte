<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import {Switch} from "$lib/components/ui/switch";
  import {Input} from "$lib/components/ui/input";
  import {Label} from "$lib/components/ui/label";
  import {Button} from "$lib/components/ui/button";
  import * as Alert from "$lib/components/ui/alert";
  import {Separator} from "$lib/components/ui/separator";
  import {getContext, onMount} from "svelte";
  import { getElectronContext } from "$lib/contexts/electronContext";
  import type {NeuzConfig} from "$lib/types";
  import {AlertCircleIcon, RotateCcw} from "@lucide/svelte";

  let availableCommandLineSwitches = $state<Array<{ flag: string; description: string; tooltip?: string }>>([]);
  let userAgentEnabled = $state(false);
  let userAgentValue = $state("");
  let defaultUserAgent = $state("");
  let commandLineSwitchesEnabled = $state(false);

  const electronApi = getElectronContext();
  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");

  onMount(() => {
    const handleSettingsSaved = () => {
      if (!neuzosConfig.userAgent || isDefaultUserAgent(userAgentValue)) {
        userAgentEnabled = false;
        userAgentValue = defaultUserAgent;
        delete neuzosConfig.userAgent;
      }

      if ((neuzosConfig.chromium?.commandLineSwitches ?? []).length === 0) {
        commandLineSwitchesEnabled = false;
      }
    };

    const initialize = async () => {
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

      commandLineSwitchesEnabled = (neuzosConfig.chromium?.commandLineSwitches ?? []).length > 0;
    };

    void initialize();
    window.addEventListener("neuzos:settings-saved", handleSettingsSaved);

    return () => {
      window.removeEventListener("neuzos:settings-saved", handleSettingsSaved);
    };
  });

  function isDefaultUserAgent(value: string) {
    return value.trim() === defaultUserAgent.trim();
  }

  function handleUserAgentToggle(enabled: boolean) {
    userAgentEnabled = enabled;
    if (enabled) {
      if (!userAgentValue || userAgentValue === "") {
        userAgentValue = defaultUserAgent;
      }
      neuzosConfig.userAgent = userAgentValue;
    } else {
      userAgentValue = defaultUserAgent;
      delete neuzosConfig.userAgent;
    }
  }

  function handleUserAgentInput(value: string) {
    userAgentValue = value;
    if (userAgentEnabled) {
      neuzosConfig.userAgent = value;
    }
  }

  function restoreDefaultUserAgent() {
    userAgentValue = defaultUserAgent;
    if (userAgentEnabled) {
      neuzosConfig.userAgent = defaultUserAgent;
    } else {
      delete neuzosConfig.userAgent;
    }
  }

  function handleCommandLineSwitchesToggle(enabled: boolean) {
    commandLineSwitchesEnabled = enabled;
    if (!neuzosConfig.chromium) {
      neuzosConfig.chromium = {commandLineSwitches: []};
    }
    if (!enabled) {
      neuzosConfig.chromium.commandLineSwitches = [];
    }
  }
</script>
<Card.Root class="h-full overflow-y-auto">
  <Card.Header>
    <Card.Title class="text-lg font-semibold">Launch Settings</Card.Title>
    <Card.Description>
      Configure advanced Launch Settings for NeuzOS.
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-6">
    <section class="space-y-3">
      <div class="space-y-1">
        <h3 class="text-base font-semibold">Default Launch Mode</h3>
        <p class="text-sm text-muted-foreground">Configure the Default Launch Mode.</p>
      </div>

      <div class="flex items-center justify-between py-2">
        <div class="space-y-0.5">
          <Label for="session-launcher-mode" class="text-sm font-medium">Session Launcher Mode</Label>
          <p class="text-xs text-muted-foreground">
            Launch directly into the Session Launcher instead of the Main Window.
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

      {#if userAgentEnabled}
        <Alert.Root>
          <AlertCircleIcon class="h-4 w-4"/>
          <Alert.Title>Important before Changing the User Agent!</Alert.Title>
          <Alert.Description>
            In some cases logged in Sessions might become invalid with a new User Agent.
          </Alert.Description>
        </Alert.Root>
      {/if}

      <div class="flex items-center justify-between py-2">
        <div class="space-y-0.5">
          <Label for="custom-user-agent" class="text-sm font-medium">Custom User Agent</Label>
          <p class="text-xs text-muted-foreground">
            Enable Custom User Agent
          </p>
        </div>
        <Switch
          id="custom-user-agent"
          checked={userAgentEnabled}
          onCheckedChange={handleUserAgentToggle}
        />
      </div>

      <div class="space-y-2">
        <Label for="user-agent-input" class="text-xs">User Agent String</Label>
        <div class="relative">
          <Input
            id="user-agent-input"
            type="text"
            placeholder="Enter custom user agent..."
            value={userAgentValue}
            disabled={!userAgentEnabled}
            oninput={(e) => {
              const target = e.target as HTMLInputElement;
              handleUserAgentInput(target.value);
            }}
            class="h-8 w-full pr-10 text-sm disabled:opacity-60"
          />
          {#if userAgentEnabled && !isDefaultUserAgent(userAgentValue)}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="absolute right-0 top-0 h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Restore Default"
              onclick={restoreDefaultUserAgent}
            >
              <RotateCcw class="h-4 w-4"></RotateCcw>
            </Button>
          {/if}
        </div>
        {#if userAgentEnabled}
          <p class="text-xs text-muted-foreground">
            Default: <code class="bg-muted px-1 py-0.5 rounded text-xs">{defaultUserAgent}</code>
          </p>
        {/if}
      </div>
    </section>

    <Separator/>

    <section class="space-y-3">
      <div class="space-y-1">
        <h3 class="text-base font-semibold">Command Line Switches</h3>
        <p class="text-sm text-muted-foreground">
          Manage Chromium Command Line Switches to customize Browser behavior.
        </p>
      </div>

      {#if commandLineSwitchesEnabled}
        <Alert.Root>
          <AlertCircleIcon class="h-4 w-4"/>
          <Alert.Title>Important Note!</Alert.Title>
          <Alert.Description>
            Changes to these Settings will only take effect the next time you start NeuzOS.
          </Alert.Description>
        </Alert.Root>
      {/if}

      <div class="flex items-center justify-between py-2">
        <div class="space-y-0.5">
          <Label for="command-line-switches" class="text-sm font-medium">Command Line Switches</Label>
          <p class="text-xs text-muted-foreground">Enable Command Line Switches</p>
        </div>
        <Switch
          id="command-line-switches"
          checked={commandLineSwitchesEnabled}
          onCheckedChange={handleCommandLineSwitchesToggle}
        />
      </div>

      {#if commandLineSwitchesEnabled}
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
      {/if}
    </section>
  </Card.Content>
</Card.Root>
