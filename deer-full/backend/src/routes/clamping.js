const router = require('express').Router()
const db = require('../db')
const { auth } = require('../middleware/auth')

router.get('/', auth, (req, res) => res.json(db.prepare('SELECT * FROM clamping_devices ORDER BY name').all()))

router.post('/', auth, (req, res) => {
  const { internal_id, name, type, current_quantity, min_quantity, location, notes } = req.body
  if (!name) return res.status(400).json({ error: 'Name required' })
  const qty = parseInt(current_quantity)||0, minQty = parseInt(min_quantity)||0
  const status = qty===0?'Kritično':qty<=minQty?'Niske zalihe':'Dostupan'
  const r = db.prepare('INSERT INTO clamping_devices (internal_id,name,type,current_quantity,min_quantity,location,status,notes) VALUES (?,?,?,?,?,?,?,?)').run(internal_id,name,type,qty,minQty,location,status,notes)
  res.json(db.prepare('SELECT * FROM clamping_devices WHERE id=?').get(r.lastInsertRowid))
})

router.put('/:id', auth, (req, res) => {
  const { name, type, current_quantity, min_quantity, location, notes } = req.body
  const qty = parseInt(current_quantity)||0, minQty = parseInt(min_quantity)||0
  const status = qty===0?'Kritično':qty<=minQty?'Niske zalihe':'Dostupan'
  db.prepare('UPDATE clamping_devices SET name=?,type=?,current_quantity=?,min_quantity=?,location=?,status=?,notes=? WHERE id=?').run(name,type,qty,minQty,location,status,notes,req.params.id)
  res.json(db.prepare('SELECT * FROM clamping_devices WHERE id=?').get(req.params.id))
})

router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM clamping_devices WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router
