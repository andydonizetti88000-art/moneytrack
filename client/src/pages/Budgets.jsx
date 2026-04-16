import { useState } from 'react'
import { useApp } from '../App.jsx'

const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

export default function Budgets() {
  const { budgets, categories, selYear, selMonth, MONTH_FR, refresh } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category_id: '', monthly_limit: '', alert_percent: 80 })

  const expenseCats = categories.filter(c => c.flow_type === 'Dépense')

  const handleSave = () => {
    if (!form.category_id || !form.monthly_limit) return
    fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: +form.category_id, monthly_limit: +form.monthly_limit, alert_percent: +form.alert_percent })
    }).then(() => { setShowForm(false); setForm({ category_id: '', monthly_limit: '', alert_percent: 80 }); refresh() })
  }

  const handleDelete = (id) => {
    fetch(`/api/budgets/${id}`, { method: 'DELETE' }).then(refresh)
  }

  return (
    <>
      <div className="topbar">
        <h1>🎯 Budgets</h1>
        <button className="topbar-btn" onClick={() => setShowForm(true)}>+ Ajouter</button>
      </div>

      <div style={{ padding: '12px 16px 4px', fontSize: 14, color: 'var(--text-muted)' }}>
        Limites mensuelles pour {MONTH_FR[selMonth]} {selYear}
      </div>

      {budgets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <div className="empty-text">Aucun budget défini.<br />Appuyez sur <b>+ Ajouter</b> pour commencer.</div>
        </div>
      ) : (
        <div className="card">
          {budgets.map(b => {
            const pct = b.monthly_limit > 0 ? Math.min(100, (b.spent / b.monthly_limit) * 100) : 0
            const cls = pct >= 100 ? 'over' : pct >= b.alert_percent ? 'warn' : 'ok'
            return (
              <div key={b.id} className="budget-item">
                <div className="budget-header">
                  <div className="budget-cat">
                    <span style={{ fontSize: 20 }}>{b.icon || '📋'}</span>
                    <span>{b.cat_name}</span>
                    {pct >= b.alert_percent && <span className="alert-badge">{Math.round(pct)}%</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div className="budget-amounts">{fmt(b.spent)} / {fmt(b.monthly_limit)}</div>
                    <button onClick={() => handleDelete(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}>🗑️</button>
                  </div>
                </div>
                <div className="budget-bar-bg">
                  <div className={`budget-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Reste: <b style={{ color: pct >= 100 ? 'var(--danger)' : 'var(--success)' }}>{fmt(b.monthly_limit - b.spent)}</b>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-title">
              Nouveau budget
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="form-group">
              <label>Catégorie</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Choisir une catégorie...</option>
                {expenseCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Limite mensuelle (€)</label>
              <input type="number" min="1" value={form.monthly_limit} onChange={e => setForm(f => ({ ...f, monthly_limit: e.target.value }))} placeholder="ex: 300" />
            </div>
            <div className="form-group">
              <label>Alerte à {form.alert_percent}% du budget</label>
              <input type="range" min="50" max="100" step="5" value={form.alert_percent} onChange={e => setForm(f => ({ ...f, alert_percent: +e.target.value }))} style={{ width: '100%', marginTop: 8 }} />
            </div>
            <button className="btn btn-primary" onClick={handleSave}>Enregistrer le budget</button>
          </div>
        </div>
      )}
    </>
  )
}
