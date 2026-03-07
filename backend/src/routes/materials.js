const router = require('express').Router()
const db = require('../db')
const { auth } = require('../middleware/auth')

router.get('/', auth, (req, res) => res.json(db.prepare('SELECT * FROM materials ORDER BY name').all()))

router.post('/', auth, (req, res) => {
  const { code, name, category, current_quantity, min_quantity, unit, location, supplier, price, notes } = req.body
  if (!name) return res.status(400).json({ error: 'Name required' })
  const qty = parseFloat(current_quantity)||0, minQty = parseFloat(min_quantity)||0
  const status = qty===0?'Kritično':qty<=minQty?'Niske zalihe':'Dostupan'
  const r = db.prepare('INSERT INTO materials (code,name,category,current_quantity,min_quantity,unit,location,supplier,price,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(code,name,category,qty,minQty,unit||'kg',location,supplier,price,status,notes)
  res.json(db.prepare('SELECT * FROM materials WHERE id=?').get(r.lastInsertRowid))
})

router.put('/:id', auth, (req, res) => {
  const { name, category, current_quantity, min_quantity, unit, location, supplier, price, notes } = req.body
  const qty = parseFloat(current_quantity)||0, minQty = parseFloat(min_quantity)||0
  const status = qty===0?'Kritično':qty<=minQty?'Niske zalihe':'Dostupan'
  db.prepare('UPDATE materials SET name=?,category=?,current_quantity=?,min_quantity=?,unit=?,location=?,supplier=?,price=?,status=?,notes=? WHERE id=?').run(name,category,qty,minQty,unit,location,supplier,price,status,notes,req.params.id)
  res.json(db.prepare('SELECT * FROM materials WHERE id=?').get(req.params.id))
})

router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM materials WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router
