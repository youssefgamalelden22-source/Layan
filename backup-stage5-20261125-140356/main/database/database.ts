
import { app } from 'electron'
import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

let db: DatabaseSync

export function initializeDatabase(): void {
  const dataPath = join(app.getPath('userData'), 'data')

  mkdirSync(dataPath, { recursive: true })
  mkdirSync(join(dataPath, 'attachments'), { recursive: true })
  mkdirSync(join(dataPath, 'backups'), { recursive: true })

  const databasePath = join(dataPath, 'layan.db')

  db = new DatabaseSync(databasePath)

  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer'
        CHECK(role IN ('admin', 'editor', 'viewer')),
      permissions TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS villas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      villa_number TEXT NOT NULL UNIQUE,
      plot_number TEXT,
      phase TEXT,
      villa_type TEXT,
      land_area REAL,
      building_area REAL,
      floors INTEGER,
      bedrooms INTEGER,
      bathrooms INTEGER,
      garden_area REAL,
      occupancy_status TEXT DEFAULT 'vacant',
      delivery_date TEXT,
      cover_image TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS owners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      villa_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      ownership_start TEXT,
      ownership_end TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (villa_id) REFERENCES villas(id)
    );

    CREATE TABLE IF NOT EXISTS residents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      villa_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      resident_type TEXT,
      move_in_date TEXT,
      move_out_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (villa_id) REFERENCES villas(id)
    );

    CREATE TABLE IF NOT EXISTS violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      villa_id INTEGER NOT NULL,
      reference_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      violation_type TEXT,
      description TEXT,
      detected_date TEXT,
      inspection_date TEXT,
      deadline TEXT,
      engineer_name TEXT,
      fine_amount INTEGER NOT NULL DEFAULT 0
        CHECK(fine_amount >= 0),
      status TEXT NOT NULL DEFAULT 'open',
      resolved_date TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (villa_id) REFERENCES villas(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      villa_id INTEGER NOT NULL,
      violation_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to TEXT,
      priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'pending',
      start_date TEXT,
      expected_end_date TEXT,
      completed_date TEXT,
      cost INTEGER DEFAULT 0 CHECK(cost >= 0),
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (villa_id) REFERENCES villas(id),
      FOREIGN KEY (violation_id) REFERENCES violations(id)
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      villa_id INTEGER NOT NULL,
      service_name TEXT NOT NULL,
      description TEXT,
      request_date TEXT,
      completion_date TEXT,
      service_cost INTEGER DEFAULT 0
        CHECK(service_cost >= 0),
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (villa_id) REFERENCES villas(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      villa_id INTEGER NOT NULL,
      violation_id INTEGER,
      service_id INTEGER,
      maintenance_id INTEGER,
      receipt_number TEXT UNIQUE,
      amount INTEGER NOT NULL CHECK(amount > 0),
      payment_date TEXT NOT NULL,
      payment_method TEXT,
      description TEXT,
      received_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      voided_at TEXT,
      FOREIGN KEY (villa_id) REFERENCES villas(id),
      FOREIGN KEY (violation_id) REFERENCES violations(id),
      FOREIGN KEY (service_id) REFERENCES services(id),
      FOREIGN KEY (maintenance_id) REFERENCES maintenance(id),
      FOREIGN KEY (received_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      villa_id INTEGER NOT NULL,
      violation_id INTEGER,
      engineer_name TEXT,
      inspection_date TEXT NOT NULL,
      findings TEXT,
      recommendations TEXT,
      next_inspection_date TEXT,
      status TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (villa_id) REFERENCES villas(id),
      FOREIGN KEY (violation_id) REFERENCES violations(id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      villa_id INTEGER NOT NULL,
      violation_id INTEGER,
      maintenance_id INTEGER,
      inspection_id INTEGER,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      category TEXT,
      description TEXT,
      uploaded_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (villa_id) REFERENCES villas(id),
      FOREIGN KEY (violation_id) REFERENCES violations(id),
      FOREIGN KEY (maintenance_id) REFERENCES maintenance(id),
      FOREIGN KEY (inspection_id) REFERENCES inspections(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      old_data TEXT,
      new_data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings (key, value)
    VALUES
      ('company_name', 'ITQAN'),
      ('project_name', 'LAYAN'),
      ('language', 'en'),
      ('theme', 'light'),
      ('currency', 'EGP'),
      ('schema_version', '1');

    CREATE INDEX IF NOT EXISTS idx_owners_villa
      ON owners(villa_id);

    CREATE INDEX IF NOT EXISTS idx_residents_villa
      ON residents(villa_id);

    CREATE INDEX IF NOT EXISTS idx_violations_villa
      ON violations(villa_id);

    CREATE INDEX IF NOT EXISTS idx_payments_villa
      ON payments(villa_id);

    CREATE INDEX IF NOT EXISTS idx_maintenance_villa
      ON maintenance(villa_id);

    CREATE INDEX IF NOT EXISTS idx_services_villa
      ON services(villa_id);

    CREATE INDEX IF NOT EXISTS idx_attachments_villa
      ON attachments(villa_id);
  `)

  console.log('================================')
  console.log('ITQAN LAYAN Database Initialized')
  console.log('Database:', databasePath)
  console.log('================================')
}

export function getDatabase(): DatabaseSync {
  if (!db) {
    throw new Error('Database is not initialized')
  }

  return db
}
