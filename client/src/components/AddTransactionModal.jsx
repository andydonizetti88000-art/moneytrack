import { useState, useEffect } from 'react'

const FLOWS = ['Dépense', 'Revenu', 'Virement']

export default function AddTransactionModal({ transaction, categories, onClose, onSaved }) {
  const isEdit = !!transaction
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    date: today, amount: '', flow: 'Dépense',
    category_id: '', category_name: '', source: '', note: ''
  })

  useEffect(() => {
    if (transaction) {
      setForm({
        date: transaction.date || today,
        amount: String(transaction.amount || ''),
        flow: transaction.flow || 'Dépense',
        category_id: transaction.category_id || '',
        category_name: transaction.category_name || '',
        source: transaction.source || '',
        note: transaction.note || ''
      })
    }
  }, [transaction])

  const filteredCats = categories.filter(c => {
    if (form.flow === 'Dépense') return c.flow_type === 'Dépense'
    if (form.flow === 'Revenu') return c.flow_type === 'Revenu'
    return c.flow_type === 'Virement' || c.flow_type === 'Tous'
  })

  const selectedCat = categories.find(c => c.id === +form.category_id)

  const handleSubmit = () => {
    if (!form.amount || +form.amount <= 0) return
    const payload = {
      ...form,
      amount: +form.amount,
      category_id: form.category_id ? +form.category_id : null,
      category_name: selectedCat?.name || form.category_name
    }
    const url = isEdit ? `/api/transactions/${transaction.id}` : '/api/transactions'
    const method = isEdit ? 'PUT' : 'POST'
    fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(r => r.json()).then(onSaved).catch(console.error)
  }

  const handleDelete = () => {
    if (!isEdit) return
    fetch(`/api/transactions/${transaction.id}`, { method: 'DELETE' }).then(onSaved)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          {isEdit ? '✏️ Modifier' : '➕ Nouvelle transaction'}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Amount */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>Montant</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-muted)' }}>€</span>
            <input
              className="input-amount"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              autoFocus
              style={{ width: '180px' }}
            />
          </div>
        </div>

        {/* Flow toggle */}
        <div className="flow-toggle">
          {FLOWS.map(fl => (
            <button
              key={fl}
              className={`flow-btn ${form.flow === fl ? `active-${fl === 'Dépense' ? 'expense' : fl === 'Revenu' ? 'income' : 'virement'}` : ''}`}
              onClick={() => setForm(f => ({ ...f, flow: fl, category_id: '', category_name: '' }))}
            >
              {fl === 'Dépense' ? '💸' : fl === 'Revenu' ? '💰' : '↔️'} {fl}
            </button>
          ))}
        </div>

        {/* Category picker */}
        <div className="form-group">
          <label>Catégorie</label>
          <div className="cat-picker">
            {filteredCats.map(c => (
              <div
                key={c.id}
                className={`cat-pick-item ${+form.category_id === c.id ? 'selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, category_id: c.id, category_name: c.name }))}
              >
                <div className="cat-pick-icon">{c.icon}</div>
                <div className="cat-pick-name">{c.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Date */}
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>

        {/* Note */}
        <div className="form-group">
          <label>Note (facultatif)</label>
          <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Description de la dépense..." />
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} style={{ marginBottom: isEdit ? 12 : 0 }}>
          {isEdit ? '💾 Enregistrer' : '✅ Ajouter'}
        </button>

        {isEdit && (
          <button className="btn btn-danger" onClick={handleDelete}>🗑️ Supprimer cette transaction</button>
        )}
      </div>
    </div>
  )
}
