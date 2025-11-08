import {app, shell, BrowserWindow, Menu, session, ipcMain, globalShortcut, screen} from 'electron'
import {join} from 'path'
import {electronApp, optimizer, is} from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as fs from "node:fs";

let mainWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let neuzosConfig: any = null
const defaultNeuzosConfig = {
  sessions: [],
  layouts: [],
}
const configDirectoryPath = join(app.getPath('userData'), '/neuzos_config/')

if (!app.getPath('userData').includes('neuzos_config')) {
  fs.mkdirSync(configDirectoryPath, {recursive: true});
}

function loadConfig(reload: boolean = false): Promise<any> {
  return new Promise((resolve, reject) => {
    if (neuzosConfig && !reload) {
      resolve(neuzosConfig)
    } else {
      const configPath = join(configDirectoryPath, '/config.json')

      // Check if file exists first
      if (!fs.existsSync(configPath)) {
        // Create default config.json
        fs.writeFileSync(configPath, JSON.stringify(defaultNeuzosConfig, null, 2))
        neuzosConfig = JSON.parse(JSON.stringify(defaultNeuzosConfig))
        resolve(neuzosConfig)
      } else {
        // File exists, read it
        try {
          const conf = fs.readFileSync(configPath, 'utf8')
          neuzosConfig = JSON.parse(conf)
          resolve(neuzosConfig)
        } catch (err) {
          reject(err)
        }
      }
    }
  })
}

function saveConfig(conf: any) {
  const configPath = join(configDirectoryPath, '/config.json')
  fs.writeFileSync(configPath, JSON.stringify(conf, null, 2))
}

function createSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const toPixels = (units: number) => {
    return Math.floor(units / primaryDisplay.scaleFactor)
  }

  const {width, height} = primaryDisplay.workAreaSize
  const aspectRatio = width / height;

  const windowWidth = aspectRatio >= 2 ? width / 2 : width - width / 12;
  const windowHeight = height - height / 12

  // Create smaller window for settings
  settingsWindow = new BrowserWindow({
    width: toPixels(windowWidth),
    height: toPixels(windowHeight),
    show: false,
    frame: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? {icon} : {}),
    webPreferences: {
      zoomFactor: 1.0 / primaryDisplay.scaleFactor,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Fix for MacOS Command Shortcuts
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
  } else {
    Menu.setApplicationMenu(Menu.buildFromTemplate([{role: 'appMenu'}, {role: 'editMenu'}]))
    settingsWindow.setMenuBarVisibility(false)
  }

  settingsWindow.on('ready-to-show', () => {
    settingsWindow?.show()
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  settingsWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return {action: 'deny'}
  })

  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.webContents.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/settings.html')
  } else {
    settingsWindow.webContents.loadFile(join(__dirname, '../renderer/settings.html'))
  }
}

function createMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus()
    return
  }
  const primaryDisplay = screen.getPrimaryDisplay()
  const toPixels = (units: number) => {
    return Math.floor(units / primaryDisplay.scaleFactor)
  }

  const {width, height} = primaryDisplay.workAreaSize
  const aspectRatio = width / height;

  const windowWidth = aspectRatio >= 2 ? width / 2 : width - width / 12;
  const windowHeight = height - height / 12
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: toPixels(windowWidth),
    height: toPixels(windowHeight),
    show: false,
    frame: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? {icon} : {}),
    webPreferences: {
      zoomFactor: 1.0 / primaryDisplay.scaleFactor,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true,
    }
  })

  // Fix for MacOS Command Shortcuts
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
  } else {
    Menu.setApplicationMenu(Menu.buildFromTemplate([{role: 'appMenu'}, {role: 'editMenu'}]))
    mainWindow.setMenuBarVisibility(false)
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return {action: 'deny'}
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.webContents.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.webContents.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  try {
    await loadConfig(true)
  } catch (err) {
    console.error('Failed to load config:', err)
  }
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.neuzos')
  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })


  ipcMain.on('main_window.minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('main_window.maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow?.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('main_window.close', () => {
    globalShortcut.unregisterAll()
    mainWindow?.destroy();
    mainWindow = null;
  });

  ipcMain.on('main_window.reload_config', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.webContents.send("event.reload_config");
  })


  ipcMain.on('settings_window.open', (_) => {
    createSettingsWindow()
  })

  ipcMain.on('settings_window.close', () => {
    settingsWindow?.destroy()
    settingsWindow = null
  })

  ipcMain.on('settings_window.minimize', () => {
    settingsWindow?.minimize();
  });

  ipcMain.on('settings_window.minimize', () => {
    if (settingsWindow?.isMaximized()) {
      settingsWindow?.unmaximize();
    } else {
      settingsWindow?.maximize();
    }
  })


  ipcMain.on("tabs.add", (event, layoutId: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.webContents.send("event.layout_add", layoutId);
  })

  ipcMain.on("tabs.switch", (event, layoutId: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.webContents.send("event.layout_switch", layoutId);
  })

  ipcMain.on("tabs.close_all", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.webContents.send("event.layout_close_all");
  })

  ipcMain.on("tabs.close", (event, layoutId: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.webContents.send("event.layout_close", layoutId);
  })

  ipcMain.on("session.stop", (event, sessionId: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.webContents.send("event.stop_session", sessionId);
  })

  ipcMain.on("session.start", (event, sessionId: string, layoutId: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.webContents.send("event.start_session", sessionId, layoutId);
  })

  ipcMain.on('session.clear_storage', async function (event, sessionId: string) {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.webContents.send("event.stop_session", sessionId);
    const sess = session.fromPartition('persist:' + sessionId)
    await sess.clearStorageData()
  })

  ipcMain.on('session.clear_cache', async function (event, sessionId: string) {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.webContents.send("event.stop_session", sessionId);
    const sess = session.fromPartition('persist:' + sessionId)
    await sess.clearCache()
  })

  ipcMain.on('preferences.set_theme_mode', async function (_, themeMode: string) {
    mainWindow?.webContents.send("event.theme_mode_changed", themeMode);
  })

  ipcMain.handle('config.load', async (_, force: boolean = false) => {
    const conf = await loadConfig(force)
    return conf
  })

  ipcMain.handle('config.save', async (_, config: any) => {
    saveConfig(JSON.parse(config))
    neuzosConfig = JSON.parse(config);
    mainWindow?.webContents?.send("event.config_changed", config);
  })


  createMainWindow()
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
