# NeuzOS

An Electron WebView based Multi Client for Flyff Universe with Svelte and TypeScript.

<img src="resources/icon.png" alt="neuzos logo" width="100"/>

#### Join our discord if you need help : https://discord.gg/k3EY7Z6MMP

## Features
- Multi Session Management with Unique Session for Each Character
- Layout System To Launch your sessions in any layout you see fit
- Ctrl + Tab for Fast Swapping Between Layouts
- Right Click on a Layout Tab to Close, Restart a Session
- Light Mode / Dark Mode Themes

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
