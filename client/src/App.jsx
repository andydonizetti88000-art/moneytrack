import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import Transactions from './pages/Transactions.jsx'
import Charts from './pages/Charts.jsx'
import Budgets from './pages/Budgets.jsx'
import Settings from './pages/Settings.jsx'
import AddTransactionModal from './components/AddTransactionModal.jsx'

export const AppContext = createContext(null)

const MONTH_FR = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

export function useApp() { return useContext(AppContext) }

export default function App() {
  const [tab, setTab] = useState('home')
  const [showAdd, setShowAdd] = useState(false)
  const [editTxn, setEditTxn] = useState(null)
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [stats, setStats] = useState(null)
  const now = new Date()
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {})
  }, [refreshKey])

  useEffect(() => {
    fetch(`/api/transactions/stats?year=${selYear}&month=${selMonth}`)
      .then(r => r.json()).then(setStats).catch(() => {})
    fetch(`/api/budgets?year=${selYear}&month=${selMonth}`)
      .then(r => r.json()).then(setBudgets).catch(() => {})
  }, [selYear, selMonth, refreshKey])

  const prevMonth = () => {
    if (selMonth === 1) { setSelYear(y => y - 1); setSelMonth(12) }
    else setSelMonth(m => m - 1)
  }
  const nextMonth = () => {
    const n = new Date()
    if (selYear === n.getFullYear() && selMonth >= n.getMonth() + 1) return
    if (selMonth === 12) { setSelYear(y => y + 1); setSelMonth(1) }
    else setSelMonth(m => m + 1)
  }

  const ctx = { tab, setTab, categories, budgets, stats, selYear, selMonth, prevMonth, nextMonth, refresh,
    openAdd: () => { setEditTxn(null); setShowAdd(true) },
    openEdit: (t) => { setEditTxn(t); setShowAdd(true) },
    MONTH_FR }

  const navItems = [
    { id: 'home', icon: '🏠', label: 'Accueil' },
    { id: 'transactions', icon: '📋', label: 'Comptes' },
    { id: 'charts', icon: '📊', label: 'Graphiques' },
    { id: 'budgets', icon: '🎯', label: 'Budgets' },
    { id: 'settings', icon: '⚙️', label: 'Réglages' },
  ]

  return (
    <AppContext.Provider value={ctx}>
      <div className="app">
        <div className="page-scroll">
          {tab === 'home' && <Dashboard />}
          {tab === 'transactions' && <Transactions />}
          {tab === 'charts' && <Charts />}
          {tab === 'budgets' && <Budgets />}
          {tab === 'settings' && <Settings />}
        </div>

        <nav className="bottom-nav">
          {navItems.map(n => (
            <button key={n.id} className={`nav-item ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </nav>

        <button className="fab" onClick={() => { setEditTxn(null); setShowAdd(true) }} title="Ajouter une transaction">+</button>

        {showAdd && (
          <AddTransactionModal
            transaction={editTxn}
            categories={categories}
            onClose={() => setShowAdd(false)}
            onSaved={() => { setShowAdd(false); refresh() }}
          />
        )}
      </div>
    </AppContext.Provider>
  )
}
