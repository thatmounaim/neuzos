# IPC Channels: Quest Log UX & Creation Flow Enhancement

**Phase**: 1 — Design
**Date**: 2026-04-22

---

## No new IPC channels required

This feature is entirely renderer-side. All data access uses existing Svelte context:

| Data needed | Source | Access method |
|-------------|--------|---------------|
| All configured sessions | `mainWindowState.sessions` | `getContext<MainWindowState>('mainWindowState')` |
| Sidebar side preference | `questPanelContext.sidebarSide` | `getQuestPanelContext()` (already used in `QuestPanel.svelte`) |

## Existing channels used (unchanged)

No existing IPC channels are called or modified by this feature. The `addCharacter()` call is local to `questPanelContext` and persists to `localStorage` — it does not go through IPC.

## Channels explicitly NOT added

| Channel that could have been added | Reason rejected |
|------------------------------------|-----------------|
| `quest_panel.get_sessions` | `mainWindowState` is already in Svelte context — IPC would be redundant |
| `quest_panel.save_icon` | Icon slug is local UI state during creation; CharacterState schema unchanged |
