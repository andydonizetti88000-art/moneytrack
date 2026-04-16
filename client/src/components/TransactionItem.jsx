import { useState } from 'react'

const MONTH_SHORT = ['','Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)

export default function TransactionItem({ txn, onEdit, onDelete }) {
  const [showActions, setShowActions] = useState(false)
  const d = new Date(txn.date + 'T00:00:00')
  const dateStr = `${d.getDate()} ${MONTH_SHORT[d.getMonth() + 1]}`
  const isExpense = txn.flow === 'Dépense'
  const isIncome = txn.flow === 'Revenu'

  const iconBg = txn.color ? `${txn.color}22` : isExpense ? '#FCE4D622' : isIncome ? '#E2EFDA22' : '#E2E2E222'

  return (
    <>
      <li
        className="txn-item"
        onClick={() => setShowActions(!showActions)}
        style={{ userSelect: 'none' }}
      >
        <div className="txn-icon" style={{ background: iconBg }}>
          {txn.icon || (isExpense ? '💸' : isIncome ? '💰' : '↔️')}
        </div>
        <div className="txn-info">
          <div className="txn-cat">{txn.category_name || 'Autre'}</div>
          {txn.note && <div className="txn-note">{txn.note.substring(0, 60)}</div>}
        </div>
        <div className="txn-right">
          <div className={`txn-amount ${isExpense ? 'expense' : isIncome ? 'income' : 'virement'}`}>
            {isExpense ? '-' : isIncome ? '+' : ''}{fmt(txn.amount)}
          </div>
          <div className="txn-date">{dateStr}</div>
        </div>
      </li>
      {showActions && (
        <li style={{ listStyle: 'none', display: 'flex', background: '#F8F9FA', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowActions(false); onEdit() }}
            style={{ flex: 1, padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--primary)', fontWeight: 600, borderRight: '1px solid var(--border)' }}
          >✏️ Modifier</button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowActions(false); if (window.confirm('Supprimer cette transaction ?')) onDelete() }}
            style={{ flex: 1, padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--danger)', fontWeight: 600 }}
          >🗑️ Supprimer</button>
        </li>
      )}
    </>
  )
}
