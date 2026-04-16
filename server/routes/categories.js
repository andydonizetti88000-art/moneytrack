const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY flow_type, name').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, flow_type, icon, color } = req.body;
  if (!name || !flow_type) return res.status(400).json({ error: 'name et flow_type requis' });
  const info = db.prepare('INSERT INTO categories (name, flow_type, icon, color) VALUES (?,?,?,?)').run(name, flow_type, icon || '📋', color || '#95A5A6');
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id=?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, flow_type, icon, color } = req.body;
  const existing = db.prepare('SELECT * FROM categories WHERE id=?').get(+req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE categories SET name=?, flow_type=?, icon=?, color=? WHERE id=?')
    .run(name || existing.name, flow_type || existing.flow_type, icon || existing.icon, color || existing.color, +req.params.id);
  res.json(db.prepare('SELECT * FROM categories WHERE id=?').get(+req.params.id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM categories WHERE id=?').run(+req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
