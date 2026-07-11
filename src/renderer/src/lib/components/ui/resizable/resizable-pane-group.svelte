<script lang="ts">
	import * as ResizablePrimitive from "paneforge";
	import { cn } from "$lib/utils.js";
	import { paneforgePaneGroupStorage } from "$lib/localStorageStores";

	let {
		ref = $bindable(null),
		this: paneGroup = $bindable(),
		class: className,
		storage = paneforgePaneGroupStorage,
		...restProps
	}: ResizablePrimitive.PaneGroupProps & {
		this?: ResizablePrimitive.PaneGroup;
	} = $props();
</script>

<ResizablePrimitive.PaneGroup
	bind:this={paneGroup}
	data-slot="resizable-pane-group"
	class={cn("flex h-full w-full data-[direction=vertical]:flex-col", className)}
	{storage}
	{...restProps}
/>
