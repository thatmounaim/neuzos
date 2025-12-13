# Builtin Widgets

This directory contains all builtin widgets for the application. Each widget is organized into its own folder with dedicated components to keep widget-specific logic contained and organized.

## Widget Structure

Each widget folder follows this structure:

```
WidgetName/
├── Widget.svelte         # Main widget component (the floating window and functionality)
└── DropdownItem.svelte   # Dropdown menu item component (for the widgets dropdown)
```

### Components

1. **Widget.svelte**: The main widget component that contains:
   - The widget's UI and functionality
   - FloatingWindow wrapper
   - All widget-specific logic
   - State management (localStorage, etc.)
   - Props: `visible`, `onClose`, `onHide`, `data`

2. **DropdownItem.svelte**: The dropdown menu component that contains:
   - Logic for creating new widget instances
   - Display of active widget instances
   - Show/hide and close controls for active widgets
   - All dropdown-specific logic (no props needed - uses contexts)

## Available Widgets

### FCoinCalculator
A calculator for converting between FCoin and Penya currencies.
- **Type**: Singleton (only one instance allowed)
- **Features**: Persistent rate storage, bidirectional conversion

### Notepad
A multi-tab text editor with file management.
- **Type**: Singleton (only one instance allowed)
- **Features**: Multiple tabs, file renaming, persistent storage

### MiniBrowser
A mini web browser using webview.
- **Type**: Instanced (multiple instances allowed)
- **Features**: Navigation controls, favorites management, instance numbering

### ActionPad
A customizable action pad for triggering in-game actions.
- **Type**: Instanced per session (one per game session)
- **Features**: Action buttons with cooldowns, row organization, session-specific
- **Special**: Requires session data, displays skill icons and timers

## Usage

### In WidgetsManager.svelte
Import and use the Widget components:
```svelte
import FCoinCalculatorWidget from "../Widgets/Builtin/FCoinCalculator/Widget.svelte";
import NotepadWidget from "../Widgets/Builtin/Notepad/Widget.svelte";
// etc...

<FCoinCalculatorWidget
  visible={widget.visible}
  data={widget.data}
  onClose={() => widgetsContext.destroyWidget(widget.id)}
  onHide={() => widgetsContext.hideWidget(widget.id)}
/>
```

### In WidgetsDropdownContent.svelte
Import and use the DropdownItem components:
```svelte
import FCoinCalculatorDropdownItem from '../Builtin/FCoinCalculator/DropdownItem.svelte';
import NotepadDropdownItem from '../Builtin/Notepad/DropdownItem.svelte';
// etc...

<DropdownMenu.Group>
  <FCoinCalculatorDropdownItem />
  <NotepadDropdownItem />
  <MiniBrowserDropdownItem />
  <ActionPadDropdownItem />
</DropdownMenu.Group>
```

## Adding a New Widget

To add a new widget:

1. Create a new folder: `YourWidget/`
2. Create `Widget.svelte` with the widget functionality
3. Create `DropdownItem.svelte` with the dropdown menu logic
4. Import both components in `WidgetsManager.svelte` and `WidgetsDropdownContent.svelte`
5. Add the widget type handling in `WidgetsManager.svelte`
6. Add the dropdown item in `WidgetsDropdownContent.svelte`

## Widget Types

- **Singleton**: Only one instance can exist (FCoinCalculator, Notepad)
- **Instanced**: Multiple instances allowed (MiniBrowser)
- **Session-Instanced**: One instance per game session (ActionPad)

## Benefits of This Structure

✅ **Organized**: Each widget's code is contained in its own folder
✅ **Maintainable**: Easy to find and modify widget-specific code
✅ **Reusable**: Clear separation between widget logic and dropdown logic
✅ **Scalable**: Adding new widgets follows a consistent pattern
✅ **Type-safe**: Each component has well-defined props and interfaces

