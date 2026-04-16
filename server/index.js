const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const cron = require('node-cron');
const { processRecurring } = require('./routes/recurring');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API routes
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/recurring', require('./routes/recurring'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Serve React build in production
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Cron: every day at 00:05, process recurring transactions
cron.schedule('5 0 * * *', () => {
  console.log('[CRON] Processing recurring transactions...');
  const n = processRecurring();
  if (n > 0) console.log(`[CRON] Created ${n} recurring transactions`);
});

app.listen(PORT, () => {
  console.log(`MoneyTrack server running on port ${PORT}`);
  // Process recurring on startup too
  processRecurring();
});
