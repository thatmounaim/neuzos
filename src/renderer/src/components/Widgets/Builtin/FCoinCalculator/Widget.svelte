<script lang="ts">
  import FloatingWindow from '../../../Shared/FloatingWindow.svelte';
  import {Input} from '$lib/components/ui/input';
  import {Label} from '$lib/components/ui/label';
  import {Coins} from '@lucide/svelte';
  import {formatPenya, parsePenya, formatPenyaInput} from '$lib/utils/format';
  interface Props {
    visible?: boolean;
    onClose?: () => void;
    onHide?: () => void;
    data?: any;
  }
  let { visible = true, onClose, onHide, data: _data }: Props = $props();
  const WIDGET_IDENTIFIER = 'widget.builtin.fcoin_calculator';
  const RATE_STORAGE_KEY = WIDGET_IDENTIFIER + '.rate';
  let windowRef: FloatingWindow;
  function loadRate(): number {
    try {
      const stored = localStorage.getItem(RATE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.rate || 180000000;
      }
    } catch (e) {
      console.error('Failed to load FCoin rate from localStorage:', e);
    }
    return 180000000;
  }
  function saveRate(newRate: number) {
    try {
      localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify({rate: newRate}));
    } catch (e) {
      console.error('Failed to save FCoin rate to localStorage:', e);
    }
  }
  let rate = $state(loadRate());
  let fcoin = $state(0);
  let penya = $state(0);
  let lastModified: 'rate' | 'fcoin' | 'penya' = 'fcoin';
  let rateInput = $state(formatPenya(rate));
  let fcoinInput = $state('0');
  let penyaInput = $state('0');
  function handleRateInput(e: Event) {
    const input = e.target as HTMLInputElement;
    rateInput = formatPenyaInput(input, input.value);
    const newRate = parsePenya(rateInput);
    if (newRate > 0 && newRate !== rate) {
      const prevLastModified = lastModified;
      rate = newRate;
      saveRate(rate);
      if (prevLastModified === 'fcoin' && fcoin > 0) {
        penya = (fcoin * rate) / 1000;
        penyaInput = formatPenya(penya);
      } else if (prevLastModified === 'penya' && penya > 0) {
        fcoin = (penya * 1000) / rate;
        fcoinInput = formatPenya(fcoin);
      }
    }
  }
  function handleFCoinInput(e: Event) {
    const input = e.target as HTMLInputElement;
    fcoinInput = formatPenyaInput(input, input.value);
    const newFCoin = parsePenya(fcoinInput);
    if (newFCoin !== fcoin) {
      fcoin = newFCoin;
      lastModified = 'fcoin';
      if (rate > 0) {
        penya = (fcoin * rate) / 1000;
        penyaInput = formatPenya(penya);
      }
    }
  }
  function handlePenyaInput(e: Event) {
    const input = e.target as HTMLInputElement;
    penyaInput = formatPenyaInput(input, input.value);
    const newPenya = parsePenya(penyaInput);
    if (newPenya !== penya) {
      penya = newPenya;
      lastModified = 'penya';
      if (rate > 0) {
        fcoin = (penya * 1000) / rate;
        fcoinInput = formatPenya(fcoin);
      }
    }
  }
  export function reset() {
    windowRef?.reset();
  }
</script>
<div style="display: {visible ? 'block' : 'none'};">
  <FloatingWindow
    bind:this={windowRef}
    persistId={WIDGET_IDENTIFIER}
    defaultX={200}
    defaultY={150}
    defaultWidth={320}
    defaultHeight={300}
    onClose={onClose}
    onHide={onHide}
    resizable={false}
  >
    {#snippet titleSnippet()}
      <div class="flex items-center gap-2">
        <Coins size={16}/>
        <span>FCoin Calculator</span>
      </div>
    {/snippet}
    <div class="space-y-3">
      <div class="space-y-1">
        <Label for="rate" class="text-xs font-medium">
          Rate (Penya per 1 000 FCoin)
        </Label>
        <Input
          id="rate"
          type="text"
          value={rateInput}
          oninput={handleRateInput}
          placeholder="180 000 000"
          class="font-mono h-8 text-sm"
        />
      </div>
      <div class="space-y-1">
        <Label for="fcoin" class="text-xs font-medium">
          FCoin
        </Label>
        <Input
          id="fcoin"
          type="text"
          value={fcoinInput}
          oninput={handleFCoinInput}
          placeholder="0"
          class="font-mono h-8 text-sm"
        />
      </div>
      <div class="space-y-1">
        <Label for="penya" class="text-xs font-medium">
          Penya
        </Label>
        <Input
          id="penya"
          type="text"
          value={penyaInput}
          oninput={handlePenyaInput}
          placeholder="0"
          class="font-mono h-8 text-sm"
        />
      </div>
      <div class="p-2 bg-muted rounded text-[10px] text-muted-foreground space-y-0.5">
        <div><strong>1 FCoin</strong> {'<->'} <strong>{formatPenya(rate / 1000)}</strong> Penya</div>
      </div>
    </div>
  </FloatingWindow>
</div>
