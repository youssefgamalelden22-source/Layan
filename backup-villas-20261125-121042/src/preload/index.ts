import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  appName: 'ITQAN LAYAN',
  version: '1.0.0',

  auth: {
    needsSetup: () =>
      ipcRenderer.invoke('auth:needs-setup'),

    setup: (data: {
      name: string
      email: string
      password: string
    }) => ipcRenderer.invoke('auth:setup', data),

    login: (data: {
      email: string
      password: string
    }) => ipcRenderer.invoke('auth:login', data),

    logout: () =>
      ipcRenderer.invoke('auth:logout')
  }
})