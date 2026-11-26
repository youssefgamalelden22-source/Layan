
import { ipcMain } from 'electron'
import bcrypt from 'bcryptjs'
import { getDatabase } from '../database/database'

interface User {
  id: number
  full_name: string
  email: string
  password_hash: string
  role: string
  is_active: number
}

const sessions = new Map<number, Omit<User, 'password_hash'>>()
const attempts = new Map<number, { count: number; until: number }>()

export function registerAuthHandlers(): void {
  const db = getDatabase()

  ipcMain.handle('auth:needs-setup', () => {
    const result = db.prepare(
      'SELECT COUNT(*) AS total FROM users'
    ).get() as { total: number }

    return result.total === 0
  })

  ipcMain.handle('auth:setup', (_event, data) => {
    const result = db.prepare(
      'SELECT COUNT(*) AS total FROM users'
    ).get() as { total: number }

    if (result.total > 0) {
      throw new Error('Setup already completed')
    }

    const name = String(data?.name ?? '').trim()
    const email = String(data?.email ?? '').trim().toLowerCase()
    const password = String(data?.password ?? '')

    if (!name || name.length > 150) {
      throw new Error('Invalid name')
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email')
    }

    if (password.length < 10 || Buffer.byteLength(password) > 72) {
      throw new Error('Invalid password length')
    }

    const hash = bcrypt.hashSync(password, 12)

    db.prepare(`
      INSERT INTO users (
        full_name, email, password_hash, role
      ) VALUES (?, ?, ?, 'admin')
    `).run(name, email, hash)

    return { success: true }
  })

  ipcMain.handle('auth:login', (event, data) => {
    const senderId = event.sender.id
    const attempt = attempts.get(senderId)

    if (attempt && attempt.until > Date.now()) {
      return { success: false, message: 'locked' }
    }

    const email = String(data?.email ?? '').trim().toLowerCase()
    const password = String(data?.password ?? '')

    const user = db.prepare(`
      SELECT * FROM users
      WHERE email = ? AND is_active = 1
    `).get(email) as User | undefined

    if (
      !user ||
      Buffer.byteLength(password) > 72 ||
      !bcrypt.compareSync(password, user.password_hash)
    ) {
      const count = (attempt?.until ? 0 : attempt?.count ?? 0) + 1

      attempts.set(senderId, {
        count,
        until: count >= 5 ? Date.now() + 60000 : 0
      })

      return { success: false, message: 'invalid' }
    }

    attempts.delete(senderId)

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    }

    sessions.set(senderId, safeUser)

    event.sender.once('destroyed', () => {
      sessions.delete(senderId)
      attempts.delete(senderId)
    })

    db.prepare(`
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id
      ) VALUES (?, 'LOGIN', 'user', ?)
    `).run(user.id, user.id)

    return {
      success: true,
      user: safeUser
    }
  })

  ipcMain.handle('auth:logout', (event) => {
    sessions.delete(event.sender.id)
    return { success: true }
  })
}

export function getVillaSession(id: number) { return sessions.get(id) }
