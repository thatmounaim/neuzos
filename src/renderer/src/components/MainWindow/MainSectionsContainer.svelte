<script lang="ts">
  import HomePage from "./MainWindowSections/HomePage.svelte";
  import FloatingWindowsPortal from "./MainWindowSections/FloatingWindowsPortal.svelte";
  import WidgetsManager from "../Widgets/Core/WidgetsManager.svelte";
  import LayoutsContainer from "./MainWindowSections/LayoutsContainer.svelte";
</script>

<div class="flex flex-1 p-4 relative">
  <FloatingWindowsPortal>
    <WidgetsManager />
  </FloatingWindowsPortal>
  <HomePage />
  <LayoutsContainer />
</div>
