import { useState, useEffect } from 'react'
import { useApp } from '../App.jsx'
import TransactionItem from '../components/TransactionItem.jsx'

const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

// Delta arrow + % vs previous value
function Delta({ current, prev, invert = false }) {
  if (!prev || prev === 0) return null
  const pct = Math.round(((current - prev) / prev) * 100)
  const up = pct > 0
  // For expenses: up is bad (red), down is good (green). invert=true flips color.
  const good = invert ? up : !up
  const color = good ? '#7EFFA0' : '#FFB3A7'
  const arrow = up ? '▲' : '▼'
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, marginLeft: 6, verticalAlign: 'middle' }}>
      {arrow} {Math.abs(pct)}%
    </span>
  )
}

export default function Dashboard() {
  const { stats, selYear, selMonth, prevMonth, nextMonth, MONTH_FR, setTab, openEdit, refresh } = useApp()
  const [recent, setRecent] = useState([])

  useEffect(() => {
    fetch(`/api/transactions?year=${selYear}&month=${selMonth}&limit=10`)
      .then(r => r.json()).then(d => setRecent(d.data || [])).catch(() => {})
  }, [selYear, selMonth, refresh])

  const dep = stats?.monthly?.find(m => m.flow === 'Dépense')?.total || 0
  const rev = stats?.monthly?.find(m => m.flow === 'Revenu')?.total || 0
  const vir = stats?.monthly?.find(m => m.flow === 'Virement')?.total || 0
  const solde = rev - dep
  const savingsRate = rev > 0 ? Math.round((solde / rev) * 100) : 0

  const topCats = stats?.byCategory || []
  const alerts = (stats?.budgetAlerts || []).filter(b => b.spent / b.monthly_limit >= b.alert_percent / 100)

  // Previous month data from last12
  const last12 = stats?.last12 || []
  const prevM = selMonth === 1 ? 12 : selMonth - 1
  const prevY = selMonth === 1 ? selYear - 1 : selYear
  const prevDep = last12.find(r => r.year === prevY && r.month === prevM && r.flow === 'Dépense')?.total || 0
  const prevRev = last12.find(r => r.year === prevY && r.month === prevM && r.flow === 'Revenu')?.total || 0

  // YTD totals from last12 (current year only, up to selMonth)
  const ytdDep = last12
    .filter(r => r.year === selYear && r.month <= selMonth && r.flow === 'Dépense')
    .reduce((s, r) => s + r.total, 0)
  const ytdRev = last12
    .filter(r => r.year === selYear && r.month <= selMonth && r.flow === 'Revenu')
    .reduce((s, r) => s + r.total, 0)
  const ytdSolde = ytdRev - ytdDep
  const monthsCount = selMonth // number of months in YTD
  const avgDep = monthsCount > 0 ? ytdDep / monthsCount : 0

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

      {/* ── Hero card ── */}
      <div className="hero-card">
        <div className="hero-month">
          Dépenses du mois
          {prevDep > 0 && <Delta current={dep} prev={prevDep} />}
        </div>
        <div className="hero-amount">{fmt(dep)}</div>

        <div className="hero-row">
          <div className="hero-stat">
            <div className="hero-stat-label">Revenus</div>
            <div className="hero-stat-value income">
              +{fmt(rev)}
              {prevRev > 0 && <Delta current={rev} prev={prevRev} invert={true} />}
            </div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-label">Solde</div>
            <div className={`hero-stat-value ${solde >= 0 ? 'income' : 'expense'}`}>
              {solde >= 0 ? '+' : ''}{fmt(solde)}
            </div>
          </div>
        </div>

        {/* Savings rate badge */}
        {rev > 0 && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,.2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${Math.max(0, Math.min(100, savingsRate))}%`,
                background: savingsRate >= 20 ? '#7EFFA0' : savingsRate >= 10 ? '#FFE083' : '#FFB3A7',
                transition: 'width .6s ease'
              }} />
            </div>
            <span style={{ fontSize: 12, opacity: .85, flexShrink: 0 }}>
              {savingsRate >= 0 ? '💚' : '🔴'} Épargne {savingsRate}%
            </span>
          </div>
        )}
      </div>

      {/* ── Budget alerts ── */}
      {alerts.length > 0 && (
        <div className="card card-sm" style={{ background: '#FEF3C7', margin: '0 16px 16px' }}>
          <div className="card-title" style={{ color: '#B45309' }}>⚠️ Alertes budget</div>
          {alerts.map(a => (
            <div key={a.id} style={{ fontSize: 14, marginBottom: 4, color: '#92400E' }}>
              {a.icon} {a.cat_name} — {fmt(a.spent)} / {fmt(a.monthly_limit)} ({Math.round(a.spent / a.monthly_limit * 100)}%)
            </div>
          ))}
        </div>
      )}

      {/* ── YTD summary ── */}
      {monthsCount > 1 && (
        <div className="card card-sm" style={{ margin: '0 16px 16px' }}>
          <div className="card-title">📅 Bilan {selYear} — {monthsCount} mois</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Dépenses</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--danger)' }}>{fmt(ytdDep)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>~{fmt(avgDep)}/mois</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Revenus</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)' }}>{fmt(ytdRev)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Solde cumulé</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: ytdSolde >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {ytdSolde >= 0 ? '+' : ''}{fmt(ytdSolde)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Top catégories avec barres ── */}
      {topCats.length > 0 && (
        <>
          <div className="section-header">
            <span className="section-title">Top dépenses</span>
            <button className="section-link" onClick={() => setTab('charts')}>Voir graphiques →</button>
          </div>
          <div className="card" style={{ padding: '14px 16px' }}>
            {topCats.slice(0, 6).map((c, i) => {
              const pct = Math.min(100, (c.total / (topCats[0]?.total || 1)) * 100)
              const barColor = i === 0 ? 'var(--danger)' : i <= 2 ? 'var(--warning)' : 'var(--primary-light)'
              return (
                <div key={c.category_name} style={{ marginBottom: i < 5 ? 14 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{c.icon || '📋'}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{c.category_name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)' }}>{fmt(c.total)}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                        {dep > 0 ? Math.round((c.total / dep) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: barColor, transition: 'width .5s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Transactions récentes ── */}
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
            {recent.map(t => (
              <TransactionItem
                key={t.id}
                txn={t}
                onEdit={() => openEdit(t)}
                onDelete={() => { fetch(`/api/transactions/${t.id}`, { method: 'DELETE' }).then(refresh) }}
              />
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
