<script lang="ts">
  import Input from '$lib/components/ui/input/input.svelte'
  import { onMount } from 'svelte'

  const widgetStoragePath = 'widget_data.internal_fcoin_calculator'

  let fcoin_rate: number = 0 // 1 Fcoin = X Penya
  let fcoin: number = 1
  let penya: number = 0
  let fcoin_onek_rate: number = 0 // 1k Fcoin = Y Penya

  // Formatted string values for display
  let fcoinDisplay = ''
  let penyaDisplay = ''
  let rateDisplay = ''

  const formatter = new Intl.NumberFormat('de-DE')

  function updateDisplays() {
    fcoinDisplay = formatter.format(fcoin)
    penyaDisplay = formatter.format(penya)
    fcoin_onek_rate = fcoin_rate * 1000 // convert 1FC rate to 1kFC rate
    rateDisplay = formatter.format(fcoin_onek_rate)
  }

  function parseFormatted(value: string): number {
    return parseFloat(value.replaceAll('.', '').replace(',', '.')) || 0
  }

  function handleFcoinInput(e: Event) {
    fcoinDisplay = (e.target as HTMLInputElement).value
    fcoin = parseFormatted(fcoinDisplay)
    penya = fcoin * fcoin_rate
    updateDisplays()
  }

  function handlePenyaInput(e: Event) {
    penyaDisplay = (e.target as HTMLInputElement).value
    penya = parseFormatted(penyaDisplay)
    fcoin = penya / fcoin_rate
    updateDisplays()
  }

  function handleRateInput(e: Event) {
    rateDisplay = (e.target as HTMLInputElement).value
    fcoin_onek_rate = parseFormatted(rateDisplay)
    fcoin_rate = fcoin_onek_rate / 1000
    penya = fcoin * fcoin_rate
    localStorage.setItem(widgetStoragePath + '.fcoin_rate', fcoin_rate.toString())
    updateDisplays()
  }

  onMount(() => {
    fcoin_rate = parseFloat(localStorage.getItem(widgetStoragePath + '.fcoin_rate') ?? '0')
    penya = fcoin * fcoin_rate
    updateDisplays()
  })
</script>

<div class="flex flex-col gap-1">
  <label>Rate (1,000 FC = X Penya): </label>
  <Input type="text" value={rateDisplay} on:input={handleRateInput} />

  <label>FCoin:</label>
  <Input type="text" value={fcoinDisplay} on:input={handleFcoinInput} />

  <label>Penya:</label>
  <Input type="text" value={penyaDisplay} on:input={handlePenyaInput} />
</div>
