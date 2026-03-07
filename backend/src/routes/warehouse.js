const router = require('express').Router()
const db = require('../db')
const { auth } = require('../middleware/auth')

router.get('/', auth, (req, res) => res.json(db.prepare('SELECT * FROM warehouse_items ORDER BY name').all()))
router.post('/', auth, (req, res) => {
  const { code, name, category, current_qty, min_qty, unit, location, supplier, unit_price } = req.body
  if (!name) return res.status(400).json({ error: 'Name required' })
  const r = db.prepare('INSERT INTO warehouse_items (code,name,category,current_qty,min_qty,unit,location,supplier,unit_price) VALUES (?,?,?,?,?,?,?,?,?)').run(code,name,category,parseFloat(current_qty)||0,parseFloat(min_qty)||0,unit||'kom',location,supplier,unit_price)
  res.json(db.prepare('SELECT * FROM warehouse_items WHERE id=?').get(r.lastInsertRowid))
})
router.put('/:id', auth, (req, res) => {
  const { name, category, current_qty, min_qty, unit, location } = req.body
  db.prepare('UPDATE warehouse_items SET name=?,category=?,current_qty=?,min_qty=?,unit=?,location=? WHERE id=?').run(name,category,parseFloat(current_qty)||0,parseFloat(min_qty)||0,unit,location,req.params.id)
  res.json(db.prepare('SELECT * FROM warehouse_items WHERE id=?').get(req.params.id))
})
router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM warehouse_items WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})
router.post('/:id/move', auth, (req, res) => {
  const { movement_type, quantity, reference } = req.body
  const item = db.prepare('SELECT * FROM warehouse_items WHERE id=?').get(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  const qty = parseFloat(quantity)||0
  const newQty = movement_type==='in' ? item.current_qty+qty : Math.max(0, item.current_qty-qty)
  db.prepare('UPDATE warehouse_items SET current_qty=? WHERE id=?').run(newQty, req.params.id)
  db.prepare('INSERT INTO warehouse_movements (item_id,movement_type,quantity,reference,user_id) VALUES (?,?,?,?,?)').run(req.params.id,movement_type,qty,reference,req.user.id)
  res.json({ ok: true, new_qty: newQty })
})

module.exports = router
