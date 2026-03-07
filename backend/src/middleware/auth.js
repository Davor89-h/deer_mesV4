const jwt = require('jsonwebtoken')
const SECRET = process.env.JWT_SECRET || 'deer-mes-secret-key-2024'

const auth = (req, res, next) => {
  const header = req.headers.authorization
  if (!header) return res.status(401).json({ error: 'No token' })
  const token = header.replace('Bearer ', '')
  try {
    req.user = jwt.verify(token, SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

module.exports = { auth, SECRET }
