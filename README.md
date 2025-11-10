# NeuzOS

[![Latest Releases](https://img.shields.io/static/v1?label=&message=Latest+Releases&color=2ea44f&style=for-the-badge&logo=electron&logoColor=fff)](https://github.com/thatmounaim/neuzos/releases)
[![Community & Help - Join Discord](https://img.shields.io/static/v1?label=&message=Join+Discord+Community&color=2ea44f&style=for-the-badge&logo=discord&logoColor=fff)](https://discord.gg/k3EY7Z6MMP)
[![Ko-Fi - Support NeuzOS](https://img.shields.io/static/v1?label=&message=Support+NeuzOS&color=2ea44f&style=for-the-badge&logo=ko-fi&logoColor=fff)](https://ko-fi.com/D1D21NY2ZD)

An Electron WebView based Multi Client for Flyff Universe with Svelte and TypeScript.

<img src="resources/icon.png" alt="neuzos logo" width="100"/>

**Note: A v2 is in Development that will adress many of the issues with the current one.**

## How to Use

[Shiraho's Youtube Video on NeuzOS](https://youtu.be/nu7v5rQQFcI)
Thank you Shiraho for the Showcase

## Features
- Avoid accidental exit
  - Press X on title bar to exit.
  - Press your operating system window closing shortcut 3 times in a row to quit.
    - Example windows: Alt+F4 x3
    - Example macos: CmdOrCtrl+Q x3
- Multi session management with unique session for each character.
  - Icon for each session
  - Launch URL over-write.
    - Chose either to have a unique data partition or share the browser partition.
      - Example : having sessions for youtube, netflix ... will bloat your disk with extra size so its better to share the browser partition in this case. 
  - Clear data for the session
  - Clear cache for the session
    
- Layout System To Launch your sessions in any layout you see fit.
  - Add Layout
  - Chose an icon for each layout
  - Chose a name for each layout
  - Add rows
    - Add a session for each row
      
- Focus session on hover in main neuzos webviews.
  
- Right Click on a Layout Tab To Show Context Menu :
  - Mass actions :
    - Stop / Start all session in layout
    - Mute / Unmute all sessions in a layout
  - Per session actions :
    - Stop/Start , Mute/Unmute
  - Tab actions :
    - Move Right/Left
    - Close
      
- TODO: Launch a Session in Its own dedicated window + focus mode
- TODO: Ctrl + Tab or Bindable SHortcuts for Fast Swapping Between Layouts
- TODO: Bindable Shortcut per Layout to swap to
- TODO: Floating Widgets:
    - FCoin<->Penya Calculator
    - Pet Candy Cost Calculator
    - Integrated Browser :
      - Community Shortcuts for The Browser
          - Flyffipedia
          - Flyffulator
          - SiegeStats

## Download Pre-compiled Binaries

[View Latest Releases](https://github.com/thatmounaim/neuzos/releases)
## Project Setup - Build From Source

### Clone Project Repository
```bash
$ git clone https://github.com/thatmounaim/neuzos.git
```

### Install Dependencies

```bash
$ bun install
$ bun postinstall
```

### Build

```bash
# For windows
$ bun build:win

# For macOS
$ bun build:mac

# For Linux
$ bun build:linux
```

## Dev Notes

The base of the project was generate with [electron-vite](https://electron-vite.org/) using the Svelte Template

Some TS Warnings might appear in editor, found it okay to ignore, will give more importance to then in future.

```bash
# Run Devmode
$ bun dev
```
