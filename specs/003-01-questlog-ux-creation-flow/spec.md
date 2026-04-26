# Feature Specification: Quest Log UX & Creation Flow Enhancement

**Parent Branch**: `003-integrated-wiki-sheet-viewer`
**Spec Directory**: `specs/003-01-questlog-ux-creation-flow`
**Created**: 2026-04-22
**Status**: Draft

---

## Clarifications

### Session 2026-04-22

- Q: Should the TODO checklist be placed first, last, or kept in the middle? → A: First.
- Q: Should selecting a session immediately create the Quest Log entry, or only pre-fill the form first? → A: Selecting a session only pre-fills name and icon; the user then confirms creation.
- Q: Should the icon field allow manual slug typing or only combobox selection? → A: Icon is selected only from the combobox; no manual slug typing.
- Q: Should the session dropdown show all configured sessions or only active ones? → A: Show all configured sessions, including not currently running ones.
- Q: Should the Quest Log icon picker reuse the exact existing Settings icon combobox component or be a new one? → A: Reuse the exact existing component.

## Context

The Quest Log panel (sidebar) lets players track quest progress per character. The current creation flow has two friction points:

1. The **TODO checklist** should be pinned above the character-selection tab row so it no longer splits the creation and navigation controls from the quest-list content.
2. Creating a new Quest Log entry requires fully manual text input and is limited to a small hardcoded set of class icons, making it slow when the user already has a matching session configured in neuzOS.

This spec defines the improvements to fix both issues and is intended to land on the same PR as the QuestLog / Navi Guide / Flyffipedia feature branch (003).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — TODO Section Stays at the Top (Priority: P1)

A player opens the Quest Log sidebar. They want the TODO checklist to stay above the character tabs, keeping the creation/navigation controls visually grouped together and out of the way of the quest list.

**Why this priority**: Layout clarity is baseline usability. This change is a single repositioning with no new data model and unblocks the visual coherence needed for stories 2 and 3.

**Independent Test**: Open the Quest Log panel and verify that the TODO checklist appears above the character tabs and never between the tab row and the quest list.

**Acceptance Scenarios**:

1. **Given** the Quest Log panel is open, **When** the user looks at the panel layout, **Then** the TODO checklist is visually grouped at the top of the panel, above the character tabs.
2. **Given** the Quest Log panel is open with multiple characters tabbed, **When** the user switches character tabs, **Then** no TODO section appears between the character row and the quest content.
3. **Given** the panel is in its default state on first launch, **When** no characters exist yet, **Then** the TODO section still appears at its fixed position (top) rather than floating mid-panel.

---

### User Story 2 — One-Click Quest Log Entry via Session Pre-fill (Priority: P1)

A player has several sessions already configured in neuzOS (e.g. "Warrior", "Mage1"). They want to add a matching Quest Log entry quickly without retyping the name or hunting for the right icon.

**Why this priority**: This is the core UX win described by the maintainer — reducing Quest Log creation to a single selection action when a matching session already exists.

**Independent Test**: Click the add-entry button, select a session from the combobox, and confirm creation. The resulting Quest Log entry must have the same name and icon as the selected session without any additional user input.

**Acceptance Scenarios**:

1. **Given** at least one session is configured in neuzOS, **When** the user opens the Quest Log creation form, **Then** a combobox listing all configured sessions is displayed.
2. **Given** the creation form is open, **When** the user selects a session from the combobox, **Then** the name field is automatically populated with the session's label and the icon field is automatically set to the session's icon.
3. **Given** the creation form has been pre-filled via session selection, **When** the user confirms creation, **Then** the new Quest Log entry appears in the character tab row with the session's label and icon.
4. **Given** the creation form is open with a session pre-filled, **When** the user modifies the name or icon fields before confirming, **Then** the modified values (not the session originals) are saved.
5. **Given** no sessions are configured in neuzOS, **When** the user opens the creation form, **Then** the session combobox is either hidden or shows an empty-state label; custom creation remains fully available.

---

### User Story 3 — Visual Icon-Selector for Custom Quest Log Creation (Priority: P2)

A player wants to create a Quest Log entry that does not correspond to any existing session. They need to pick an icon from the full library rather than typing an icon slug manually.

**Why this priority**: Improves custom creation quality but is secondary to the session pre-fill path which covers the most common case.

**Independent Test**: Open the creation form, leave the session combobox unselected, and interact with the icon field. A searchable visual combobox showing all available icons must appear, and the user must choose an icon from the combobox rather than typing a raw icon slug.

**Acceptance Scenarios**:

1. **Given** the creation form is open, **When** the user clicks on the icon field, **Then** the exact same icon picker component used in Session Actions settings opens, showing the full icon library with search.
2. **Given** the icon combobox is open, **When** the user types in the search box, **Then** the icon list filters in real time to show only icons whose names match the query.
3. **Given** the user selects an icon from the combobox, **When** the combobox closes, **Then** the selected icon is shown as a preview in the creation form.
4. **Given** no icon has been manually selected yet, **When** the session combobox auto-fills the icon, **Then** that icon is displayed in the same visual icon-selector field (consistent appearance), and the user can still replace it by choosing a different icon from the combobox.

---

### Edge Cases

- What happens when a session is deleted after a Quest Log entry was created from it? — The Quest Log entry remains unchanged; it is a copy, not a live reference to the session.
- What happens when two sessions share the same label? — Both appear in the combobox; the user selects the intended one. Name deduplication is not required.
- What happens when the icon selected via session pre-fill uses a CSS filter (tinted icon)? — The filter is carried over to the Quest Log entry, displaying the same tinted icon.
- What happens when the user opens the creation form, pre-fills from a session, then switches to a different session in the combobox? — The name and icon fields are overwritten with the new session's values.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The TODO checklist MUST be repositioned to the top of the Quest Log panel, above the character tab row, so it never appears between the character tab row and the quest list.
- **FR-002**: The Quest Log creation form MUST include a session-selection combobox that lists all sessions currently configured in the application.
- **FR-003**: When the user selects a session from the combobox, the name field and icon field in the creation form MUST be automatically populated with that session's label and icon respectively.
- **FR-004**: The session-selection combobox MUST show a clear empty state (or be hidden) when no sessions are configured, and must not block access to custom creation.
- **FR-005**: The icon field in the Quest Log creation form MUST be replaced by a visual icon-selector combobox providing access to the full application icon library.
- **FR-006**: The visual icon-selector MUST support text-based filtering to allow users to search icons by name.
- **FR-007**: The icon-selector combobox MUST reuse the exact existing icon picker component from the Session Actions settings panel — not a reimplementation of equivalent behavior.
- **FR-008**: Custom creation (manual name entry + icon-selector combobox selection) MUST remain available independently of the session combobox.

### ToS Compliance (NeuzOS-specific — mandatory)

**"One Input = One Action" declaration**:

> This feature involves no in-game input. All changes are limited to the Quest Log sidebar UI and its creation form — no game actions are dispatched and no `webContents.sendInputEvent()` calls are made.

- Does this feature synthesize any game inputs? **No**
- Forbidden patterns checked: automated chains ✅, image recognition ✅, AFK loops ✅ — all absent.

### Key Entities

- **Quest Log Entry (Character)**: A named, icon-tagged record that tracks quest progress for one in-game character. Attributes: id, name, icon, flyff class, level, quest state. Exists independently after creation; not linked to any session at runtime.
- **Session**: A configured game-client slot in neuzOS with a label and icon. Read-only from the Quest Log creation perspective — used only for pre-filling; not mutated.
- **TODO Checklist**: A character-scoped list of free-text tasks. Rendered within the Quest Log panel; its position in the panel layout is the subject of FR-001.
- **Icon Library**: The full set of icons available to neuzOS UI elements. Shared between Quest Log entries, Session Actions, and session configuration.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can create a new Quest Log entry fully pre-filled from a session in **2 or fewer interactions** (open form → select session → confirm).
- **SC-002**: The TODO checklist is **never** rendered between the character tab row and the quest-list content in any panel state (empty, single character, multi-character).
- **SC-003**: All icons available in the Session Actions icon picker are also accessible in the Quest Log creation icon-selector, with **no icons missing** between the two surfaces.
- **SC-004**: The creation form accepts a session pre-fill and allows the user to override name or icon before confirming — **100% of pre-filled values are editable**.

---

## Assumptions

- Session data (labels and icons) is already accessible within the Quest Log panel's rendering context; no new IPC channels are required.
- The icon set is static and fully enumerable at render time (no runtime icon discovery needed).
- The TODO checklist position ("top of panel") is the default; no user preference for top vs bottom is exposed in this iteration.
- The Quest Log panel is the only surface affected; the session-list and session creation flows in Main Settings are out of scope.
- This spec does not introduce any persistent link between a Quest Log entry and its originating session; the session is only used as a one-time data source during creation.
