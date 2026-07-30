# <img src="https://github.com/flyffu-community/neuzos/raw/main/resources/icon.png" width="50"/> NeuzOS

[![Latest Releases](https://img.shields.io/static/v1?label=&message=Latest+Releases&color=2ea44f&style=for-the-badge&logo=electron&logoColor=fff)](https://github.com/flyffu-community/neuzos/releases) [![Community & Help - Join Discord](https://img.shields.io/static/v1?label=&message=Join+Discord+Community&color=2ea44f&style=for-the-badge&logo=discord&logoColor=fff)](https://discord.gg/k3EY7Z6MMP)

An Electron WebView-based Multi-Client for Flyff Universe, built with Svelte and TypeScript.

Built-in Features designed to enhance Gameplay, improve Efficiency, and provide a smoother overall Experience.

## How to Use

NeuzOS is designed to be intuitive and easy to use.

If you still have Questions or any Issues, check the Guide Channels or ask in the Help Channel on our Discord Server.

## Features

### News Homescreen
- Flyff Universe Latest News directly on the Startup Homescreen

### Session & Layout Management

- Multi-Session Support
- Custom Icon per Session/Layout
- Custom Launch URL (Supports the Public Test Server with different Login URLs)
- Unique Data Partition per Session
- Clear Session Cache (Manually or Automatically on Startup)
- Create Layouts
- Auto-Focus Sessions on Mouse Hover within Layouts

### Widgets

#### FCoin Calculator

- Simple Tool to Calculate FCoin-to-Penya Rates

#### Notepad

- Lightweight Notepad for Quick Notes
- Supports Multiple Tabs
- Notes are Saved Automatically
- Basic Markdown Support
- Semi-Rich Text Editor with Additional Formatting Options
- Includes a Simple To-Do Template
- Switch Tab Direction (Vertical/Horizontal)

#### Quest Log

- Contributed by **Pepsi**
- Opens a Side Panel for Quick Access to Flyff Quest Information
- Manage Multiple Sessions and Configure your Class/Level
  - Set Recommendation Filters (Mandatory, Prioritize, On the Go, Skip, etc.)
  - View Required Quest Levels
  - Display Quests in Organized Groups or by Quest Chain
  - Show EXP Rewards for your Current Level
  - Track Quest Progress per Character/Session

#### To-Do

- Dedicated To-Do Widget for Creating To-Do Lists

#### Viewer Windows

- Open Dedicated Viewer Windows for Community Resources
	- Navi Guide – Monster Guide by **Navi2765**
	- Flyffipedia – Flyff Wiki by **Swaight**
	- Flyffulator - Character Simulator by **Frostiae**
	- Flyff Calculators - Upgrade Simulator by **Stellar**
	- Siege Stats - Statistics for PvP Players by **Shynox**
	- CS-Modelviewer - Character Modelviewer by **I9hdkill**

#### Mini Browser

- Fully Functional Browser inside NeuzOS
- Drag-and-Drop Positioning
- Supports Multiple Instances
- Ideal for Guides, YouTube, Netflix, and more
- Uses a Separate Browser Cache

#### Action Pins & Action Pads

- **Action Pins**
  - Display Session Actions in the Main Bar
  - See Cooldown Timers with Visual Feedback

- **Action Pads**
  - Draggable Action Interface (Similar to a Stream Deck Overlay)
  - Freely Positionable within the Window
  - Execute Assigned Session Actions with a Single Click
  - 1 Click -> 1 Action

### Interaction & Controls

- **Mass Actions**
	- Right-Click Layout Tab to Open Context Menu:
	- Start/Stop All Sessions in a Layout
	- Mute/Unmute All Sessions in a Layout

- **Per-Session Actions**
	- Start/Stop
	- Mute/Unmute

- **Tab Actions**
	- Move Left/Right
	- Close

### Additional Features

- Chromium Command-Line Switches

- Backup Function for:
	- Config-Data
	- Local Storage

- Launch Sessions in:
	- Dedicated Window
	- Focus Mode (Disabled Close Button)

- Floating Sessions
	- Drag-and-Drop Session Windows
	- Freely Resizable for Flexible Usage

- Keybinds
	- Switch to Last Used Layout
	- Switch to a Specific Layout
	- Toggle Fullscreen
	- And More...

### Command Line Support

```bash
--mode=session_launcher
--mode=session --session_id=<id>
--mode=focus --session_id=<id>
--mode=focus_fullscreen --session_id=<id>
```

## Project Setup - Build from Source

### Clone Project Repository

```bash
git clone https://github.com/flyffu-community/neuzos.git
```

### Install Dependencies

```bash
bun install
bun postinstall
```

### Build

```bash
# Windows
bun build:win

# macOS
bun build:mac

# Linux
bun build:linux
```

## Dev Notes

The Base of the Project was generate with [electron-vite](https://electron-vite.org/) using the Svelte Template

Some TypeScript Warnings may appear during Development. These are currently non-critical and can be ignored.

```bash
# Run Dev Mode
bun dev
```

## Credits
NeuzOS was Originally created by [thatmounaim](https://github.com/thatmounaim)


This Project is built by the Flyff Community, for the Flyff Community. 

Special Thanks to everyone who Contributes their Time and Effort to the Project. 

### Contributors
[Cezay](https://github.com/cezaay) • [Celteron](https://github.com/Celteron) • [Pepsi](https://github.com/egenvall)
