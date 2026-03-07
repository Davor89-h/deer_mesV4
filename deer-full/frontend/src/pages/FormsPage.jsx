import { useState, useEffect } from 'react'
import { C, Btn, Loading } from '../components/UI'
import { FileText, Plus, CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

const TYPE_LABELS = {
  tool_request: '🔧 Zahtjev za alat',
  maintenance_request: '⚙️ Zahtjev za servis',
  purchase_request: '🛒 Nabavni zahtjev',
  production_issue: '⚠️ Produkcijski problem',
  custom: '📋 Ostalo',
}

const STATUS_CONFIG = {
  draft:        { color: '#6B7280', label: 'Skica' },
  submitted:    { color: '#F5BC54', label: 'Podnesen' },
  under_review: { color: '#60A5FA', label: 'U obradi' },
  approved:     { color: '#4ADE80', label: 'Odobren' },
  rejected:     { color: '#F87171', label: 'Odbijen' },
  completed:    { color: '#818CF8', label: 'Završen' },
}

const PRIORITY_CONFIG = {
  low:    { color: '#6B7280', label: 'Nizak' },
  normal: { color: '#60A5FA', label: 'Normalan' },
  high:   { color: '#F5BC54', label: 'Visok' },
  urgent: { color: '#F87171', label: 'Hitno' },
}

export default function FormsPage() {
  const { user, isAdmin } = useAuth()
  const [forms, setForms] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [reviewForm, setReviewForm] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      if (filterType) params.type = filterType
      const [fr, sr] = await Promise.all([
        api.get('/forms', { params }),
        api.get('/forms/stats')
      ])
      setForms(fr.data.forms || [])
      setStats(sr.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [filterStatus, filterType])

  const handleCreate = async (data) => {
    await api.post('/forms', data)
    setShowCreate(false)
    load()
  }

  const handleReview = async (id, status, notes) => {
    await api.patch(`/forms/${id}/status`, { status, review_notes: notes })
    setReviewForm(null)
    load()
  }

  if (loading) return <Loading/>

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24 }}>
        <div>
          <div style={{ fontSize:10,color:C.muted,letterSpacing:2 }}>DEER MES · WORKFLOW</div>
          <div style={{ fontSize:20,fontWeight:700,color:'#E8F2F0',letterSpacing:2 }}>ZAHTJEVI I FORME</div>
        </div>
        <Btn onClick={() => setShowCreate(true)}>
          <Plus size={14}/> Novi zahtjev
        </Btn>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:24 }}>
          {[
            { label:'Ukupno', value:stats.total, color:C.teal },
            { label:'Na čekanju', value:stats.pending, color:'#F5BC54' },
            { label:'U obradi', value:stats.reviewing, color:'#60A5FA' },
            { label:'Odobreno', value:stats.approved, color:'#4ADE80' },
            { label:'Hitno', value:stats.urgent, color:'#F87171' },
          ].map(s => (
            <div key={s.label} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 18px',textAlign:'center' }}>
              <div style={{ fontSize:24,fontWeight:800,color:s.color }}>{s.value}</div>
              <div style={{ fontSize:10,color:C.muted,letterSpacing:1 }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex',gap:10,marginBottom:16 }}>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
          style={{ background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,padding:'7px 12px',color:'#E8F2F0',fontSize:12 }}>
          <option value=''>Svi statusi</option>
          {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)}
          style={{ background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,padding:'7px 12px',color:'#E8F2F0',fontSize:12 }}>
          <option value=''>Svi tipovi</option>
          {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Forms list */}
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        {forms.length === 0 && (
          <div style={{ textAlign:'center',padding:40,color:C.muted }}>Nema zahtjeva</div>
        )}
        {forms.map(f => {
          const sc = STATUS_CONFIG[f.status] || STATUS_CONFIG.draft
          const pc = PRIORITY_CONFIG[f.priority] || PRIORITY_CONFIG.normal
          const isExpanded = expandedId === f.id
          return (
            <div key={f.id} style={{ background:C.surface,border:`1px solid ${isExpanded ? C.teal+'44' : C.border}`,borderRadius:14,overflow:'hidden' }}>
              {/* Form header row */}
              <div style={{ display:'flex',alignItems:'center',gap:14,padding:'14px 18px',cursor:'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : f.id)}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:'#E8F2F0',marginBottom:3 }}>{f.title}</div>
                  <div style={{ fontSize:10,color:C.muted }}>
                    {TYPE_LABELS[f.type] || f.type} · {new Date(f.created_at).toLocaleDateString('hr-HR')} · {f.submitter_name}
                  </div>
                </div>
                <span style={{ fontSize:10,padding:'3px 10px',borderRadius:20,background:`${pc.color}20`,color:pc.color,border:`1px solid ${pc.color}33` }}>
                  {pc.label.toUpperCase()}
                </span>
                <span style={{ fontSize:10,padding:'3px 10px',borderRadius:20,background:`${sc.color}20`,color:sc.color,border:`1px solid ${sc.color}33` }}>
                  {sc.label.toUpperCase()}
                </span>
                {isExpanded ? <ChevronUp size={14} color={C.muted}/> : <ChevronDown size={14} color={C.muted}/>}
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ padding:'0 18px 18px',borderTop:`1px solid ${C.border}` }}>
                  <div style={{ paddingTop:14,fontSize:13,color:C.muted2,lineHeight:1.7 }}>
                    {f.description || <span style={{ color:C.muted }}>Nema opisa</span>}
                  </div>
                  {f.review_notes && (
                    <div style={{ marginTop:12,padding:'10px 14px',background:`${C.teal}10`,borderRadius:8,fontSize:12,color:C.teal,border:`1px solid ${C.teal}22` }}>
                      <strong>Napomena recenzenta:</strong> {f.review_notes}
                    </div>
                  )}
                  {/* Admin actions */}
                  {(isAdmin || user?.role === 'voditelj') && f.status === 'submitted' && (
                    <div style={{ display:'flex',gap:10,marginTop:14 }}>
                      <Btn size='sm' color='green' onClick={() => setReviewForm({ id:f.id, action:'approve' })}>
                        <CheckCircle size={12}/> Odobri
                      </Btn>
                      <Btn size='sm' color='red' onClick={() => setReviewForm({ id:f.id, action:'reject' })}>
                        <XCircle size={12}/> Odbij
                      </Btn>
                      <Btn size='sm' onClick={() => handleReview(f.id, 'under_review', '')}>
                        <Clock size={12}/> U obradu
                      </Btn>
                    </div>
                  )}
                  {(isAdmin || user?.role === 'voditelj') && f.status === 'approved' && (
                    <div style={{ marginTop:14 }}>
                      <Btn size='sm' onClick={() => handleReview(f.id, 'completed', '')}>
                        ✅ Označi završenim
                      </Btn>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Create modal */}
      {showCreate && <CreateFormModal onSubmit={handleCreate} onClose={() => setShowCreate(false)}/>}

      {/* Review modal */}
      {reviewForm && (
        <ReviewModal
          action={reviewForm.action}
          onSubmit={(notes) => handleReview(reviewForm.id, reviewForm.action === 'approve' ? 'approved' : 'rejected', notes)}
          onClose={() => setReviewForm(null)}
        />
      )}
    </div>
  )
}

function CreateFormModal({ onSubmit, onClose }) {
  const [type, setType] = useState('tool_request')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('normal')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    try { await onSubmit({ type, title, description, priority }) }
    catch {}
    setSubmitting(false)
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:28,width:520,maxWidth:'95vw' }}>
        <div style={{ fontSize:14,fontWeight:700,color:'#E8F2F0',marginBottom:20 }}>NOVI ZAHTJEV</div>

        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          <div>
            <label style={{ fontSize:10,color:C.muted,letterSpacing:1,display:'block',marginBottom:6 }}>TIP ZAHTJEVA</label>
            <select value={type} onChange={e=>setType(e.target.value)}
              style={{ width:'100%',background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 12px',color:'#E8F2F0',fontSize:13 }}>
              {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:10,color:C.muted,letterSpacing:1,display:'block',marginBottom:6 }}>NASLOV *</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder='Kratak opis zahtjeva...'
              style={{ width:'100%',boxSizing:'border-box',background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 12px',color:'#E8F2F0',fontSize:13 }}/>
          </div>
          <div>
            <label style={{ fontSize:10,color:C.muted,letterSpacing:1,display:'block',marginBottom:6 }}>OPIS</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3}
              placeholder='Detaljan opis zahtjeva, razlog, urgentnost...'
              style={{ width:'100%',boxSizing:'border-box',background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 12px',color:'#E8F2F0',fontSize:13,resize:'vertical' }}/>
          </div>
          <div>
            <label style={{ fontSize:10,color:C.muted,letterSpacing:1,display:'block',marginBottom:6 }}>PRIORITET</label>
            <select value={priority} onChange={e=>setPriority(e.target.value)}
              style={{ width:'100%',background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 12px',color:'#E8F2F0',fontSize:13 }}>
              {Object.entries(PRIORITY_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:'flex',gap:10,marginTop:22,justifyContent:'flex-end' }}>
          <Btn onClick={onClose} style={{ background:'transparent',border:`1px solid ${C.border}`,color:C.muted2 }}>Odustani</Btn>
          <Btn onClick={handleSubmit} disabled={!title.trim() || submitting}>
            {submitting ? 'Slanje...' : 'Pošalji zahtjev'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

function ReviewModal({ action, onSubmit, onClose }) {
  const [notes, setNotes] = useState('')
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:24,width:420 }}>
        <div style={{ fontSize:13,fontWeight:700,color:action==='approve'?'#4ADE80':'#F87171',marginBottom:16 }}>
          {action === 'approve' ? '✅ ODOBRAVANJE ZAHTJEVA' : '❌ ODBIJANJE ZAHTJEVA'}
        </div>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
          placeholder='Napomena (opcionalno)...'
          style={{ width:'100%',boxSizing:'border-box',background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 12px',color:'#E8F2F0',fontSize:13,resize:'none' }}/>
        <div style={{ display:'flex',gap:10,marginTop:16,justifyContent:'flex-end' }}>
          <Btn onClick={onClose} style={{ background:'transparent',border:`1px solid ${C.border}`,color:C.muted2 }}>Odustani</Btn>
          <Btn onClick={() => onSubmit(notes)} style={{ background:action==='approve'?'#4ADE80':'#F87171',color:'#000' }}>
            {action === 'approve' ? 'Odobri' : 'Odbij'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
