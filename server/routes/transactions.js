const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/transactions
router.get('/', (req, res) => {
  const { year, month, flow, category, search, limit = 100, offset = 0 } = req.query;
  let sql = 'SELECT t.*, c.icon, c.color FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE 1=1';
  const params = [];
  if (year) { sql += ' AND t.year = ?'; params.push(+year); }
  if (month) { sql += ' AND t.month = ?'; params.push(+month); }
  if (flow) { sql += ' AND t.flow = ?'; params.push(flow); }
  if (category) { sql += ' AND (t.category_name = ? OR t.category_id = ?)'; params.push(category, +category); }
  if (search) { sql += ' AND (t.note LIKE ? OR t.category_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?';
  params.push(+limit, +offset);
  const rows = db.prepare(sql).all(...params);
  const countSql = sql.replace('SELECT t.*, c.icon, c.color', 'SELECT COUNT(*) as total').replace(/ ORDER BY.*$/, '');
  const total = db.prepare(countSql).get(...params.slice(0, -2));
  res.json({ data: rows, total: total.total });
});

// GET /api/transactions/stats
router.get('/stats', (req, res) => {
  const { year, month } = req.query;
  const now = new Date();
  const y = year ? +year : now.getFullYear();
  const m = month ? +month : now.getMonth() + 1;

  const monthly = db.prepare(`
    SELECT flow, SUM(amount) as total, COUNT(*) as count
    FROM transactions WHERE year=? AND month=? GROUP BY flow
  `).all(y, m);

  const byCategory = db.prepare(`
    SELECT t.category_name, c.icon, c.color, t.flow, SUM(t.amount) as total, COUNT(*) as count
    FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.year=? AND t.month=? AND t.flow='DÃ©pense'
    GROUP BY t.category_name ORDER BY total DESC LIMIT 10
  `).all(y, m);

  const last12 = db.prepare(`
    SELECT year, month, flow, SUM(amount) as total
    FROM transactions
    WHERE (year = ? AND month <= ?) OR (year = ? AND month > ?)
    OR (year > ? AND year < ?) OR year = ?
    GROUP BY year, month, flow
    ORDER BY year, month
  `).all(y - 1, m, y - 1, m, y - 1, y, y);

  const budgetAlerts = db.prepare(`
    SELECT b.*, c.name as cat_name, c.icon, c.color,
      COALESCE((SELECT SUM(amount) FROM transactions WHERE year=? AND month=? AND category_id=b.category_id AND flow='DÃ©pense'), 0) as spent
    FROM budgets b JOIN categories c ON b.category_id = c.id
  `).all(y, m);

  res.json({ monthly, byCategory, last12, budgetAlerts, year: y, month: m });
});

// GET /api/transactions/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT t.*, c.icon, c.color FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = ?').get(+req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// POST /api/transactions
router.post('/', (req, res) => {
  const { date, amount, flow, category_id, category_name, source, note, origin } = req.body;
  if (!date || !amount || !flow) return res.status(400).json({ error: 'date, amount, flow requis' });
  const d = new Date(date);
  const stmt = db.prepare(`
    INSERT INTO transactions (date, year, month, amount, flow, category_id, category_name, source, note, origin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(date, d.getFullYear(), d.getMonth() + 1, +amount, flow,
    category_id || null, category_name || '', source || '', note || '', origin || 'Manuel');
  const row = db.prepare('SELECT t.*, c.icon, c.color FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

// PUT /api/transactions/:id
router.put('/:id', (req, res) => {
  const { date, amount, flow, category_id, category_name, source, note } = req.body;
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(+req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const d = new Date(date || existing.date);
  db.prepare(`
    UPDATE transactions SET date=?, year=?, month=?, amount=?, flow=?, category_id=?, category_name=?, source=?, note=?
    WHERE id=?
  `).run(date || existing.date, d.getFullYear(), d.getMonth() + 1,
    amount !== undefined ? +amount : existing.amount,
    flow || existing.flow,
    category_id !== undefined ? category_id : existing.category_id,
    category_name || existing.category_name,
    source || existing.source,
    note !== undefined ? note : existing.note,
    +req.params.id);
  const row = db.prepare('SELECT t.*, c.icon, c.color FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = ?').get(+req.params.id);
  res.json(row);
});


// POST /api/transactions/import — bulk import (skips duplicates by date+amount+note)
router.post('/import', (req, res) => {
  const { transactions, clear } = req.body;
  if (!Array.isArray(transactions)) return res.status(400).json({ error: 'transactions array requis' });

  if (clear) {
    db.prepare('DELETE FROM transactions').run();
  }

  const check = db.prepare('SELECT id FROM transactions WHERE date=? AND amount=? AND note=? AND flow=? LIMIT 1');
  const insert = db.prepare(`
    INSERT INTO transactions (date, year, month, amount, flow, category_id, category_name, source, note, origin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  let skipped = 0;

  const runAll = db.transaction(() => {
    for (const t of transactions) {
      const d = new Date(t.date);
      const year = t.year || d.getFullYear();
      const month = t.month || (d.getMonth() + 1);
      const note = t.note || '';
      const flow = t.flow || 'Dépense';
      const amount = Math.abs(+t.amount);
      const catName = t.category_name || t.category || '';

      if (!clear) {
        const exists = check.get(t.date, amount, note, flow);
        if (exists) { skipped++; continue; }
      }

      insert.run(t.date, year, month, amount, flow, t.category_id || null, catName, t.source || '', note, t.origin || 'Import');
      inserted++;
    }
  });

  runAll();
  res.json({ inserted, skipped, total: transactions.length });
});

// DELETE /api/transactions/:id
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM transactions WHERE id = ?').run(+req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// POST /api/transactions/import â bulk import
router.post('/import', (req, res) => {
  const { transactions } = req.body;
  if (!Array.isArray(transactions)) return res.status(400).json({ error: 'Array expected' });

  const getCatId = db.prepare('SELECT id FROM categories WHERE name=? AND flow_type=? LIMIT 1');
  const insert = db.prepare(`
    INSERT OR IGNORE INTO transactions (ext_id, date, year, month, amount, flow, category_id, category_name, source, note, origin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0, skipped = 0;
  const insertMany = db.transaction((txns) => {
    for (const t of txns) {
      const d = new Date(t.date);
      const cat = getCatId.get(t.category || t.category_name || '', t.flow === 'Revenu' ? 'Revenu' : t.flow === 'Virement' ? 'Virement' : 'DÃ©pense');
      const info = insert.run(
        t.id || null, t.date,
        d.getFullYear(), d.getMonth() + 1,
        Math.abs(+t.amount), t.flow,
        cat ? cat.id : null,
        t.category || t.category_name || '',
        t.source || '', t.note || '',
        t.origin || 'Import'
      );
      if (info.changes > 0) inserted++; else skipped++;
    }
  });
  insertMany(transactions);
  res.json({ inserted, skipped, total: transactions.length });
});

module.exports = router;
