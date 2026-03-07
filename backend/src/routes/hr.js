const router = require('express').Router()
const db = require('../db')
const { auth } = require('../middleware/auth')

router.get('/employees', auth, (req, res) => res.json(db.prepare('SELECT * FROM employees WHERE active=1 ORDER BY last_name,first_name').all()))
router.post('/employees', auth, (req, res) => {
  const { first_name, last_name, department, position, employment_type, start_date } = req.body
  const code = 'EMP-' + String(Date.now()).slice(-5)
  const r = db.prepare('INSERT INTO employees (employee_code,first_name,last_name,department,position,employment_type,start_date) VALUES (?,?,?,?,?,?,?)').run(code,first_name,last_name,department,position,employment_type||'full_time',start_date)
  res.json(db.prepare('SELECT * FROM employees WHERE id=?').get(r.lastInsertRowid))
})
router.put('/employees/:id', auth, (req, res) => {
  const { first_name, last_name, department, position, employment_type } = req.body
  db.prepare('UPDATE employees SET first_name=?,last_name=?,department=?,position=?,employment_type=? WHERE id=?').run(first_name,last_name,department,position,employment_type,req.params.id)
  res.json(db.prepare('SELECT * FROM employees WHERE id=?').get(req.params.id))
})
router.delete('/employees/:id', auth, (req, res) => {
  db.prepare('UPDATE employees SET active=0 WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

router.get('/attendance', auth, (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0]
  res.json(db.prepare('SELECT a.*, e.first_name||" "||e.last_name as employee_name FROM attendance a JOIN employees e ON a.employee_id=e.id WHERE a.date=? ORDER BY e.last_name').all(date))
})
router.post('/attendance', auth, (req, res) => {
  const { employee_id, date, check_in, check_out, status } = req.body
  const r = db.prepare('INSERT OR REPLACE INTO attendance (employee_id,date,check_in,check_out,status) VALUES (?,?,?,?,?)').run(employee_id,date||new Date().toISOString().split('T')[0],check_in,check_out,status||'present')
  res.json({ ok: true })
})

router.get('/leaves', auth, (req, res) => {
  res.json(db.prepare('SELECT l.*, e.first_name||" "||e.last_name as employee_name FROM leave_requests l JOIN employees e ON l.employee_id=e.id ORDER BY l.created_at DESC').all())
})
router.post('/leaves', auth, (req, res) => {
  const { employee_id, leave_type, start_date, end_date, notes } = req.body
  const r = db.prepare('INSERT INTO leave_requests (employee_id,leave_type,start_date,end_date,notes) VALUES (?,?,?,?,?)').run(employee_id,leave_type||'annual',start_date,end_date,notes)
  res.json(db.prepare('SELECT * FROM leave_requests WHERE id=?').get(r.lastInsertRowid))
})
router.patch('/leaves/:id', auth, (req, res) => {
  db.prepare('UPDATE leave_requests SET status=? WHERE id=?').run(req.body.status,req.params.id)
  res.json({ ok: true })
})

router.get('/stats', auth, (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const total = db.prepare('SELECT COUNT(*) as cnt FROM employees WHERE active=1').get().cnt
  const present = db.prepare('SELECT COUNT(*) as cnt FROM attendance WHERE date=? AND status="present"').get(today).cnt
  const pending_leaves = db.prepare('SELECT COUNT(*) as cnt FROM leave_requests WHERE status="pending"').get().cnt
  res.json({ total_employees: total, present_today: present, pending_leaves })
})

module.exports = router
