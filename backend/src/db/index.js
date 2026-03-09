/**
 * DEER MES - Database module
 * Uses sql.js (pure JavaScript SQLite) - no compilation required
 * Works on Windows, Mac, Linux without Python/Visual C++
 */
const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '../../data/deer.db')
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

// Global sqljs instance and database
let sqlDb = null
let SQL = null

function saveToFile() {
  if (!sqlDb) return
  const data = sqlDb.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

// Convert sql.js result to array of objects
function toObjects(result) {
  if (!result || !result.length) return []
  const { columns, values } = result[0]
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])))
}

function toObject(result) {
  const rows = toObjects(result)
  return rows[0]
}

// Simple prepared statement wrapper
function makeStmt(sql) {
  return {
    run(...args) {
      // Flatten if called with array
      const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args
      sqlDb.run(sql, params)
      const res = sqlDb.exec('SELECT last_insert_rowid() as id')
      const lastId = res[0]?.values[0][0]
      saveToFile()
      return { lastInsertRowid: lastId, changes: 1 }
    },
    get(...args) {
      const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args
      const res = sqlDb.exec(sql, params)
      return toObject(res)
    },
    all(...args) {
      const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args
      const res = sqlDb.exec(sql, params)
      return toObjects(res)
    }
  }
}

// Public DB interface (mirrors better-sqlite3 API)
const db = {
  prepare: (sql) => makeStmt(sql),
  run(sql, params = []) {
    sqlDb.run(sql, params)
    saveToFile()
  },
  get(sql, params = []) {
    const res = sqlDb.exec(sql, params)
    return toObject(res)
  },
  all(sql, params = []) {
    const res = sqlDb.exec(sql, params)
    return toObjects(res)
  },
  exec(sql) {
    sqlDb.run(sql)
    saveToFile()
  }
}

async function init() {
  const initSqlJs = require('sql.js')
  SQL = await initSqlJs()

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH)
    sqlDb = new SQL.Database(buf)
  } else {
    sqlDb = new SQL.Database()
  }

  // Create all tables
  sqlDb.run(`PRAGMA journal_mode = WAL`)
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, first_name TEXT DEFAULT 'Admin',
      last_name TEXT DEFAULT '', email TEXT, role TEXT DEFAULT 'operator',
      active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, hall TEXT, rack TEXT, side TEXT,
      shelf TEXT, row_num TEXT, full_label TEXT, created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS machines (
      id INTEGER PRIMARY KEY AUTOINCREMENT, machine_id TEXT UNIQUE, name TEXT NOT NULL,
      manufacturer TEXT, type TEXT, table_size TEXT, max_load TEXT,
      location_id INTEGER, status TEXT DEFAULT 'idle', notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS fixtures (
      id INTEGER PRIMARY KEY AUTOINCREMENT, internal_id TEXT UNIQUE, name TEXT NOT NULL,
      description TEXT, type TEXT DEFAULT 'manual', status TEXT DEFAULT 'active',
      material TEXT, weight REAL, dimensions TEXT, clamping_points INTEGER,
      max_force REAL, estimated_value REAL, location_id INTEGER,
      last_maintenance TEXT, next_maintenance TEXT, notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS fixture_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT, fixture_id INTEGER NOT NULL,
      machine_id INTEGER, operator_id INTEGER, work_order TEXT,
      status TEXT DEFAULT 'in_machine', checked_out_at TEXT DEFAULT (datetime('now')),
      returned_at TEXT, notes TEXT
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT, internal_id TEXT, name TEXT NOT NULL,
      category TEXT, subcategory TEXT, current_quantity INTEGER DEFAULT 0,
      min_quantity INTEGER DEFAULT 0, unit TEXT DEFAULT 'kom',
      location TEXT, supplier TEXT, price REAL, status TEXT DEFAULT 'Dostupan',
      notes TEXT, created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS tool_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, tool_id INTEGER NOT NULL, action TEXT,
      quantity_before INTEGER, quantity_after INTEGER, quantity_change INTEGER,
      note TEXT, user_id INTEGER, user_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS clamping_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT, internal_id TEXT, name TEXT NOT NULL,
      type TEXT, current_quantity INTEGER DEFAULT 0, min_quantity INTEGER DEFAULT 0,
      location TEXT, status TEXT DEFAULT 'Dostupan', notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, name TEXT NOT NULL,
      category TEXT, current_quantity REAL DEFAULT 0, min_quantity REAL DEFAULT 0,
      unit TEXT DEFAULT 'kg', location TEXT, supplier TEXT, price REAL,
      status TEXT DEFAULT 'Dostupan', notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT DEFAULT 'warning',
      message TEXT NOT NULL, is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, user_name TEXT,
      action TEXT, entity_type TEXT, entity_id INTEGER, entity_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS sales_partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      type TEXT DEFAULT 'customer', oib TEXT, country TEXT DEFAULT 'Hrvatska',
      address TEXT, payment_terms INTEGER DEFAULT 30,
      contact_name TEXT, contact_email TEXT, contact_phone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS sales_rfqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, internal_id TEXT, partner_id INTEGER,
      customer_rfq_id TEXT, status TEXT DEFAULT 'novo', deadline TEXT,
      notes TEXT, created_by INTEGER, created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS sales_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, internal_id TEXT, partner_id INTEGER,
      rfq_id INTEGER, customer_order_id TEXT, status TEXT DEFAULT 'nova',
      delivery_date TEXT, total_value REAL, notes TEXT, created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS sales_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_number TEXT, order_id INTEGER,
      partner_id INTEGER, amount REAL, vat_rate REAL DEFAULT 25, total_amount REAL,
      currency TEXT DEFAULT 'EUR', status TEXT DEFAULT 'nacrt',
      due_date TEXT, paid_at TEXT, created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS quality_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, part_name TEXT,
      quantity INTEGER DEFAULT 0, good_qty INTEGER DEFAULT 0,
      rejected_qty INTEGER DEFAULT 0, inspector_id INTEGER,
      status TEXT DEFAULT 'na_cekanju', notes TEXT,
      checked_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS warehouse_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, name TEXT NOT NULL,
      category TEXT, current_qty REAL DEFAULT 0, min_qty REAL DEFAULT 0,
      unit TEXT DEFAULT 'kom', location TEXT, supplier TEXT, unit_price REAL,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS warehouse_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER NOT NULL,
      movement_type TEXT, quantity REAL, reference TEXT, user_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, employee_code TEXT,
      first_name TEXT, last_name TEXT, department TEXT, position TEXT,
      employment_type TEXT DEFAULT 'full_time', start_date TEXT, end_date TEXT,
      active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER, date TEXT,
      check_in TEXT, check_out TEXT, status TEXT DEFAULT 'present', notes TEXT
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER,
      leave_type TEXT DEFAULT 'annual', start_date TEXT, end_date TEXT,
      status TEXT DEFAULT 'pending', notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT,
      version TEXT DEFAULT '1.0', status TEXT DEFAULT 'draft',
      file_path TEXT, file_type TEXT, file_size INTEGER,
      description TEXT, tags TEXT, uploaded_by INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS form_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT, form_type TEXT NOT NULL, title TEXT,
      status TEXT DEFAULT 'pending', priority TEXT DEFAULT 'normal',
      requested_by INTEGER, assigned_to INTEGER, data TEXT, notes TEXT,
      created_at TEXT DEFAULT (datetime('now')), resolved_at TEXT
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS maintenance_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, machine_id INTEGER,
      type TEXT DEFAULT 'preventive', priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'open', title TEXT, description TEXT,
      assigned_to INTEGER, scheduled_date TEXT, completed_at TEXT,
      downtime_minutes INTEGER, notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  sqlDb.run(`CREATE TABLE IF NOT EXISTS machine_telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT, machine_id INTEGER,
      temperature REAL, spindle_speed REAL, feed_rate REAL,
      vibration REAL, power_kw REAL, status TEXT DEFAULT 'running',
      recorded_at TEXT DEFAULT (datetime('now'))
    )`)

  sqlDb.run(`CREATE TABLE IF NOT EXISTS kalkulacije (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      naziv TEXT NOT NULL,
      broj_nacrta TEXT,
      materijal TEXT,
      naziv_dijela TEXT,
      ident_nr TEXT,
      varijanta TEXT DEFAULT '50',
      data TEXT DEFAULT '{}',
      status TEXT DEFAULT 'draft',
      napomena TEXT,
      kreirao_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`)

  // Seed if empty
  const userCount = toObject(sqlDb.exec('SELECT COUNT(*) as c FROM users'))?.c || 0
  if (userCount === 0) {
    const bcrypt = require('bcryptjs')
    const adminHash = bcrypt.hashSync('admin123', 10)
    const opHash = bcrypt.hashSync('operator123', 10)
    sqlDb.run(`INSERT INTO users (username,password_hash,first_name,last_name,role) VALUES (?,?,?,?,?)`,
      ['admin', adminHash, 'Admin', 'Korisnik', 'company_admin'])
    sqlDb.run(`INSERT INTO users (username,password_hash,first_name,last_name,role) VALUES (?,?,?,?,?)`,
      ['operator', opHash, 'Ivan', 'Kovač', 'operator'])
    sqlDb.run(`INSERT INTO locations (hall,rack,full_label) VALUES (?,?,?)`, ['H1','R01','H1-R01'])
    sqlDb.run(`INSERT INTO locations (hall,rack,full_label) VALUES (?,?,?)`, ['H1','R02','H1-R02'])
    sqlDb.run(`INSERT INTO locations (hall,rack,full_label) VALUES (?,?,?)`, ['H2','R01','H2-R01'])
    sqlDb.run(`INSERT INTO machines (machine_id,name,manufacturer,type,status) VALUES (?,?,?,?,?)`,
      ['STR-001','DMU 50','DMG MORI','CNC 5-osni','running'])
    sqlDb.run(`INSERT INTO machines (machine_id,name,manufacturer,type,status) VALUES (?,?,?,?,?)`,
      ['STR-002','CTX beta 800','DMG MORI','CNC Tokarilica','idle'])
    sqlDb.run(`INSERT INTO machines (machine_id,name,manufacturer,type,status) VALUES (?,?,?,?,?)`,
      ['STR-003','Mazak INTEGREX','Mazak','CNC Multitasking','running'])
    sqlDb.run(`INSERT INTO fixtures (internal_id,name,type,status,estimated_value) VALUES (?,?,?,?,?)`,
      ['NP-001','Stezna naprava A1','hydraulic','active',2500])
    sqlDb.run(`INSERT INTO fixtures (internal_id,name,type,status,estimated_value) VALUES (?,?,?,?,?)`,
      ['NP-002','Naprava za tokarenje B2','pneumatic','in_production',1800])
    sqlDb.run(`INSERT INTO fixtures (internal_id,name,type,status,estimated_value) VALUES (?,?,?,?,?)`,
      ['NP-003','Modularna naprava C1','manual','active',900])
    sqlDb.run(`INSERT INTO tools (name,category,current_quantity,min_quantity,unit) VALUES (?,?,?,?,?)`,
      ['Glodalo Ø20 HSS','Glodala',4,4,'kom'])
    sqlDb.run(`INSERT INTO tools (name,category,current_quantity,min_quantity,unit,status) VALUES (?,?,?,?,?,?)`,
      ['Svrdlo Ø8 HSS-Co','Svrdla',6,8,'kom','Niske zalihe'])
    sqlDb.run(`INSERT INTO tools (name,category,current_quantity,min_quantity,unit) VALUES (?,?,?,?,?)`,
      ['Tokarni nož CNMG','Tokarni noževi',12,5,'kom'])
    sqlDb.run(`INSERT INTO sales_partners (name,type,country) VALUES (?,?,?)`,
      ['Livar d.o.o.','customer','Hrvatska'])
    sqlDb.run(`INSERT INTO sales_partners (name,type,country) VALUES (?,?,?)`,
      ['Đuro Đaković','customer','Hrvatska'])
    sqlDb.run(`INSERT INTO sales_partners (name,type,country) VALUES (?,?,?)`,
      ['Sandvik Coromant','supplier','Švedska'])
    sqlDb.run(`INSERT INTO alerts (type,message) VALUES (?,?)`,
      ['warning','Svrdlo Ø8 — niske zalihe: 6/8'])
    sqlDb.run(`INSERT INTO alerts (type,message) VALUES (?,?)`,
      ['info','Planirani preventivni servis za STR-001 za 3 dana'])
    sqlDb.run(`INSERT INTO employees (employee_code,first_name,last_name,department,position) VALUES (?,?,?,?,?)`,
      ['EMP-001','Ivan','Kovač','Produkcija','CNC operater'])
    sqlDb.run(`INSERT INTO employees (employee_code,first_name,last_name,department,position) VALUES (?,?,?,?,?)`,
      ['EMP-002','Marija','Horvat','Kvaliteta','QS inženjer'])
    sqlDb.run(`INSERT INTO warehouse_items (code,name,category,current_qty,min_qty,unit) VALUES (?,?,?,?,?,?)`,
      ['MAT-001','Aluminij EN AW-2024','Sirovine',150,50,'kg'])
    sqlDb.run(`INSERT INTO warehouse_items (code,name,category,current_qty,min_qty,unit) VALUES (?,?,?,?,?,?)`,
      ['MAT-002','Čelik 42CrMo4','Sirovine',80,100,'kg'])
    saveToFile()
    console.log('✅ Demo data seeded — admin/admin123, operator/operator123')
  } else {
    console.log('✅ Database loaded')
  }

  return db
}

db.init = init
module.exports = db
