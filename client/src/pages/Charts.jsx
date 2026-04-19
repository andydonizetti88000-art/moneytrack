import { useApp } from '../App.jsx'
import { useState, useEffect, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'

const MONTH_SHORT = ['','Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)
const fmtDec = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)

// ── 10 Macro-catégories (métadonnées) ────────────────────────────────────────
const MACRO_CATS = [
  { id: 'alimentation',  label: 'Alimentation',      icon: '🍽️', color: '#27AE60' },
  { id: 'achats',        label: 'Achats & Retrait',   icon: '🛍️', color: '#E91E63' },
  { id: 'assurances',    label: 'Assurances',         icon: '🛡️', color: '#9B59B6' },
  { id: 'abonnements',   label: 'Abonnements',        icon: '📱', color: '#1ABC9C' },
  { id: 'banque',        label: 'Banque & Crédit',    icon: '🏦', color: '#E74C3C' },
  { id: 'logement',      label: 'Logement',           icon: '🏠', color: '#3498DB' },
  { id: 'transport',     label: 'Transport',          icon: '🚗', color: '#E67E22' },
  { id: 'epargne',       label: 'Épargne & Invest.',  icon: '💰', color: '#F1C40F' },
  { id: 'loisirs',       label: 'Loisirs',            icon: '🎉', color: '#00BCD4' },
  { id: 'sante',         label: 'Santé',              icon: '💊', color: '#795548' },
]

// ── Table exacte : nom One Money → macro ID ──────────────────────────────────
// Couvre les 52 catégories de dépense réelles extraites du backup One Money
const ONE_MONEY_MAP = {
  // 🏠 Logement
  'credit immobilier':         'logement',
  'edf':                       'logement',
  'copropriété':               'logement',
  'charges logement':          'logement',
  'mz':                        'logement',

  // 🍽️ Alimentation
  'alimentation':              'alimentation',
  'restaurant':                'alimentation',
  'mcdo':                      'alimentation',
  'leclerc':                   'alimentation',
  'boulangerie':               'alimentation',
  'café':                      'alimentation',
  'épicerie':                  'alimentation',
  'virement pour courses':     'alimentation',
  'carrefour':                 'alimentation',
  'casino':                    'alimentation',

  // 🚗 Transport
  'voiture':                   'transport',
  'essence':                   'transport',
  'frais réparation':          'transport',
  'transport':                 'transport',

  // 🛡️ Assurances
  'assurance':                 'assurances',
  'assurance décès':           'assurances',
  'assurance accident de la vie': 'assurances',
  'assurance juridique':       'assurances',
  'assurance prêt immo':       'assurances',
  'assurance habitation':      'assurances',
  'assurances':                'assurances',

  // 📱 Abonnements
  'abonnements':               'abonnements',
  'box internet + téléphone':  'abonnements',
  'microsoft':                 'abonnements',
  'amazon':                    'abonnements',
  'netflix':                   'abonnements',
  'playstation':               'abonnements',

  // 🛍️ Achats & Retrait
  'achats':                    'achats',
  'retrait':                   'achats',
  'autre':                     'achats',
  'divers':                    'achats',
  'tabac':                     'achats',
  'action':                    'achats',
  "prime d'activité":          'achats',

  // 🏦 Banque & Crédit
  'banque':                    'banque',
  'carte de crédit':           'banque',
  'frais':                     'banque',
  'crédit':                    'banque',

  // 💰 Épargne & Invest.
  'lep':                       'epargne',
  'épargne bitstack':          'epargne',
  'investissement cryptomonnaies': 'epargne',
  'virement':                  'epargne',
  'pea':                       'epargne',

  // 🎉 Loisirs
  'loisirs':                   'loisirs',
  'sorties':                   'loisirs',
  'bar':                       'loisirs',

  // 💊 Santé
  'santé':                     'sante',
}

function getMacroId(catName) {
  if (!catName) return 'achats'
  const key = catName.toLowerCase().trim()
  return ONE_MONEY_MAP[key] || 'achats'  // inconnu → Achats & Retrait
}

// ── Custom label emoji centré sur chaque part ────────────────────────────────
const RADIAN = Math.PI / 180
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, icon, pct }) => {
  if (pct < 4) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={pct < 7 ? 10 : 14} fontWeight={700}>
      {icon}
    </text>
  )
}

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: 10, padding: '8px 14px', fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,.12)' }}>
      <div style={{ fontWeight: 700, marginBottom: 3 }}>{d.icon} {d.label}</div>
      <div style={{ color: d.color, fontWeight: 600 }}>{fmt(d.value)}</div>
      <div style={{ color: '#888', fontSize: 11 }}>{d.pct}% des dépenses</div>
    </div>
  )
}

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: 10, padding: '8px 12px', fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  )
}

export default function Charts() {
  const { stats, selYear, selMonth, prevMonth, nextMonth, MONTH_FR } = useApp()
  const last12Raw = stats?.last12 || []

  const [allCats, setAllCats] = useState([])
  const [selectedMacro, setSelectedMacro] = useState(null)
  const [drillTxns, setDrillTxns] = useState([])
  const [drillLoading, setDrillLoading] = useState(false)

  useEffect(() => {
    setSelectedMacro(null)
    setDrillTxns([])
    fetch(`/api/transactions/allcategories?year=${selYear}&month=${selMonth}`)
      .then(r => r.json())
      .then(data => setAllCats(Array.isArray(data) ? data : []))
      .catch(() => setAllCats([]))
  }, [selYear, selMonth])

  // Agréger par macro
  const macroMap = {}
  for (const row of allCats) {
    const macroId = getMacroId(row.category_name)
    if (!macroMap[macroId]) {
      const meta = MACRO_CATS.find(m => m.id === macroId)
      macroMap[macroId] = { ...meta, value: 0, cats: [] }
    }
    macroMap[macroId].value += row.total
    macroMap[macroId].cats.push({ name: row.category_name, total: row.total, count: row.count })
  }

  // Trier les sous-catégories par montant
  Object.values(macroMap).forEach(m => m.cats.sort((a, b) => b.total - a.total))

  const totalDep = Object.values(macroMap).reduce((s, m) => s + m.value, 0)
  const pieData = Object.values(macroMap)
    .filter(m => m.value > 0)
    .map(m => ({ ...m, pct: totalDep > 0 ? Math.round((m.value / totalDep) * 100) : 0 }))
    .sort((a, b) => b.value - a.value)

  // Drill-down : récupérer les transactions de chaque sous-catégorie
  const openDrill = useCallback((macroEntry) => {
    if (!macroEntry?.id) return
    const macro = MACRO_CATS.find(m => m.id === macroEntry.id) || macroEntry
    setSelectedMacro(macro)
    setDrillLoading(true)
    setDrillTxns([])

    const catNames = (macroMap[macro.id]?.cats || []).map(c => c.name)
    if (catNames.length === 0) { setDrillLoading(false); return }

    Promise.all(
      catNames.map(name =>
        fetch(`/api/transactions?year=${selYear}&month=${selMonth}&flow=D%C3%A9pense&category=${encodeURIComponent(name)}&limit=200`)
          .then(r => r.json()).then(j => j.data || []).catch(() => [])
      )
    ).then(results => {
      const merged = results.flat().sort((a, b) => new Date(b.date) - new Date(a.date))
      const seen = new Set()
      setDrillTxns(merged.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true }))
      setDrillLoading(false)
    })
  }, [selYear, selMonth, macroMap])

  // Bar chart 12 mois
  const monthMap = {}
  last12Raw.forEach(r => {
    const key = `${r.year}-${String(r.month).padStart(2,'0')}`
    if (!monthMap[key]) monthMap[key] = { month: `${MONTH_SHORT[r.month]} ${r.year}`, dépenses: 0, revenus: 0 }
    if (r.flow === 'Dépense') monthMap[key].dépenses = r.total
    if (r.flow === 'Revenu') monthMap[key].revenus = r.total
  })
  const barData = Object.values(monthMap).slice(-12)

  const dep = stats?.monthly?.find(m => m.flow === 'Dépense')?.total || 0
  const rev = stats?.monthly?.find(m => m.flow === 'Revenu')?.total || 0

  return (
    <>
      <div className="topbar"><h1>📊 Graphiques</h1></div>

      <div className="month-selector">
        <button onClick={prevMonth}>‹</button>
        <span>{MONTH_FR[selMonth]} {selYear}</span>
        <button onClick={nextMonth}>›</button>
      </div>

      {/* Résumé */}
      <div style={{ display: 'flex', gap: 10, margin: '0 16px 16px' }}>
        <div className="card card-sm" style={{ flex: 1, margin: 0 }}>
          <div className="card-title">Dépenses</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#E74C3C' }}>{fmt(dep)}</div>
        </div>
        <div className="card card-sm" style={{ flex: 1, margin: 0 }}>
          <div className="card-title">Revenus</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#27AE60' }}>{fmt(rev)}</div>
        </div>
      </div>

      {/* ── Fromage ── */}
      {pieData.length > 0 && (
        <div className="card">
          <div className="card-title">Répartition — {MONTH_FR[selMonth]} {selYear}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            Appuyez sur une part pour voir le détail
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={renderPieLabel}
                onClick={openDrill}
                style={{ cursor: 'pointer' }}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color}
                    stroke={selectedMacro?.id === entry.id ? '#fff' : 'none'}
                    strokeWidth={selectedMacro?.id === entry.id ? 3 : 0}
                    opacity={selectedMacro && selectedMacro.id !== entry.id ? 0.4 : 1}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Légende 2 colonnes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 8px', marginTop: 10 }}>
            {pieData.map(d => (
              <div key={d.id} onClick={() => openDrill(d)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  cursor: 'pointer', padding: '5px 8px', borderRadius: 8,
                  background: selectedMacro?.id === d.id ? d.color + '18' : 'transparent',
                  border: `1.5px solid ${selectedMacro?.id === d.id ? d.color : 'transparent'}`,
                  opacity: selectedMacro && selectedMacro.id !== d.id ? 0.45 : 1,
                  transition: 'all .15s'
                }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.icon} {d.label}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: d.color, flexShrink: 0 }}>{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Panel drill-down ── */}
      {selectedMacro && (
        <div className="card" style={{ borderTop: `4px solid ${selectedMacro.color}` }}>
          {/* En-tête */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div className="card-title" style={{ margin: 0, fontSize: 15 }}>
                {selectedMacro.icon} {selectedMacro.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {MONTH_FR[selMonth]} {selYear} · <strong style={{ color: selectedMacro.color }}>{fmt(macroMap[selectedMacro.id]?.value)}</strong>
              </div>
            </div>
            <button onClick={() => { setSelectedMacro(null); setDrillTxns([]) }}
              style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 8px' }}>✕</button>
          </div>

          {/* Sous-catégories One Money */}
          {macroMap[selectedMacro.id]?.cats?.length > 0 && (
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                Catégories One Money
              </div>
              {macroMap[selectedMacro.id].cats.map((c, i) => {
                const maxTotal = macroMap[selectedMacro.id].cats[0]?.total || 1
                const pct = Math.min(100, (c.total / maxTotal) * 100)
                return (
                  <div key={i} style={{ marginBottom: i < macroMap[selectedMacro.id].cats.length - 1 ? 10 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ color: selectedMacro.color, fontWeight: 700 }}>{fmt(c.total)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, background: 'var(--border)', borderRadius: 3, height: 4 }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: selectedMacro.color }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>
                        {c.count} op.
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Liste des transactions */}
          {drillLoading ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>⏳ Chargement…</div>
          ) : drillTxns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 14 }}>Aucune transaction</div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                {drillTxns.length} opération{drillTxns.length > 1 ? 's' : ''}
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {drillTxns.map((t, i) => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 0',
                    borderBottom: i < drillTxns.length - 1 ? '1px solid var(--border)' : 'none'
                  }}>
                    {/* Icône catégorie */}
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: selectedMacro.color + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, flexShrink: 0
                    }}>
                      {t.icon || selectedMacro.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Libellé One Money */}
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.note && t.note !== t.category_name ? t.note : t.category_name}
                      </div>
                      {/* Catégorie One Money + date */}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {t.category_name} · {t.date}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#E74C3C', flexShrink: 0 }}>
                      -{fmtDec(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Bar chart 12 mois ── */}
      {barData.length > 1 && (
        <div className="card">
          <div className="card-title">Évolution sur 12 mois</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k` : v} />
              <Tooltip content={<BarTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="dépenses" name="Dépenses" fill="#E74C3C" radius={[4,4,0,0]} />
              <Bar dataKey="revenus" name="Revenus" fill="#27AE60" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  )
}
