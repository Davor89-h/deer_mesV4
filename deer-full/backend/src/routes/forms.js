const router = require('express').Router()
const db = require('../db')
const { auth } = require('../middleware/auth')

router.get('/', auth, (req, res) => {
  const rows = db.prepare('SELECT f.*, u.first_name||" "||u.last_name as requester_name FROM form_requests f LEFT JOIN users u ON f.requested_by=u.id ORDER BY f.created_at DESC').all()
  res.json(rows)
})
router.post('/', auth, (req, res) => {
  const { form_type, title, priority, data, notes } = req.body
  const r = db.prepare('INSERT INTO form_requests (form_type,title,priority,data,notes,requested_by) VALUES (?,?,?,?,?,?)').run(form_type,title,priority||'normal',JSON.stringify(data||{}),notes,req.user.id)
  res.json(db.prepare('SELECT * FROM form_requests WHERE id=?').get(r.lastInsertRowid))
})
router.patch('/:id', auth, (req, res) => {
  const { status } = req.body
  const resolved = status==='resolved' ? new Date().toISOString() : null
  db.prepare('UPDATE form_requests SET status=?, resolved_at=COALESCE(?,resolved_at) WHERE id=?').run(status,resolved,req.params.id)
  res.json({ ok: true })
})
router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM form_requests WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router
