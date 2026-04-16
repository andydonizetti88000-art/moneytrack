const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { year, month } = req.query;
  const now = new Date();
  const y = year ? +year : now.getFullYear();
  const m = month ? +month : now.getMonth() + 1;
  const rows = db.prepare(`
    SELECT b.*, c.name as cat_name, c.icon, c.color,
      COALESCE((SELECT SUM(amount) FROM transactions
        WHERE year=? AND month=? AND category_id=b.category_id AND flow='Dépense'), 0) as spent
    FROM budgets b JOIN categories c ON b.category_id = c.id
  `).all(y, m);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { category_id, monthly_limit, alert_percent } = req.body;
  if (!category_id || !monthly_limit) return res.status(400).json({ error: 'category_id et monthly_limit requis' });
  db.prepare(`
    INSERT INTO budgets (category_id, monthly_limit, alert_percent) VALUES (?,?,?)
    ON CONFLICT(category_id) DO UPDATE SET monthly_limit=excluded.monthly_limit, alert_percent=excluded.alert_percent
  `).run(+category_id, +monthly_limit, alert_percent || 80);
  const row = db.prepare('SELECT b.*, c.name as cat_name, c.icon, c.color FROM budgets b JOIN categories c ON b.category_id=c.id WHERE b.category_id=?').get(+category_id);
  res.status(201).json(row);
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM budgets WHERE id=?').run(+req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
