const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'bus_attendance.sqlite');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[DB] Failed to open SQLite database:', err.message);
  } else {
    console.log('[DB] Connected to SQLite database at:', DB_PATH);
  }
});

// Enable foreign keys and WAL mode for better concurrency
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode = WAL');
});

// Promisified query methods
const query = {
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  exec(sql) {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

async function initSchema() {
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS buses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bus_number TEXT UNIQUE NOT NULL,
      route_name TEXT NOT NULL,
      capacity INTEGER DEFAULT 60,
      driver_name TEXT,
      driver_phone TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bus_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bus_id INTEGER NOT NULL,
      stop_name TEXT NOT NULL,
      stop_order INTEGER DEFAULT 1,
      pickup_time TEXT,
      FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      register_number TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      assigned_bus_id INTEGER,
      assigned_stop_id INTEGER,
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      last_active_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_bus_id) REFERENCES buses(id),
      FOREIGN KEY (assigned_stop_id) REFERENCES bus_stops(id)
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      register_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      bus_id INTEGER NOT NULL,
      stop_id INTEGER NOT NULL,
      department TEXT DEFAULT 'CSE',
      year TEXT DEFAULT 'II',
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bus_id) REFERENCES buses(id),
      FOREIGN KEY (stop_id) REFERENCES bus_stops(id)
    );

    CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      faculty_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      bus_id INTEGER NOT NULL,
      phone TEXT,
      is_coordinator INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bus_id) REFERENCES buses(id)
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      bus_id INTEGER NOT NULL,
      stop_id INTEGER NOT NULL,
      attendance_date TEXT NOT NULL,
      session TEXT DEFAULT 'MORNING',
      status TEXT NOT NULL,
      marked_by_user_id TEXT NOT NULL,
      marked_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (bus_id) REFERENCES buses(id),
      FOREIGN KEY (stop_id) REFERENCES bus_stops(id)
    );

    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bus_id INTEGER NOT NULL,
      stop_id INTEGER NOT NULL,
      attendance_date TEXT NOT NULL,
      session TEXT DEFAULT 'MORNING',
      status TEXT DEFAULT 'SUBMITTED',
      submitted_by TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      present_count INTEGER DEFAULT 0,
      absent_count INTEGER DEFAULT 0,
      total_count INTEGER DEFAULT 0,
      FOREIGN KEY (bus_id) REFERENCES buses(id),
      FOREIGN KEY (stop_id) REFERENCES bus_stops(id)
    );

    CREATE TABLE IF NOT EXISTS faculty_attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      faculty_id INTEGER NOT NULL,
      bus_id INTEGER NOT NULL,
      attendance_date TEXT NOT NULL,
      session TEXT DEFAULT 'MORNING',
      status TEXT NOT NULL,
      marked_by_user_id TEXT NOT NULL,
      marked_at TEXT NOT NULL,
      FOREIGN KEY (faculty_id) REFERENCES faculty(id),
      FOREIGN KEY (bus_id) REFERENCES buses(id)
    );

    CREATE TABLE IF NOT EXISTS attendance_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attendance_record_id INTEGER,
      student_id INTEGER NOT NULL,
      attendance_date TEXT NOT NULL,
      session TEXT DEFAULT 'MORNING',
      original_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      changed_by_user_id TEXT NOT NULL,
      change_reason TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE INDEX IF NOT EXISTS idx_attendance_date_bus ON attendance_records (attendance_date, bus_id, session);
    CREATE INDEX IF NOT EXISTS idx_attendance_stop ON attendance_records (stop_id, attendance_date, session);
    CREATE INDEX IF NOT EXISTS idx_student_reg ON students (register_number);
    CREATE INDEX IF NOT EXISTS idx_audit_date ON attendance_audit_logs (attendance_date);
  `;

  await query.exec(schemaSQL);

  // Dynamic migrations for session support on existing DB
  try {
    const recCols = await query.all("PRAGMA table_info(attendance_records)");
    if (!recCols.some(c => c.name === 'session')) {
      await query.exec("ALTER TABLE attendance_records ADD COLUMN session TEXT DEFAULT 'MORNING'");
    }
    const sessCols = await query.all("PRAGMA table_info(attendance_sessions)");
    if (!sessCols.some(c => c.name === 'session')) {
      await query.exec("ALTER TABLE attendance_sessions ADD COLUMN session TEXT DEFAULT 'MORNING'");
    }
    const userCols = await query.all("PRAGMA table_info(users)");
    if (!userCols.some(c => c.name === 'register_number')) {
      await query.exec("ALTER TABLE users ADD COLUMN register_number TEXT");
    }
    const facCols = await query.all("PRAGMA table_info(faculty_attendance_records)");
    if (!facCols.some(c => c.name === 'session')) {
      await query.exec("ALTER TABLE faculty_attendance_records ADD COLUMN session TEXT DEFAULT 'MORNING'");
    }
    const facultyCols = await query.all("PRAGMA table_info(faculty)");
    if (!facultyCols.some(c => c.name === 'is_coordinator')) {
      await query.exec("ALTER TABLE faculty ADD COLUMN is_coordinator INTEGER DEFAULT 0");
    }
    await query.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_att_rec_sess ON attendance_records (student_id, attendance_date, bus_id, session);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_att_sess_sess ON attendance_sessions (bus_id, stop_id, attendance_date, session);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_fac_att_sess ON faculty_attendance_records (faculty_id, attendance_date, session);
    `);
  } catch (mErr) {
    console.warn('[DB Migration Notice]:', mErr.message);
  }

  console.log('[DB] Schema verified & initialized successfully.');
}

module.exports = {
  db,
  query,
  initSchema
};
