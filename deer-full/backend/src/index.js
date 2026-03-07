const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const PORT = process.env.PORT || 3000

const db = require('./db')
db.init().then(() => {
  app.use('/api/auth', require('./routes/auth'))
  app.use('/api/dashboard', require('./routes/dashboard'))
  app.use('/api/fixtures', require('./routes/fixtures'))
  app.use('/api/tools', require('./routes/tools'))
  app.use('/api/clamping', require('./routes/clamping'))
  app.use('/api/machines', require('./routes/machines'))
  app.use('/api/locations', require('./routes/locations'))
  app.use('/api/materials', require('./routes/materials'))
  app.use('/api/usage', require('./routes/usage'))
  app.use('/api/sales', require('./routes/sales'))
  app.use('/api/quality', require('./routes/quality'))
  app.use('/api/warehouse', require('./routes/warehouse'))
  app.use('/api/hr', require('./routes/hr'))
  app.use('/api/dms', require('./routes/dms'))
  app.use('/api/forms', require('./routes/forms'))
  app.use('/api/maintenance', require('./routes/maintenance'))
  app.use('/api/kpi', require('./routes/kpi'))
  app.use('/api/ai', require('./routes/ai'))
  app.use('/api/users', require('./routes/users'))

  // Serve built frontend
  const frontendDist = path.join(__dirname, '../../frontend/dist')
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist))
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendDist, 'index.html'))
      }
    })
  } else {
    app.get('/', (req, res) => res.json({ status: 'DEER MES API running', note: 'Frontend not built yet' }))
  }

  app.listen(PORT, () => {
    console.log(`🦌 DEER MES v6 running on port ${PORT}`)
  })
}).catch(err => {
  console.error('❌ Failed to start:', err)
  process.exit(1)
})
