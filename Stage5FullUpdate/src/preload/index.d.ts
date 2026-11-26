interface AuthUser {
  id: number
  full_name: string
  email: string
  role: string
}

declare global {
  interface Window {
    api: {
      appName: string
      version: string

      auth: {
        createUser: (data: unknown) => Promise<boolean>
        needsSetup: () => Promise<boolean>

        setup: (data: {
          name: string
          email: string
          password: string
        }) => Promise<{ success: boolean }>

        login: (data: {
          email: string
          password: string
        }) => Promise<{
          success: boolean
          message?: string
          user?: AuthUser
        }>

        logout: () => Promise<{
          success: boolean
        }>
      }
    }
  }
}

export {}