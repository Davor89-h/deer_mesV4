const router = require('express').Router()
const db = require('../db')
const { auth } = require('../middleware/auth')

router.get('/', auth, (req, res) => {
  res.json(db.prepare('SELECT q.*, u.first_name||" "||u.last_name as inspector_name FROM quality_checks q LEFT JOIN users u ON q.inspector_id=u.id ORDER BY q.checked_at DESC').all())
})
router.post('/', auth, (req, res) => {
  const { part_name, quantity, good_qty, rejected_qty, notes } = req.body
  const gQty = parseInt(good_qty)||0, rQty = parseInt(rejected_qty)||0
  const status = rQty===0 ? 'odobreno' : gQty===0 ? 'odbijeno' : 'djelomično'
  const r = db.prepare('INSERT INTO quality_checks (part_name,quantity,good_qty,rejected_qty,inspector_id,status,notes) VALUES (?,?,?,?,?,?,?)').run(part_name,parseInt(quantity)||gQty+rQty,gQty,rQty,req.user.id,status,notes)
  res.json(db.prepare('SELECT * FROM quality_checks WHERE id=?').get(r.lastInsertRowid))
})
router.put('/:id', auth, (req, res) => {
  const { status, notes } = req.body
  db.prepare('UPDATE quality_checks SET status=?,notes=? WHERE id=?').run(status,notes,req.params.id)
  res.json(db.prepare('SELECT * FROM quality_checks WHERE id=?').get(req.params.id))
})
router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM quality_checks WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router
