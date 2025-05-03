<script lang="ts">
  import { Label } from '$lib/components/ui/label'
  import { Switch } from '$lib/components/ui/switch'

  import { onMount } from 'svelte'

  let browserEnabled: boolean | null = null
  let autofocusEnabled: boolean | null = null
  let zenModeFull: boolean | null = null

  onMount(() => {
    setBrowserEnabled(parseInt(localStorage.getItem('browserEnabled') ?? '0') == 1)
    setAutofocusEnabled(parseInt(localStorage.getItem('autofocusEnabled') ?? '0') == 1)
    setZenModeFull(parseInt(localStorage.getItem('zenModeFull') ?? '0') == 1)
  })

  function setBrowserEnabled(newChecked: boolean | null) {
    if (newChecked == null) return null

    browserEnabled = newChecked
    localStorage.setItem('browserEnabled', browserEnabled ? '1' : '0')
    return browserEnabled
  }

  function setAutofocusEnabled(newChecked: boolean | null) {
    if (newChecked == null) return null

    autofocusEnabled = newChecked
    localStorage.setItem('autofocusEnabled', autofocusEnabled ? '1' : '0')
    return autofocusEnabled
  }

  function setZenModeFull(newChecked: boolean | null) {
    if (newChecked == null) return null

    zenModeFull = newChecked
    localStorage.setItem('zenModeFull', zenModeFull ? '1' : '0')
    return zenModeFull
  }


  $: browserEnabledEffect = setBrowserEnabled(browserEnabled)
  $: autofocusEnabledEffect = setAutofocusEnabled(autofocusEnabled)
  $: zenModeFullEffect = setZenModeFull(zenModeFull)
</script>

<section class="py-4 flex flex-col gap-4 px-4">
  <div class="flex items-center space-x-2">
    <Label for="browser-enabled" class="min-w-56">Browser {browserEnabled ? '[Enabled]' : '[Disabled]'}</Label>
    <Switch
      id="browser-enabled"
      bind:checked={browserEnabled}
      data-getridofunused={browserEnabledEffect}
    />
  </div>
  <div class="flex items-center space-x-2">
    <Label for="browser-enabled" class="min-w-56">Auto Focus {autofocusEnabled ? '[Enabled]' : '[Disabled]'}</Label>
    <Switch
      id="autofocus-enabled"
      bind:checked={autofocusEnabled}
      data-getridofunused={autofocusEnabledEffect}
    />
  </div>
  <div class="flex items-center space-x-2">
    <Label for="browser-enabled" class="min-w-56">Zen Mode {zenModeFull ? '[Fullscreen]' : '[Windowed]'} </Label>
    <Switch
      id="autofocus-enabled"
      bind:checked={zenModeFull}
      data-getridofunused={zenModeFullEffect}
    />
  </div>
</section>
