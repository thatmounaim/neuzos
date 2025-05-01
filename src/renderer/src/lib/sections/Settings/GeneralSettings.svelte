<script lang="ts">
  import { Label } from '$lib/components/ui/label'
  import { Switch } from '$lib/components/ui/switch'

  import { onMount } from 'svelte'

  let browserEnabled: boolean | null = null
  let autofocusEnabled: boolean | null = null
  onMount(() => {
    setBrowserEnabled(parseInt(localStorage.getItem('browserEnabled') ?? '0') == 1)
    setAutofocusEnabled(parseInt(localStorage.getItem('autofocusEnabled') ?? '0') == 1)
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

  $: browserEnabledEffect = setBrowserEnabled(browserEnabled)
  $: autofocusEnabledEffect = setAutofocusEnabled(autofocusEnabled)
</script>

<section class="py-4">
  <div class="flex items-center space-x-2">
    <Label for="browser-enabled">Browser Enabled</Label>
    <Switch
      id="browser-enabled"
      bind:checked={browserEnabled}
      data-getridofunused={browserEnabledEffect}
    />
  </div>
  <div class="flex items-center space-x-2">
    <Label for="browser-enabled">Auto Focus Enabled</Label>
    <Switch
      id="autofocus-enabled"
      bind:checked={autofocusEnabled}
      data-getridofunused={autofocusEnabledEffect}
    />
  </div>
</section>
