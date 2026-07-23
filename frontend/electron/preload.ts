import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  migrateData: (targetPath: string) => ipcRenderer.invoke('migrate-data', targetPath),
  toggleMcp: (enabled: boolean) => ipcRenderer.invoke('toggle-mcp', enabled),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getMcpConfig: () => ipcRenderer.invoke('get-mcp-config'),
  getApiAuth: () => ipcRenderer.invoke('get-api-auth'),
  getServiceStatus: () => ipcRenderer.invoke('get-service-status'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close')
})
