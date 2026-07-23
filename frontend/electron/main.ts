import { app, BrowserWindow, Tray, Menu, ipcMain, dialog, utilityProcess } from 'electron'
import path from 'path'
import fs from 'fs'
import fse from 'fs-extra'
import http from 'http'
import { randomUUID } from 'crypto'

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

const authConfigPath = path.join(defaultAppData, 'auth.json')
const getOrCreateApiToken = () => {
  try {
    if (fs.existsSync(authConfigPath)) {
      const authConfig = JSON.parse(fs.readFileSync(authConfigPath, 'utf-8'))
      if (typeof authConfig.apiToken === 'string' && authConfig.apiToken.length > 0) {
        return authConfig.apiToken
      }
    }
    fs.mkdirSync(defaultAppData, { recursive: true })
    const apiToken = randomUUID()
    fs.writeFileSync(authConfigPath, JSON.stringify({ apiToken }, null, 2), 'utf-8')
    return apiToken
  } catch (e) {
    console.error('Failed to load auth config:', e)
    return randomUUID()
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
  let backendProcess: any = null
  let isQuitting = false
  const apiToken = getOrCreateApiToken()
  const apiBaseURL = 'http://127.0.0.1:3001/api'
  const serviceStatus = {
    backend: 'stopped',
    mcp: 'stopped',
    mcpConnections: 0,
    errors: [] as string[],
  }

  const recordServiceError = (message: string) => {
    serviceStatus.errors.unshift(`${new Date().toISOString()} ${message}`)
    serviceStatus.errors = serviceStatus.errors.slice(0, 20)
    try {
      const logDir = path.join(app.getPath('userData'), 'logs')
      fs.mkdirSync(logDir, { recursive: true })
      fs.appendFileSync(path.join(logDir, 'service.log'), `${serviceStatus.errors[0]}\n`, 'utf-8')
    } catch (e) {
      console.error('Failed to write service log:', e)
    }
  }

  const waitForHealth = (url: string, timeoutMs = 8000) => new Promise<void>((resolve, reject) => {
    const started = Date.now()
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume()
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve()
          return
        }
        retry()
      })
      req.on('error', retry)
      req.setTimeout(1000, () => {
        req.destroy()
        retry()
      })
    }
    const retry = () => {
      if (Date.now() - started >= timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`))
        return
      }
      setTimeout(attempt, 250)
    }
    attempt()
  })

  const fetchJson = (url: string, timeoutMs = 1000) => new Promise<any>((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = ''
      res.setEncoding('utf-8')
      res.on('data', chunk => {
        body += chunk
      })
      res.on('end', () => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Request failed with status ${res.statusCode}`))
          return
        }
        try {
          resolve(JSON.parse(body))
        } catch (error) {
          reject(error)
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => {
      req.destroy()
      reject(new Error(`Timed out waiting for ${url}`))
    })
  })

  const refreshMcpConnectionCount = async () => {
    if (serviceStatus.mcp !== 'running') {
      serviceStatus.mcpConnections = 0
      return
    }
    try {
      const health = await fetchJson('http://127.0.0.1:3002/health')
      serviceStatus.mcpConnections = Array.isArray(health.transports) ? health.transports.length : 0
    } catch (error) {
      serviceStatus.mcpConnections = 0
    }
  }

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

  const createStartupErrorWindow = (error: unknown) => {
    recordServiceError(`Startup failed: ${error instanceof Error ? error.message : String(error)}`)
    createWindow()
    const details = serviceStatus.errors.map(line => `<li>${line.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch] || ch))}</li>`).join('')
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Journal Hub startup failed</title>
          <style>
            body { margin: 0; font-family: "Segoe UI", sans-serif; background: #f5f5f7; color: #18181b; }
            main { max-width: 760px; margin: 96px auto; background: #fff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 28px; box-shadow: 0 16px 48px rgba(0,0,0,.08); }
            h1 { margin: 0 0 12px; font-size: 24px; }
            p { color: #52525b; line-height: 1.6; }
            code { background: #f4f4f5; padding: 2px 6px; border-radius: 6px; }
            ul { padding-left: 20px; color: #3f3f46; }
          </style>
        </head>
        <body>
          <main>
            <h1>Journal Hub 启动失败</h1>
            <p>Desktop 已启动，但内部数据服务没有准备好。请从托盘完全退出 Journal Hub 后重新打开。</p>
            <p>服务状态：backend=<code>${serviceStatus.backend}</code>，mcp=<code>${serviceStatus.mcp}</code></p>
            <p>诊断日志：<code>${path.join(app.getPath('userData'), 'logs', 'service.log')}</code></p>
            <ul>${details}</ul>
          </main>
        </body>
      </html>`
    mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
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
  const startMcpService = async () => {
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

    if (!mcpEnabled) {
      serviceStatus.mcp = 'disabled'
      return
    }

    console.log('Starting MCP Service...')
    serviceStatus.mcp = 'starting'
    
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
          JOURNAL_HUB_API_BASE: apiBaseURL,
          JOURNAL_HUB_API_TOKEN: apiToken,
          MCP_HOST: '127.0.0.1',
          MCP_PORT: '3002'
        }
      })

      mcpProcess.on('exit', (code) => {
        console.log(`MCP server exited with code ${code}`)
        if (!isQuitting) {
          serviceStatus.mcp = 'stopped'
          recordServiceError(`MCP server exited with code ${code}`)
        }
        mcpProcess = null
      })
      await waitForHealth('http://127.0.0.1:3002/health')
      serviceStatus.mcp = 'running'
    } else {
      const message = `MCP script not found at: ${mcpScriptPath}`
      serviceStatus.mcp = 'failed'
      recordServiceError(message)
      console.error(message)
    }
  }

  const stopMcpService = () => {
    if (mcpProcess) {
      console.log('Stopping MCP Service...')
      mcpProcess.kill()
      mcpProcess = null
    }
  }

  const startBackendService = async () => {
    if (backendProcess) return;
    console.log('Starting Backend Service...')
    serviceStatus.backend = 'starting'
    
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
          HOST: '127.0.0.1',
          PORT: '3001',
          JOURNAL_HUB_API_TOKEN: apiToken,
          BETTER_SQLITE3_PATH: betterSqlite3Path
        }
      })

      backendProcess.on('exit', (code) => {
        console.log(`Backend server exited with code ${code}`)
        if (!isQuitting) {
          serviceStatus.backend = 'stopped'
          recordServiceError(`Backend server exited with code ${code}`)
        }
        backendProcess = null
      })
      await waitForHealth(`${apiBaseURL}/health`)
      serviceStatus.backend = 'running'
    } else {
      const message = `Backend script not found at: ${backendScriptPath}`
      serviceStatus.backend = 'failed'
      recordServiceError(message)
      console.error(message)
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

  app.whenReady().then(async () => {
    createTray()
    try {
      await startBackendService()
      await startMcpService()
      createWindow()
    } catch (error) {
      serviceStatus.backend = serviceStatus.backend === 'starting' ? 'failed' : serviceStatus.backend
      serviceStatus.mcp = serviceStatus.mcp === 'starting' ? 'failed' : serviceStatus.mcp
      createStartupErrorWindow(error)
    }

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

  ipcMain.handle('toggle-mcp', async (event, enabled: boolean) => {
    const currentDataPath = app.getPath('userData')
    const settingsPath = path.join(currentDataPath, 'settings.json')
    let settings = {}
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    }
    settings = { ...settings, mcpEnabled: enabled }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))

    if (enabled) {
      await startMcpService()
    } else {
      stopMcpService()
    }
    return true
  })

  ipcMain.handle('get-api-auth', () => {
    return { baseURL: apiBaseURL, token: apiToken }
  })

  ipcMain.handle('get-service-status', async () => {
    await refreshMcpConnectionCount()
    return { ...serviceStatus, logPath: path.join(app.getPath('userData'), 'logs', 'service.log') }
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

    const httpConfig = {
      mcpServers: {
        'journal-hub': {
          url: 'http://127.0.0.1:3002/mcp'
        }
      }
    }

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
          args: [mcpShimPath],
          env: {
            JOURNAL_HUB_API_BASE: apiBaseURL,
            JOURNAL_HUB_API_TOKEN: apiToken
          }
        }
      }
    }

    return {
      http: JSON.stringify(httpConfig, null, 2),
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
