import { useState, useEffect } from 'react'
import { useApp } from '../App.jsx'
import TransactionItem from '../components/TransactionItem.jsx'

function fmt(n) {
  if (!n) return '0 €'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function Dashboard() {
  const { stats, selYear, selMonth, prevMonth, nextMonth, MONTH_FR, setTab, openEdit, refresh } = useApp()
  const [recent, setRecent] = useState([])

  useEffect(() => {
    fetch(`/api/transactions?year=${selYear}&month=${selMonth}&limit=8`)
      .then(r => r.json()).then(d => setRecent(d.data || [])).catch(() => {})
  }, [selYear, selMonth, refresh])

  const dep = stats?.monthly?.find(m => m.flow === 'Dépense')?.total || 0
  const rev = stats?.monthly?.find(m => m.flow === 'Revenu')?.total || 0
  const solde = rev - dep
  const topCats = stats?.byCategory || []
  const alerts = (stats?.budgetAlerts || []).filter(b => b.spent / b.monthly_limit >= b.alert_percent / 100)

  return (
    <>
      <div className="topbar">
        <h1>💰 MoneyTrack</h1>
        <div className="topbar-actions">
          {alerts.length > 0 && <span className="alert-badge">⚠️ {alerts.length}</span>}
        </div>
      </div>

      <div className="month-selector">
        <button onClick={prevMonth}>‹</button>
        <span>{MONTH_FR[selMonth]} {selYear}</span>
        <button onClick={nextMonth}>›</button>
      </div>

      <div className="hero-card">
        <div className="hero-month">Dépenses du mois</div>
        <div className="hero-amount">{fmt(dep)}</div>
        <div className="hero-row">
          <div className="hero-stat">
            <div className="hero-stat-label">Revenus</div>
            <div className="hero-stat-value income">+{fmt(rev)}</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-label">Solde</div>
            <div className={`hero-stat-value ${solde >= 0 ? 'income' : 'expense'}`}>{solde >= 0 ? '+' : ''}{fmt(solde)}</div>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="card card-sm" style={{ background: '#FEF3C7', margin: '0 16px 16px' }}>
          <div className="card-title" style={{ color: '#B45309' }}>⚠️ Alertes budget</div>
          {alerts.map(a => (
            <div key={a.id} style={{ fontSize: 14, marginBottom: 4, color: '#92400E' }}>
              {a.icon} {a.cat_name} — {fmt(a.spent)} / {fmt(a.monthly_limit)}
              ({Math.round(a.spent / a.monthly_limit * 100)}%)
            </div>
          ))}
        </div>
      )}

      {topCats.length > 0 && (
        <>
          <div className="section-header">
            <span className="section-title">Top catégories</span>
            <button className="section-link" onClick={() => setTab('charts')}>Voir tout →</button>
          </div>
          <div className="cat-grid">
            {topCats.slice(0, 6).map(c => (
              <div key={c.category_name} className="cat-pill">
                <div className="cat-pill-icon">{c.icon || '📋'}</div>
                <div className="cat-pill-name">{c.category_name}</div>
                <div className="cat-pill-amount" style={{ color: '#E74C3C' }}>{fmt(c.total)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-header" style={{ marginTop: 8 }}>
        <span className="section-title">Dernières opérations</span>
        <button className="section-link" onClick={() => setTab('transactions')}>Tout voir →</button>
      </div>

      {recent.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧾</div>
          <div className="empty-text">Aucune transaction ce mois</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <ul className="txn-list">
            {recent.map(t => <TransactionItem key={t.id} txn={t} onEdit={() => openEdit(t)} onDelete={() => { fetch(`/api/transactions/${t.id}`, { method: 'DELETE' }).then(refresh) }} />)}
          </ul>
        </div>
      )}
    </>
  )
}
