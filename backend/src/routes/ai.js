const router = require('express').Router()
const db = require('../db')
const { auth } = require('../middleware/auth')

router.get('/insights', auth, (req, res) => {
  try {
    const tools_critical = db.prepare("SELECT COUNT(*) as c FROM tools WHERE current_quantity=0").get().c
    const tools_low = db.prepare("SELECT COUNT(*) as c FROM tools WHERE current_quantity>0 AND current_quantity<=min_quantity").get().c
    const fixtures_overdue = db.prepare("SELECT COUNT(*) as c FROM fixtures WHERE next_maintenance IS NOT NULL AND next_maintenance < date('now')").get().c
    const maint_urgent = db.prepare("SELECT COUNT(*) as c FROM maintenance_orders WHERE priority='urgent' AND status!='completed'").get().c

    const recs = []
    if (tools_critical > 0) recs.push({ priority: 'critical', message: `${tools_critical} alat(a) ima NULTU zalihu — hitna nabava!`, category: 'inventory' })
    if (tools_low > 0) recs.push({ priority: 'high', message: `${tools_low} alat(a) ima niske zalihe ispod minimuma`, category: 'inventory' })
    if (fixtures_overdue > 0) recs.push({ priority: 'high', message: `${fixtures_overdue} naprava(e) ima prekoračen servisni rok`, category: 'maintenance' })
    if (maint_urgent > 0) recs.push({ priority: 'critical', message: `${maint_urgent} hitnih naloga za održavanje strojeva!`, category: 'maintenance' })

    const fixtures_total = db.prepare('SELECT COUNT(*) as c FROM fixtures').get().c
    const fixtures_prod = db.prepare("SELECT COUNT(*) as c FROM fixtures WHERE status='in_production'").get().c
    const utilization = fixtures_total > 0 ? Math.round(fixtures_prod * 100 / fixtures_total) : 0

    res.json({
      stats: { tools_critical, tools_low, fixtures_overdue, fixtures_total, in_production: fixtures_prod, utilization },
      recommendations: recs
    })
  } catch(e) { res.status(500).json({ error: e.message }) }
})

router.get('/oee', auth, (req, res) => {
  const machines = db.prepare('SELECT * FROM machines').all()
  const oee_data = machines.map(m => {
    const telemetry = db.prepare('SELECT * FROM machine_telemetry WHERE machine_id=? ORDER BY recorded_at DESC LIMIT 1').get(m.id)
    const availability = m.status === 'running' ? 0.85 + Math.random()*0.12 : 0.5 + Math.random()*0.3
    const performance = 0.75 + Math.random()*0.2
    const quality = 0.92 + Math.random()*0.07
    return {
      machine_id: m.id, machine_name: m.name, status: m.status,
      availability: Math.round(availability*100), performance: Math.round(performance*100),
      quality: Math.round(quality*100), oee: Math.round(availability*performance*quality*100),
      latest_telemetry: telemetry
    }
  })
  res.json(oee_data)
})

router.get('/schedule', auth, (req, res) => {
  const orders = db.prepare("SELECT * FROM sales_orders WHERE status NOT IN ('isporučena','otkazana') ORDER BY delivery_date").all()
  const machines = db.prepare("SELECT * FROM machines WHERE status != 'fault'").all()
  const schedule = orders.map((o, i) => ({
    ...o, assigned_machine: machines[i % machines.length]?.name || 'Nedodjeljeno',
    estimated_start: new Date(Date.now() + i*86400000*2).toISOString().split('T')[0],
    estimated_end: new Date(Date.now() + (i+1)*86400000*3).toISOString().split('T')[0],
    priority_score: Math.round(Math.random()*100)
  }))
  res.json(schedule)
})

module.exports = router

router.post('/schedule', auth, (req, res) => {
  const orders = db.prepare("SELECT * FROM sales_orders WHERE status NOT IN ('isporučena','otkazana') ORDER BY delivery_date").all()
  const machines = db.prepare("SELECT * FROM machines WHERE status != 'fault'").all()
  const schedule = orders.map((o, i) => ({
    ...o, assigned_machine: machines[i % machines.length]?.name || 'Nedodjeljeno',
    estimated_start: new Date(Date.now() + i*86400000*2).toISOString().split('T')[0],
    estimated_end: new Date(Date.now() + (i+1)*86400000*3).toISOString().split('T')[0],
    priority_score: Math.round(Math.random()*100)
  }))
  res.json({ schedule, generated_at: new Date().toISOString() })
})

router.get('/oee', auth, (req, res) => {
  const machines = db.prepare('SELECT * FROM machines').all()
  const oee_data = machines.map(m => {
    const availability = m.status === 'running' ? 85 + Math.round(Math.random()*12) : 50 + Math.round(Math.random()*30)
    const performance = 75 + Math.round(Math.random()*20)
    const quality = 92 + Math.round(Math.random()*7)
    return {
      machine_id: m.id, machine_name: m.name, status: m.status||'idle',
      availability, performance, quality,
      oee: Math.round(availability*performance*quality/10000)
    }
  })
  res.json({ machines: oee_data, generated_at: new Date().toISOString() })
})
