/**
 * Script d'import initial des 3670 transactions existantes
 * Usage: node scripts/import_data.js [chemin_vers_merged_transactions.json]
 */
const path = require('path')
const fs = require('fs')

// Load database (will create tables if needed)
process.env.DB_PATH = path.join(__dirname, '../data')
const db = require('../server/db')

const dataFile = process.argv[2] || path.join(__dirname, '../../merged_transactions.json')

if (!fs.existsSync(dataFile)) {
  console.log(`Fichier introuvable: ${dataFile}`)
  console.log('Usage: node scripts/import_data.js [chemin_vers_merged_transactions.json]')
  console.log('')
  console.log('Pour générer ce fichier, déposez vos exports dans le dossier "suivi de depense"')
  console.log('et relancez le script update_suivi.py')
  process.exit(0)
}

const transactions = JSON.parse(fs.readFileSync(dataFile, 'utf-8'))
console.log(`\n📥 Import de ${transactions.length} transactions...\n`)

const getCatId = db.prepare('SELECT id FROM categories WHERE name=? AND flow_type=? LIMIT 1')
const getCatByName = db.prepare('SELECT id FROM categories WHERE name LIKE ? LIMIT 1')
const insert = db.prepare(`
  INSERT OR IGNORE INTO transactions (ext_id, date, year, month, amount, flow, category_id, category_name, source, note, origin)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

let inserted = 0, skipped = 0, errors = 0

const importAll = db.transaction((txns) => {
  for (const t of txns) {
    try {
      const dateStr = t.date
      const d = new Date(dateStr + 'T00:00:00')
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const flow = t.flow || 'Dépense'
      const catName = t.category || t.category_name || ''
      const flowType = flow === 'Revenu' ? 'Revenu' : flow === 'Virement' ? 'Virement' : 'Dépense'

      // Try to find category ID
      let catId = null
      if (catName) {
        const cat = getCatId.get(catName, flowType) || getCatByName.get(catName)
        catId = cat ? cat.id : null
      }

      const info = insert.run(
        t.id || `${t.date}_${t.amount}_${catName}`.replace(/\s/g,'_'),
        dateStr, year, month,
        Math.abs(parseFloat(t.amount) || 0),
        flow,
        catId,
        catName,
        t.source || '',
        (t.note || '').substring(0, 500),
        t.origin || 'Import'
      )
      if (info.changes > 0) inserted++; else skipped++
    } catch (err) {
      errors++
    }
  }
})

importAll(transactions)

const total = db.prepare('SELECT COUNT(*) as c FROM transactions').get()
console.log(`✅ Terminé !`)
console.log(`   Importées : ${inserted}`)
console.log(`   Doublons ignorés : ${skipped}`)
console.log(`   Erreurs : ${errors}`)
console.log(`   Total en base : ${total.c} transactions\n`)
