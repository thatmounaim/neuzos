<script lang="ts">
  import HomePage from "./MainWindowSections/HomePage.svelte";
  import FloatingWindowsPortal from "./MainWindowSections/FloatingWindowsPortal.svelte";
  import WidgetsManager from "../Widgets/Core/WidgetsManager.svelte";
  import LayoutsContainer from "./MainWindowSections/LayoutsContainer.svelte";
  import QuestPanel from "../QuestLog/QuestPanel.svelte";
  import {getQuestPanelContext} from "$lib/contexts/questPanelContext.svelte";
  const questPanel = getQuestPanelContext();
</script>

<div class="flex flex-1 p-4 relative {questPanel.sidebarSide === 'right' ? 'flex-row-reverse' : ''}">
  <FloatingWindowsPortal>
    <WidgetsManager/>
  </FloatingWindowsPortal>

  <HomePage/>

  <LayoutsContainer />
  {#if questPanel.isOpen}
    <QuestPanel />
  {/if}
</div>
