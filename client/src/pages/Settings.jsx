import { useState, useRef } from 'react'
import { useApp } from '../App.jsx'

export default function Settings() {
  const { refresh } = useApp()
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [showRecurring, setShowRecurring] = useState(false)
  const [recurring, setRecurring] = useState([])
  const { categories } = useApp()
  const [recurForm, setRecurForm] = useState({ category_id: '', category_name: '', amount: '', flow: 'Dépense', day_of_month: 1, note: '' })
  const fileRef = useRef()

  const loadRecurring = () => {
    fetch('/api/recurring').then(r => r.json()).then(data => { setRecurring(data); setShowRecurring(true) })
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true); setImportResult(null)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const transactions = Array.isArray(data) ? data : data.transactions || []
      const res = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions })
      })
      const result = await res.json()
      setImportResult(result)
      refresh()
    } catch (err) {
      setImportResult({ error: err.message })
    } finally { setImporting(false) }
  }

  const toggleRecur = (id, active) => {
    fetch(`/api/recurring/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: active ? 0 : 1 }) })
      .then(() => loadRecurring())
  }

  const deleteRecur = (id) => {
    fetch(`/api/recurring/${id}`, { method: 'DELETE' }).then(() => loadRecurring())
  }

  const saveRecur = () => {
    const cat = categories.find(c => c.id === +recurForm.category_id)
    fetch('/api/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...recurForm, category_id: +recurForm.category_id || null, category_name: cat?.name || recurForm.category_name, amount: +recurForm.amount, day_of_month: +recurForm.day_of_month })
    }).then(() => { loadRecurring(); setRecurForm({ category_id: '', category_name: '', amount: '', flow: 'Dépense', day_of_month: 1, note: '' }) })
  }

  const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)

  return (
    <>
      <div className="topbar"><h1>⚙️ Réglages</h1></div>

      <div className="card">
        <div className="card-title">📥 Importer des données</div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
          Importez un fichier JSON (export One Money ou Crédit Agricole converti) pour synchroniser vos transactions.
        </p>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        <button className="btn btn-primary" onClick={() => fileRef.current.click()} disabled={importing}>
          {importing ? '⏳ Import en cours...' : '📁 Choisir un fichier JSON'}
        </button>
        {importResult && !importResult.error && (
          <div style={{ marginTop: 12, padding: 12, background: '#E8F8EE', borderRadius: 10, fontSize: 14 }}>
            ✅ {importResult.inserted} transactions importées · {importResult.skipped} doublons ignorés
          </div>
        )}
        {importResult?.error && (
          <div style={{ marginTop: 12, padding: 12, background: '#FEE2E2', borderRadius: 10, fontSize: 14, color: 'var(--danger)' }}>
            ❌ Erreur: {importResult.error}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">🔁 Transactions récurrentes</div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
          Les transactions récurrentes sont créées automatiquement chaque mois au jour défini.
        </p>
        <button className="btn btn-ghost" style={{ marginBottom: showRecurring ? 16 : 0 }} onClick={loadRecurring}>
          {showRecurring ? '🔄 Rafraîchir' : '👁️ Voir / Gérer'}
        </button>

        {showRecurring && (
          <>
            {recurring.length === 0 ? <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>Aucune règle configurée.</p> :
              recurring.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 20 }}>{r.icon || '🔄'}</span>
                  <div style={{ flex: 1, fontSize: 14 }}>
                    <div style={{ fontWeight: 600 }}>{r.category_name || r.note} — {fmt(r.amount)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chaque mois le {r.day_of_month} · {r.flow}</div>
                  </div>
                  <button onClick={() => toggleRecur(r.id, r.active)} style={{ background: r.active ? '#E8F8EE' : '#FEE2E2', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: r.active ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {r.active ? 'Actif' : 'Inactif'}
                  </button>
                  <button onClick={() => deleteRecur(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}>🗑️</button>
                </div>
              ))
            }

            <div style={{ marginTop: 16, borderTop: '2px dashed var(--border)', paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--primary)' }}>Ajouter une règle récurrente</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <select value={recurForm.category_id} onChange={e => setRecurForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Catégorie...</option>
                  {categories.filter(c => c.flow_type === recurForm.flow).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" placeholder="Montant €" value={recurForm.amount} onChange={e => setRecurForm(f => ({ ...f, amount: e.target.value }))} style={{ flex: 2 }} />
                  <select value={recurForm.flow} onChange={e => setRecurForm(f => ({ ...f, flow: e.target.value }))} style={{ flex: 1 }}>
                    <option>Dépense</option><option>Revenu</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginBottom: 0 }}>Le</label>
                  <input type="number" min="1" max="28" value={recurForm.day_of_month} onChange={e => setRecurForm(f => ({ ...f, day_of_month: +e.target.value }))} style={{ width: 64 }} />
                  <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 0 }}>de chaque mois</label>
                </div>
                <input placeholder="Note (facultatif)" value={recurForm.note} onChange={e => setRecurForm(f => ({ ...f, note: e.target.value }))} />
                <button className="btn btn-primary" onClick={saveRecur} disabled={!recurForm.amount}>Ajouter</button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">ℹ️ À propos</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          <p>MoneyTrack v1.0 — Suivi des dépenses Andy Donizetti</p>
          <p style={{ marginTop: 6 }}>Application web progressive (PWA) · Données hébergées sur Railway</p>
        </div>
      </div>
    </>
  )
}
