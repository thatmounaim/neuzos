<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import {Switch} from "$lib/components/ui/switch";
  import {Input} from "$lib/components/ui/input";
  import {Label} from "$lib/components/ui/label";
  import * as Alert from "$lib/components/ui/alert";
  import {AlertCircleIcon} from "@lucide/svelte";

  import {getContext, onMount} from "svelte";
  import {getElectronContext} from "$lib/contexts/electronContext";
  import type {NeuzConfig} from "$lib/types";

  const electronApi = getElectronContext();
  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");

  let userAgentEnabled = $state(false);
  let userAgentValue = $state("");
  let defaultUserAgent = "";

  // Get the default user agent when component mounts
  onMount(async () => {
    // Get the default user agent from Electron's webContents
    try {
      defaultUserAgent = await electronApi.invoke("app.get_default_user_agent");
    } catch (e) {
      // Fallback to a standard user agent if the above fails
      defaultUserAgent = navigator.userAgent;
    }

    // Initialize state based on config
    if (neuzosConfig.userAgent) {
      userAgentEnabled = true;
      userAgentValue = neuzosConfig.userAgent;
    } else {
      userAgentEnabled = false;
      userAgentValue = defaultUserAgent;
    }
  });

  // Handle switch toggle
  function handleUserAgentToggle(enabled: boolean) {
    userAgentEnabled = enabled;
    if (enabled) {
      // When enabling, populate with default if empty
      if (!userAgentValue || userAgentValue === "") {
        userAgentValue = defaultUserAgent;
      }
      neuzosConfig.userAgent = userAgentValue;
    } else {
      // When disabling, remove from config
      delete neuzosConfig.userAgent;
    }
  }

  // Handle input changes
  function handleUserAgentInput(value: string) {
    userAgentValue = value;
    if (userAgentEnabled) {
      neuzosConfig.userAgent = value;
    }
  }
</script>

<Card.Root class="h-full overflow-y-auto">
  <Card.Header>
    <Card.Title class="text-lg font-semibold">User Agent Settings</Card.Title>
    <Card.Description class="flex flex-col">
      <p>Configure custom user agent string for webviews and sessions.</p>
        <Alert.Root variant="destructive" class="mt-4">
          <AlertCircleIcon/>
          <Alert.Title>Important before changing the user agent.</Alert.Title>
          <Alert.Description class="pt-2">
            <ul>
              <li>- In some cases all your currently logged in sessions might will become invalid with a new user agent.</li>
            </ul>
          </Alert.Description>
        </Alert.Root>
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <Table.Root>
      <Table.Body>
        <Table.Row>
          <Table.Cell class="font-medium">Custom User Agent</Table.Cell>
          <Table.Cell class="text-sm text-muted-foreground">
            Enable custom user agent for all webviews and sessions
          </Table.Cell>
          <Table.Cell class="text-right">
            <Switch
              id="custom-user-agent"
              checked={userAgentEnabled}
              onCheckedChange={handleUserAgentToggle}
            />
          </Table.Cell>
        </Table.Row>
        <p class="text-xs text-muted-foreground mt-2">
          When disabled, the default Electron user agent will be used.
        </p>
      </Table.Body>
    </Table.Root>

    {#if userAgentEnabled}
      <div class="space-y-2">
        <Label for="user-agent-input">User Agent String</Label>
        <Input
          id="user-agent-input"
          type="text"
          placeholder="Enter custom user agent..."
          bind:value={userAgentValue}
          oninput={(e) => handleUserAgentInput(e.target.value)}
          class="w-full"
        />
        <p class="text-xs text-muted-foreground">
          Current default: <code class="bg-muted px-1 py-0.5 rounded text-xs">{defaultUserAgent}</code>
        </p>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
