
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

const ADMIN = "youssef@itqanpm.com"
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

    if (email !== ADMIN) {
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

    if (user.role === "admin" && user.email !== ADMIN) {
      if (db.prepare("SELECT id FROM users WHERE email=?").get(ADMIN)) return {success:false,message:"invalid"}
      db.prepare("UPDATE users SET email=? WHERE id=?").run(ADMIN,user.id); user.email=ADMIN
    }
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

  function admin(id:number) { const u=getVillaSession(id); if(!u || u.email!==ADMIN || u.role!=='admin') throw new Error('Access denied'); return u }
  function passwordHash(value:unknown) { const p=String(value??''); if(p.length<10||Buffer.byteLength(p)>72) throw new Error('Password must be 10–72 bytes'); return bcrypt.hashSync(p,12) }
  ipcMain.handle('auth:createUser',(e,d)=>{const u=admin(e.sender.id);const email=String(d.email??'').trim().toLowerCase(),name=String(d.name??'').trim();if(!name||! /^[a-z0-9._%+-]+@itqanpm\.com$/.test(email)||email===ADMIN)throw new Error('Invalid account');const role=d.role==='editor'?'editor':'viewer';const r=db.prepare('INSERT INTO users(full_name,email,password_hash,role) VALUES (?,?,?,?)').run(name,email,passwordHash(d.password),role);db.prepare("INSERT INTO audit_logs(user_id,action,entity_type,entity_id,new_data) VALUES (?,'CREATE','user',?,?)").run(u.id,Number(r.lastInsertRowid),JSON.stringify({name,email,role}));return true})
  ipcMain.handle('auth:users',e=>{admin(e.sender.id);return db.prepare('SELECT id,full_name,email,role,is_active FROM users ORDER BY id').all()})
  ipcMain.handle('auth:reset',(e,d)=>{const u=admin(e.sender.id);const id=Number(d.id);db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash(d.password),id);for(const [k,v] of sessions)if(v.id===id&&k!==e.sender.id)sessions.delete(k);db.prepare("INSERT INTO audit_logs(user_id,action,entity_type,entity_id) VALUES (?,'RESET_PASSWORD','user',?)").run(u.id,id);return true})
  ipcMain.handle('auth:toggle',(e,d)=>{const u=admin(e.sender.id);const id=Number(d.id);if(id===u.id)throw new Error('Cannot disable administrator');db.prepare('UPDATE users SET is_active=? WHERE id=? AND email<>?').run(d.active?1:0,id,ADMIN);for(const [k,v] of sessions)if(v.id===id)sessions.delete(k);db.prepare("INSERT INTO audit_logs(user_id,action,entity_type,entity_id,new_data) VALUES (?,'ACCOUNT_STATUS','user',?,?)").run(u.id,id,JSON.stringify({active:!!d.active}));return true})
  ipcMain.handle('auth:history',e=>{admin(e.sender.id);return db.prepare('SELECT a.*,u.email,u.full_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id WHERE a.id>COALESCE((SELECT MAX(entity_id) FROM audit_logs WHERE action=\'HIDE_HISTORY\' AND entity_type=\'history\'),0) ORDER BY a.id DESC LIMIT 2000').all()})
  ipcMain.handle('auth:clearHistory',e=>{const u=admin(e.sender.id);const last=db.prepare('SELECT COALESCE(MAX(id),0) n FROM audit_logs').get() as {n:number};db.prepare("INSERT INTO audit_logs(user_id,action,entity_type,entity_id) VALUES (?,'HIDE_HISTORY','history',?)").run(u.id,last.n);return true})
  ipcMain.handle('auth:logout', (event) => {
    sessions.delete(event.sender.id)
    return { success: true }
  })
}

export function getVillaSession(id: number) { const u=sessions.get(id); if(!u)return undefined; const row=getDatabase().prepare("SELECT id,full_name,email,role,is_active FROM users WHERE id=? AND is_active=1").get(u.id) as Omit<User,"password_hash">|undefined; return row }
