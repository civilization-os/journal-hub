import { app, BrowserWindow, Tray, Menu, ipcMain, dialog, utilityProcess } from 'electron'
import path from 'path'
import fs from 'fs'
import fse from 'fs-extra'

const isDev = !app.isPackaged;

// 1. Data Migration & UserData Hooking
const defaultAppData = app.getPath('userData')
const bootConfigPath = path.join(defaultAppData, 'boot.json')

let customDataPath = ''
if (fs.existsSync(bootConfigPath)) {
  try {
    const bootConfig = JSON.parse(fs.readFileSync(bootConfigPath, 'utf-8'))
    if (bootConfig.customDataPath && fs.existsSync(bootConfig.customDataPath)) {
      customDataPath = bootConfig.customDataPath
      app.setPath('userData', customDataPath)
    }
  } catch (e) {
    console.error('Failed to read boot config:', e)
  }
}

// 2. Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null
  let tray: Tray | null = null
  let mcpProcess: any = null
  let isQuitting = false

  const getIconPath = () => {
    // In dev, use public directory. In prod, use the bundled path.
    return path.join(app.getAppPath(), isDev ? 'public/favicon.ico' : 'dist/favicon.ico')
  }

  const createWindow = () => {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      frame: false,
      icon: getIconPath(),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    // Vite dev server URL
    if (process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
      // mainWindow.webContents.openDevTools()
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    let hasShownTrayNotif = false

    mainWindow.on('close', (event) => {
      // Instead of quitting, just hide to tray
      if (mainWindow && !isQuitting) {
        event.preventDefault()
        mainWindow.hide()
        
        if (!hasShownTrayNotif && tray) {
          tray.displayBalloon({
            title: 'Journal Hub',
            content: '应用已最小化到系统托盘，您可以随时在此处重新打开。',
            iconType: 'info'
          })
          hasShownTrayNotif = true
        }
      }
    })
  }

  const createTray = () => {
    try {
      const iconPath = getIconPath()
      if (fs.existsSync(iconPath)) {
        tray = new Tray(iconPath)
        const contextMenu = Menu.buildFromTemplate([
          { label: '打开主窗口', click: () => mainWindow?.show() },
          { type: 'separator' },
          { label: '退出应用', click: () => {
            isQuitting = true
            app.quit()
          }}
        ])
        tray.setToolTip('Journal Hub')
        tray.setContextMenu(contextMenu)
        tray.on('click', () => {
          if (mainWindow) {
            if (mainWindow.isVisible()) {
              mainWindow.hide()
            } else {
              mainWindow.show()
              mainWindow.focus()
            }
          }
        })
      } else {
        console.error('Tray icon not found at:', iconPath)
      }
    } catch (e) {
      console.error('Failed to create tray:', e)
    }
  }

  // MCP Service Management
  const startMcpService = () => {
    if (mcpProcess) return;
    
    // Read config to see if MCP is enabled
    const currentDataPath = app.getPath('userData')
    const settingsPath = path.join(currentDataPath, 'settings.json')
    let mcpEnabled = false
    
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
        mcpEnabled = settings.mcpEnabled === true
      } catch (e) {
        console.error('Failed to parse settings.json', e)
      }
    }

    if (!mcpEnabled) return;

    console.log('Starting MCP Service...')
    
    // Locate the desktop-hosted MCP SSE server script.
    let mcpScriptPath = ''
    if (isDev) {
      mcpScriptPath = path.join(__dirname, '../../mcp-server/http-server.js')
    } else {
      // Packaged app path
      mcpScriptPath = path.join(process.resourcesPath, 'mcp-server/http-server.js')
    }

    if (fs.existsSync(mcpScriptPath)) {
      mcpProcess = utilityProcess.fork(mcpScriptPath, [], {
        cwd: path.dirname(mcpScriptPath),
        env: {
          ...process.env,
          APP_DATA_DIR: currentDataPath,
          JOURNAL_HUB_API_BASE: 'http://127.0.0.1:3001/api',
          MCP_HOST: '127.0.0.1',
          MCP_PORT: '3002'
        }
      })

      mcpProcess.on('exit', (code) => {
        console.log(`MCP server exited with code ${code}`)
        mcpProcess = null
      })
    } else {
      console.error('MCP script not found at:', mcpScriptPath)
    }
  }

  const stopMcpService = () => {
    if (mcpProcess) {
      console.log('Stopping MCP Service...')
      mcpProcess.kill()
      mcpProcess = null
    }
  }

  let backendProcess: any = null

  const startBackendService = () => {
    if (backendProcess) return;
    console.log('Starting Backend Service...')
    
    let backendScriptPath = ''
    if (isDev) {
      backendScriptPath = path.join(__dirname, '../../backend/src/server.js')
    } else {
      backendScriptPath = path.join(process.resourcesPath, 'backend/src/server.js')
    }

    if (fs.existsSync(backendScriptPath)) {
      const betterSqlite3Path = isDev
        ? ''
        : path.join(process.resourcesPath, 'app.asar.unpacked/node_modules/better-sqlite3')

      backendProcess = utilityProcess.fork(backendScriptPath, [], {
        cwd: path.dirname(backendScriptPath),
        env: {
          ...process.env,
          APP_DATA_DIR: app.getPath('userData'),
          BETTER_SQLITE3_PATH: betterSqlite3Path
        }
      })

      backendProcess.on('exit', (code) => {
        console.log(`Backend server exited with code ${code}`)
        backendProcess = null
      })
    } else {
      console.error('Backend script not found at:', backendScriptPath)
    }
  }

  const stopBackendService = () => {
    if (backendProcess) {
      console.log('Stopping Backend Service...')
      backendProcess.kill()
      backendProcess = null
    }
  }

  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show()
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    createWindow()
    createTray()
    startBackendService()
    startMcpService()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

  // IPC Handlers
  ipcMain.handle('migrate-data', async (event, targetPath: string) => {
    try {
      const currentDataPath = app.getPath('userData')
      if (currentDataPath === targetPath) return { success: false, message: 'Same path' }

      // 1. Stop services
      stopBackendService()
      stopMcpService()
      
      // 2. Copy files
      await fse.copy(currentDataPath, targetPath)

      // 3. Update boot.json in default appData
      fs.writeFileSync(bootConfigPath, JSON.stringify({ customDataPath: targetPath }))

      // 4. Relaunch
      app.relaunch()
      app.quit()
      
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('toggle-mcp', (event, enabled: boolean) => {
    const currentDataPath = app.getPath('userData')
    const settingsPath = path.join(currentDataPath, 'settings.json')
    let settings = {}
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    }
    settings = { ...settings, mcpEnabled: enabled }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))

    if (enabled) {
      startMcpService()
    } else {
      stopMcpService()
    }
    return true
  })

  ipcMain.handle('get-data-path', () => {
    return app.getPath('userData')
  })

  ipcMain.handle('select-directory', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择数据存储与迁移目录',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle('get-settings', () => {
    const currentDataPath = app.getPath('userData')
    const settingsPath = path.join(currentDataPath, 'settings.json')
    if (fs.existsSync(settingsPath)) {
      try {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      } catch (e) {
        return {}
      }
    }
    return {}
  })

  ipcMain.handle('get-mcp-config', () => {
    const mcpShimPath = isDev
      ? path.join(__dirname, '../../mcp-server/index.js')
      : path.join(process.resourcesPath, 'mcp-server/index.js')

    const sseConfig = {
      mcpServers: {
        'journal-hub': {
          url: 'http://127.0.0.1:3002/sse'
        }
      }
    }

    const stdioConfig = {
      mcpServers: {
        'journal-hub': {
          command: 'node',
          args: [mcpShimPath]
        }
      }
    }

    return {
      sse: JSON.stringify(sseConfig, null, 2),
      stdio: JSON.stringify(stdioConfig, null, 2),
      stdioPath: mcpShimPath
    }
  })

  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
    }
  })

  ipcMain.on('window-close', () => {
    // Pure hide to tray - NEVER close or quit!
    if (mainWindow) {
      mainWindow.hide()
    }
  })

  app.on('before-quit', () => {
    isQuitting = true
    stopBackendService()
    stopMcpService()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
