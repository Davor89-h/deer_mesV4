const router = require('express').Router()
const db = require('../db')
const { auth } = require('../middleware/auth')

router.get('/', auth, (req, res) => {
  res.json(db.prepare('SELECT d.*, u.first_name||" "||u.last_name as uploader_name FROM documents d LEFT JOIN users u ON d.uploaded_by=u.id ORDER BY d.created_at DESC').all())
})
router.post('/', auth, (req, res) => {
  const { title, category, version, status, description, tags } = req.body
  if (!title) return res.status(400).json({ error: 'Title required' })
  const r = db.prepare('INSERT INTO documents (title,category,version,status,description,tags,uploaded_by) VALUES (?,?,?,?,?,?,?)').run(title,category,version||'1.0',status||'draft',description,tags,req.user.id)
  res.json(db.prepare('SELECT * FROM documents WHERE id=?').get(r.lastInsertRowid))
})
router.put('/:id', auth, (req, res) => {
  const { title, category, version, status, description, tags } = req.body
  db.prepare('UPDATE documents SET title=?,category=?,version=?,status=?,description=?,tags=? WHERE id=?').run(title,category,version,status,description,tags,req.params.id)
  res.json(db.prepare('SELECT * FROM documents WHERE id=?').get(req.params.id))
})
router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM documents WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router
