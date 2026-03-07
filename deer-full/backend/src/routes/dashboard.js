const router = require('express').Router()
const db = require('../db')
const { auth } = require('../middleware/auth')

router.get('/stats', auth, (req, res) => {
  try {
    const tools = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status="Dostupan" THEN 1 ELSE 0 END) as available, SUM(CASE WHEN current_quantity<=min_quantity AND current_quantity>0 THEN 1 ELSE 0 END) as low, SUM(CASE WHEN current_quantity=0 THEN 1 ELSE 0 END) as critical FROM tools').get()
    const orders = { active: 0, late: 0 }
    const alerts = db.prepare('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 20').all()
    const activity = db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 10').all()
    res.json({ tools, orders, clamping: { total: 0, critical: 0 }, alerts, activity })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.patch('/alerts/:id/read', auth, (req, res) => {
  db.prepare('UPDATE alerts SET is_read=1 WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

router.post('/alerts/read-all', auth, (req, res) => {
  db.prepare('UPDATE alerts SET is_read=1').run()
  res.json({ ok: true })
})

module.exports = router
