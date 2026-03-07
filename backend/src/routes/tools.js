const router = require('express').Router()
const db = require('../db')
const { auth } = require('../middleware/auth')

router.get('/', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM tools ORDER BY name').all())
})

router.post('/', auth, (req, res) => {
  const { internal_id, name, category, subcategory, current_quantity, min_quantity, unit, location, supplier, price, notes } = req.body
  if (!name) return res.status(400).json({ error: 'Name required' })
  const qty = parseInt(current_quantity) || 0
  const minQty = parseInt(min_quantity) || 0
  const status = qty === 0 ? 'Kritično' : qty <= minQty ? 'Niske zalihe' : 'Dostupan'
  const r = db.prepare('INSERT INTO tools (internal_id,name,category,subcategory,current_quantity,min_quantity,unit,location,supplier,price,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(internal_id,name,category,subcategory,qty,minQty,unit||'kom',location,supplier,price,status,notes)
  db.prepare('INSERT INTO tool_history (tool_id,action,quantity_before,quantity_after,quantity_change,user_name) VALUES (?,?,?,?,?,?)').run(r.lastInsertRowid,'create',0,qty,qty,req.user.username)
  res.json(db.prepare('SELECT * FROM tools WHERE id=?').get(r.lastInsertRowid))
})

router.put('/:id', auth, (req, res) => {
  const t = db.prepare('SELECT * FROM tools WHERE id=?').get(req.params.id)
  if (!t) return res.status(404).json({ error: 'Not found' })
  const { name, category, subcategory, current_quantity, min_quantity, unit, location, supplier, price, notes } = req.body
  const qty = parseInt(current_quantity) ?? t.current_quantity
  const minQty = parseInt(min_quantity) ?? t.min_quantity
  const status = qty === 0 ? 'Kritično' : qty <= minQty ? 'Niske zalihe' : 'Dostupan'
  db.prepare('UPDATE tools SET name=?,category=?,subcategory=?,current_quantity=?,min_quantity=?,unit=?,location=?,supplier=?,price=?,status=?,notes=? WHERE id=?').run(name,category,subcategory,qty,minQty,unit,location,supplier,price,status,notes,req.params.id)
  res.json(db.prepare('SELECT * FROM tools WHERE id=?').get(req.params.id))
})

router.patch('/:id/qty', auth, (req, res) => {
  const t = db.prepare('SELECT * FROM tools WHERE id=?').get(req.params.id)
  if (!t) return res.status(404).json({ error: 'Not found' })
  const change = parseFloat(req.body.change) || 0
  const newQty = Math.max(0, t.current_quantity + change)
  const status = newQty === 0 ? 'Kritično' : newQty <= t.min_quantity ? 'Niske zalihe' : 'Dostupan'
  db.prepare('UPDATE tools SET current_quantity=?,status=? WHERE id=?').run(newQty, status, req.params.id)
  db.prepare('INSERT INTO tool_history (tool_id,action,quantity_before,quantity_after,quantity_change,note,user_name) VALUES (?,?,?,?,?,?,?)').run(req.params.id,change>0?'add':'remove',t.current_quantity,newQty,change,req.body.note||'',req.user.username)
  res.json(db.prepare('SELECT * FROM tools WHERE id=?').get(req.params.id))
})

router.get('/:id/history', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM tool_history WHERE tool_id=? ORDER BY created_at DESC LIMIT 50').all(req.params.id))
})

router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM tools WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router
