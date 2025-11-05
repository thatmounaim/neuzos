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
- Multi Session Management with Unique Session for Each Character
- Clear Data / Clear Cache per Session
- Layout System To Launch your sessions in any layout you see fit.
    - Hover On The Active Session makes it focused
- Launch a Session in Its own dedicated window
- Ctrl + Tab for Fast Swapping Between Layouts
- Right Click on a Layout Tab
    - Stop / Start all session in layout
    - Mute / Unmute all sessions in a layout
    - Per session submenu
    - Stop/Start , Mute/Unmute
    - Close Layout, Change Position in Navbar
- Light Mode / Dark Mode Themes
- Integrated Browser Tab
    - Default Homepage : DuckDuckGo
    - Community Shortcuts for The Browser
        - Flyffipedia
        - Flyffulator
        - SiegeStats
- Widgets:
    - FCoin Calculator

## Download Pre-compiled Binaries

[View Latest Releases](https://github.com/thatmounaim/neuzos/releases) 
## Project Setup - Build From Source

### Clone Project Repository
```bash
$ git clone https://github.com/thatmounaim/neuzos.git
```

### Install Dependencies

```bash
$ pnpm install
$ pnpm postinstall
```

### Build

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```

## Dev Notes 

The base of the project was generate with [electron-vite](https://electron-vite.org/) using the Svelte Template

Some TS Warnings might appear in editor, found it okay to ignore, will give more importance to then in future.

```bash
# Run Devmode
$ pnpm dev
```
