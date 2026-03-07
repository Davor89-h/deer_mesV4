const router = require('express').Router()
const bcrypt = require('bcryptjs')
const db = require('../db')
const { auth } = require('../middleware/auth')

router.get('/', auth, (req, res) => {
  res.json(db.prepare('SELECT id, username, first_name, last_name, email, role, active, created_at FROM users ORDER BY first_name').all())
})

router.put('/:id', auth, (req, res) => {
  const { first_name, last_name, email, role, active } = req.body
  db.prepare('UPDATE users SET first_name=?,last_name=?,email=?,role=?,active=? WHERE id=?').run(first_name,last_name,email,role,active?1:0,req.params.id)
  res.json(db.prepare('SELECT id,username,first_name,last_name,email,role,active FROM users WHERE id=?').get(req.params.id))
})

router.patch('/:id/password', auth, (req, res) => {
  const { password } = req.body
  if (!password || password.length < 4) return res.status(400).json({ error: 'Password too short' })
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(password,10), req.params.id)
  res.json({ ok: true })
})

router.delete('/:id', auth, (req, res) => {
  if (req.user.id == req.params.id) return res.status(400).json({ error: 'Cannot delete yourself' })
  db.prepare('UPDATE users SET active=0 WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router
