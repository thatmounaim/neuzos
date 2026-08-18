<script lang="ts">
  import ViewerWebview from './ViewerWebview.svelte';
  import { FLYFF_CALCULATORS_URL } from '$lib/utils/viewerConstants';

  interface Props {
    onLoadingChange?: (value: boolean) => void;
  }

  let { onLoadingChange }: Props = $props();
</script>

<div class="flex h-full min-h-0 w-full flex-col bg-background">
  <div class="min-h-0 flex-1">
    <ViewerWebview src={FLYFF_CALCULATORS_URL} injectCss={false} onLoadingChange={onLoadingChange} />
  </div>
</div>