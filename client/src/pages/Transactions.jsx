import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../App.jsx'
import TransactionItem from '../components/TransactionItem.jsx'

export default function Transactions() {
  const { selYear, selMonth, prevMonth, nextMonth, MONTH_FR, openEdit, refresh } = useApp()
  const [txns, setTxns] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [flowFilter, setFlowFilter] = useState('all')
  const [page, setPage] = useState(0)
  const PER_PAGE = 30

  const load = useCallback(() => {
    const params = new URLSearchParams({ year: selYear, month: selMonth, limit: PER_PAGE, offset: page * PER_PAGE })
    if (search) params.set('search', search)
    if (flowFilter !== 'all') params.set('flow', flowFilter)
    fetch(`/api/transactions?${params}`).then(r => r.json()).then(d => {
      setTxns(d.data || [])
      setTotal(d.total || 0)
    }).catch(() => {})
  }, [selYear, selMonth, search, flowFilter, page, refresh])

  useEffect(() => { setPage(0) }, [selYear, selMonth, search, flowFilter])
  useEffect(() => { load() }, [load])

  const handleDelete = (id) => {
    fetch(`/api/transactions/${id}`, { method: 'DELETE' }).then(() => { load(); refresh() })
  }

  const grouped = {}
  txns.forEach(t => {
    if (!grouped[t.date]) grouped[t.date] = []
    grouped[t.date].push(t)
  })

  return (
    <>
      <div className="topbar">
        <h1>📋 Transactions</h1>
        <span style={{ fontSize: 14, opacity: .75 }}>{total} opérations</span>
      </div>

      <div className="month-selector">
        <button onClick={prevMonth}>‹</button>
        <span>{MONTH_FR[selMonth]} {selYear}</span>
        <button onClick={nextMonth}>›</button>
      </div>

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="filter-tabs">
        {[['all','Toutes'],['Dépense','Dépenses'],['Revenu','Revenus'],['Virement','Virements']].map(([v,l]) => (
          <button key={v} className={`filter-tab ${flowFilter === v ? 'active' : ''}`} onClick={() => setFlowFilter(v)}>{l}</button>
        ))}
      </div>

      {txns.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-text">Aucune transaction trouvée</div>
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div style={{ padding: '8px 20px 4px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden', margin: '0 16px 8px' }}>
                <ul className="txn-list">
                  {items.map(t => <TransactionItem key={t.id} txn={t} onEdit={() => openEdit(t)} onDelete={() => handleDelete(t.id)} />)}
                </ul>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, padding: '8px 16px 16px', justifyContent: 'center' }}>
            {page > 0 && <button className="btn btn-ghost" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => setPage(p => p - 1)}>← Précédent</button>}
            {(page + 1) * PER_PAGE < total && <button className="btn btn-ghost" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => setPage(p => p + 1)}>Suivant →</button>}
          </div>
        </>
      )}
    </>
  )
}
