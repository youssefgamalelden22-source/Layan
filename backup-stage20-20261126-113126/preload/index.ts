import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  appName: 'ITQAN LAYAN',
  version: '1.0.0',

  villas: {
 violationUnits: (data: unknown) => ipcRenderer.invoke('villas:violationUnits',data),
 records: (data: unknown) => ipcRenderer.invoke('villas:records',data),
 recordChange: (data: unknown) => ipcRenderer.invoke('villas:recordChange',data),
 financial: (data: unknown) => ipcRenderer.invoke('villas:financial',data),
 receiptFile: (data: unknown) => ipcRenderer.invoke('villas:receiptFile',data),
 licenses: (data: unknown) => ipcRenderer.invoke('villas:licenses', data),
 licenseSave: (data: unknown) => ipcRenderer.invoke('villas:licenseSave', data),
 delete: (data: unknown) => ipcRenderer.invoke('villas:delete', data),
 export: (data: unknown) => ipcRenderer.invoke('villas:export', data),

 directory: (data: unknown) => ipcRenderer.invoke('villas:directory', data),
 extras: (data: unknown) => ipcRenderer.invoke('villas:extras', data),
 extraSave: (data: unknown) => ipcRenderer.invoke('villas:extraSave', data),
 reportFile: (data: unknown) => ipcRenderer.invoke('villas:reportFile', data),

 violation: (data: unknown) => ipcRenderer.invoke('villas:violation', data),
 owner: (data: unknown) => ipcRenderer.invoke('villas:owner', data),
 profile: (data: unknown) => ipcRenderer.invoke('villas:profile', data),
 dashboard: (data: unknown) => ipcRenderer.invoke('villas:dashboard', data),
 list: (data: unknown) => ipcRenderer.invoke('villas:list', data),
 save: (data: unknown) => ipcRenderer.invoke('villas:save', data),
 archive: (data: unknown) => ipcRenderer.invoke('villas:archive', data)
 },
 auth: {
    users: (data: unknown) => ipcRenderer.invoke('auth:users', data),
    reset: (data: unknown) => ipcRenderer.invoke('auth:reset', data),
    toggle: (data: unknown) => ipcRenderer.invoke('auth:toggle', data),
    clearHistory: () => ipcRenderer.invoke('auth:clearHistory'),
    history: (data: unknown) => ipcRenderer.invoke('auth:history', data),

    createUser: (data: unknown) => ipcRenderer.invoke('auth:createUser', data),
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