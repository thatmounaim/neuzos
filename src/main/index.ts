import { app, shell, BrowserWindow, globalShortcut, Menu, ipcMain, session, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let focusedWindow: BrowserWindow | undefined
let exitCount: number = 0
function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  const aspectRatio = width / height;

  const windowWidth = aspectRatio >= 2 ? width / 2 : width - width / 12;
  const windowHeight = height - height / 12
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: Math.floor(windowWidth),
    height: Math.floor(windowHeight),
    show: false,
    frame: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      webviewTag: true,
      contextIsolation: false,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Fix for MacOS Command Shortcuts
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
  } else {
    Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }]))
    mainWindow.setMenuBarVisibility(false)
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('focus', () => {
    focusedWindow = mainWindow
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.webContents.openDevTools()
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', (event) => {
    if (exitCount < 2) {
      event.preventDefault();
      console.log('Prevented manual close');
      exitCount++
      setTimeout(() => {
        exitCount--
        exitCount = exitCount < 0 ? 0 : exitCount;
      },2000)
    } else {
      exitCount = 0
    }
  });


  app.on('browser-window-focus', function () {
    globalShortcut.register('Control+Tab', () => {
      mainWindow.webContents.send('doTabbing')
    })

    globalShortcut.register('F11', () => {
      focusedWindow?.setFullScreen(!mainWindow.isFullScreen())
    })

    globalShortcut.register('CommandOrControl+Alt+Y', () => {
      focusedWindow?.close()
    })

    globalShortcut.register('CommandOrControl+W', () => {
      console.log('Ctrl+W pressed but blocked')
    })

    globalShortcut.register('Alt+F4', () => {
      console.log('Alt+F4 pressed but blocked');
    });
  })

  ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    globalShortcut.unregisterAll()
    mainWindow.destroy();
  });

  ipcMain.on('clearData', async function (_, sid: string) {
    const sess = session.fromPartition('persist:' + sid)
    await sess.clearStorageData()
  })

  ipcMain.on('clearCache', async function (_, sid: string) {
    const sess = session.fromPartition('persist:' + sid)
    await sess.clearCache()
  })

  ipcMain.on('popSession', async function (_, sid: string, size?: { width: number, height: number }, zenMode?: boolean, zenModeFull?: boolean) {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize
    const aspectRatio = width / height;
    let windowWidth = zenMode ? width : (aspectRatio >= 2 ? width / 2 : width - width / 12);
    let windowHeight = zenMode ? height : (height - height / 12)

    if (size && !zenMode) {
      windowWidth = size.width
      windowHeight = size.height
    }

    const sessionWindow = new BrowserWindow({
      width: Math.floor(windowWidth),
      height: Math.floor(windowHeight),
      resizable: !zenMode,
      show: false,
      frame: !zenMode,
      autoHideMenuBar: true,
      ...(process.platform === 'linux' ? { icon } : {}),
      webPreferences: {
        contextIsolation: true,
        sandbox: false,
        partition: 'persist:' + sid
      }
    })
    sessionWindow.setMenuBarVisibility(false)
    sessionWindow.on('ready-to-show', () => {
      sessionWindow.show()
      zenMode && zenModeFull && sessionWindow.setFullScreen(true)
    })

    zenMode && zenModeFull && sessionWindow.on('leave-full-screen', () => {
      sessionWindow.setFullScreen(true)
    })

    zenMode && !zenModeFull && sessionWindow.on('enter-full-screen', () => {
      sessionWindow.setFullScreen(false)
    })

    sessionWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    sessionWindow.loadURL('https://universe.flyff.com/play')
    !zenMode && sessionWindow.on('resize', () => {
      const [width, height] = sessionWindow.getSize();
      mainWindow.webContents.send('resizedSession', sid, width, height)
    })

    sessionWindow.on('focus', () => {
      focusedWindow = sessionWindow
    })

    sessionWindow.on('close', (event) => {
      if (exitCount < 2) {
        event.preventDefault();
        console.log('Prevented manual close');
        exitCount++
        setTimeout(() => {
          exitCount--
          exitCount = exitCount < 0 ? 0 : exitCount;
        },2000)
      } else {
        exitCount = 0
      }
    });
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.neuzos')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
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

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('browser-window-blur', function () {
  globalShortcut.unregisterAll()
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
