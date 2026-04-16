const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT r.*, c.icon, c.color FROM recurring_rules r LEFT JOIN categories c ON r.category_id=c.id ORDER BY r.active DESC, r.id').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { category_id, category_name, amount, flow, day_of_month, source, note } = req.body;
  if (!amount || !flow) return res.status(400).json({ error: 'amount et flow requis' });
  const info = db.prepare(`INSERT INTO recurring_rules (category_id, category_name, amount, flow, day_of_month, source, note) VALUES (?,?,?,?,?,?,?)`).run(
    category_id || null, category_name || '', +amount, flow, day_of_month || 1, source || '', note || ''
  );
  res.status(201).json(db.prepare('SELECT * FROM recurring_rules WHERE id=?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { active, amount, day_of_month, category_id, category_name, note } = req.body;
  const ex = db.prepare('SELECT * FROM recurring_rules WHERE id=?').get(+req.params.id);
  if (!ex) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE recurring_rules SET active=?, amount=?, day_of_month=?, category_id=?, category_name=?, note=? WHERE id=?').run(
    active !== undefined ? +active : ex.active,
    amount !== undefined ? +amount : ex.amount,
    day_of_month || ex.day_of_month,
    category_id !== undefined ? category_id : ex.category_id,
    category_name || ex.category_name,
    note !== undefined ? note : ex.note,
    +req.params.id
  );
  res.json(db.prepare('SELECT * FROM recurring_rules WHERE id=?').get(+req.params.id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM recurring_rules WHERE id=?').run(+req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// POST /api/recurring/process — manually trigger recurring creation
router.post('/process', (req, res) => {
  const created = processRecurring();
  res.json({ created });
});

function processRecurring() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const rules = db.prepare('SELECT * FROM recurring_rules WHERE active=1').all();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO transactions (ext_id, date, year, month, amount, flow, category_id, category_name, source, note, origin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Récurrent')
  `);
  let created = 0;
  for (const rule of rules) {
    if (day >= rule.day_of_month) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(rule.day_of_month).padStart(2,'0')}`;
      const extId = `REC_${rule.id}_${year}_${month}`;
      const info = insert.run(extId, dateStr, year, month, rule.amount, rule.flow, rule.category_id, rule.category_name, rule.source || '', rule.note || '');
      if (info.changes > 0) {
        db.prepare('UPDATE recurring_rules SET last_created=? WHERE id=?').run(dateStr, rule.id);
        created++;
      }
    }
  }
  return created;
}

module.exports = router;
module.exports.processRecurring = processRecurring;
