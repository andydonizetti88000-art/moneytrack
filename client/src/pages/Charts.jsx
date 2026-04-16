import { useApp } from '../App.jsx'
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'

const MONTH_SHORT = ['','Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

const COLORS = ['#E74C3C','#E67E22','#F1C40F','#27AE60','#1ABC9C','#3498DB','#9B59B6','#E91E63','#00BCD4','#795548']

const CustomTooltip = ({ active, payload, label }) => {
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
  const byCategory = stats?.byCategory || []
  const last12Raw = stats?.last12 || []

  // Build last 12 months bar data
  const monthMap = {}
  last12Raw.forEach(r => {
    const key = `${r.year}-${String(r.month).padStart(2,'0')}`
    if (!monthMap[key]) monthMap[key] = { month: `${MONTH_SHORT[r.month]} ${r.year}`, dépenses: 0, revenus: 0 }
    if (r.flow === 'Dépense') monthMap[key].dépenses = r.total
    if (r.flow === 'Revenu') monthMap[key].revenus = r.total
  })
  const barData = Object.values(monthMap).slice(-12)

  const pieData = byCategory.slice(0, 8).map((c, i) => ({
    name: c.category_name,
    value: Math.round(c.total),
    icon: c.icon || '📋',
    color: c.color || COLORS[i % COLORS.length]
  }))

  const dep = stats?.monthly?.find(m => m.flow === 'Dépense')?.total || 0
  const rev = stats?.monthly?.find(m => m.flow === 'Revenu')?.total || 0

  return (
    <>
      <div className="topbar">
        <h1>📊 Graphiques</h1>
      </div>

      <div className="month-selector">
        <button onClick={prevMonth}>‹</button>
        <span>{MONTH_FR[selMonth]} {selYear}</span>
        <button onClick={nextMonth}>›</button>
      </div>

      {/* Summary row */}
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

      {/* Pie chart */}
      {pieData.length > 0 && (
        <div className="card">
          <div className="card-title">Répartition des dépenses</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {pieData.map((d, i) => (
              <div key={i} className="legend-item">
                <div className="legend-dot" style={{ background: d.color }} />
                <span>{d.icon} {d.name} ({fmt(d.value)})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bar chart last 12 months */}
      {barData.length > 1 && (
        <div className="card">
          <div className="card-title">Évolution sur 12 mois</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="dépenses" name="Dépenses" fill="#E74C3C" radius={[4,4,0,0]} />
              <Bar dataKey="revenus" name="Revenus" fill="#27AE60" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top categories list */}
      <div className="card">
        <div className="card-title">Top dépenses — {MONTH_FR[selMonth]}</div>
        {byCategory.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '8px 0' }}>Aucune donnée</div>
        ) : byCategory.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>{c.icon || '📋'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{c.category_name}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#E74C3C' }}>{fmt(c.total)}</span>
              </div>
              <div style={{ background: 'var(--border)', borderRadius: 4, height: 6 }}>
                <div style={{ width: `${Math.min(100, (c.total / (byCategory[0]?.total || 1)) * 100)}%`, height: '100%', borderRadius: 4, background: c.color || COLORS[i % COLORS.length] }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
