const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = process.env.DB_PATH || path.join(__dirname, '../data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'moneytrack.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    flow_type TEXT NOT NULL CHECK(flow_type IN ('Dépense','Revenu','Virement','Tous')),
    icon TEXT DEFAULT '📋',
    color TEXT DEFAULT '#95A5A6',
    parent_id INTEGER REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ext_id TEXT UNIQUE,
    date TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    amount REAL NOT NULL,
    flow TEXT NOT NULL CHECK(flow IN ('Dépense','Revenu','Virement')),
    category_id INTEGER REFERENCES categories(id),
    category_name TEXT,
    source TEXT,
    note TEXT,
    origin TEXT DEFAULT 'Manuel',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    monthly_limit REAL NOT NULL,
    alert_percent INTEGER DEFAULT 80,
    UNIQUE(category_id)
  );

  CREATE TABLE IF NOT EXISTS recurring_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id),
    category_name TEXT,
    amount REAL NOT NULL,
    flow TEXT NOT NULL,
    day_of_month INTEGER DEFAULT 1,
    source TEXT,
    note TEXT,
    active INTEGER DEFAULT 1,
    last_created TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
  CREATE INDEX IF NOT EXISTS idx_transactions_year_month ON transactions(year, month);
  CREATE INDEX IF NOT EXISTS idx_transactions_flow ON transactions(flow);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
`);

// Seed default categories if empty
const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get();
if (catCount.c === 0) {
  const cats = [
    // Dépenses
    ['Alimentation','Dépense','🛒','#E74C3C'],
    ['Restaurant','Dépense','🍽️','#E67E22'],
    ['Mcdo','Dépense','🍔','#E67E22'],
    ['KFC','Dépense','🍗','#E67E22'],
    ['Bar','Dépense','🍺','#E67E22'],
    ['Boulangerie','Dépense','🥖','#E67E22'],
    ['Café','Dépense','☕','#A0522D'],
    ['Épicerie','Dépense','🛒','#E74C3C'],
    ['Casino','Dépense','🏪','#E74C3C'],
    ['Carrefour','Dépense','🛒','#E74C3C'],
    ['Leclerc','Dépense','🛒','#E74C3C'],
    ['Transport','Dépense','🚌','#3498DB'],
    ['Voiture','Dépense','🚗','#3498DB'],
    ['Essence','Dépense','⛽','#2980B9'],
    ['Frais réparation','Dépense','🔧','#7F8C8D'],
    ['EDF','Dépense','⚡','#F1C40F'],
    ['Box internet + téléphone','Dépense','📡','#1ABC9C'],
    ['Abonnements','Dépense','📱','#1ABC9C'],
    ['Netflix','Dépense','🎬','#E50914'],
    ['Playstation','Dépense','🎮','#003087'],
    ['Microsoft','Dépense','💻','#0078D4'],
    ['Amazon','Dépense','📦','#FF9900'],
    ['Fnac','Dépense','📚','#E4A000'],
    ['Action','Dépense','🛍️','#E74C3C'],
    ['Credit immobilier','Dépense','🏠','#2ECC71'],
    ['Charges logement','Dépense','🏠','#27AE60'],
    ['Copropriété','Dépense','🏢','#27AE60'],
    ['Eau','Dépense','💧','#3498DB'],
    ['Santé','Dépense','💊','#9B59B6'],
    ['Assurance','Dépense','🛡️','#8E44AD'],
    ['Assurance habitation','Dépense','🏠','#8E44AD'],
    ['Assurance prêt immo','Dépense','🏦','#8E44AD'],
    ['Assurance décès','Dépense','🛡️','#8E44AD'],
    ['Assurance juridique','Dépense','⚖️','#8E44AD'],
    ['Assurance accident de la vie','Dépense','🛡️','#8E44AD'],
    ['Loisirs','Dépense','🎭','#E91E63'],
    ['Sorties','Dépense','🎉','#E91E63'],
    ['Tabac','Dépense','🚬','#7F8C8D'],
    ['Retrait','Dépense','💶','#95A5A6'],
    ['Banque','Dépense','🏦','#7F8C8D'],
    ['Frais','Dépense','💸','#95A5A6'],
    ['Divers','Dépense','📌','#BDC3C7'],
    ['Achats','Dépense','🛍️','#E67E22'],
    ['Autre','Dépense','📋','#BDC3C7'],
    ['Unibet','Dépense','🎲','#00875A'],
    ['King jouet','Dépense','🧸','#FF6B6B'],
    ['Cultura','Dépense','📖','#6C5CE7'],
    ['MZ','Dépense','📋','#BDC3C7'],
    // Revenus
    ['Salaire','Revenu','💰','#27AE60'],
    ["Prime d'activité",'Revenu','💵','#2ECC71'],
    ['Prime Travail','Revenu','💵','#2ECC71'],
    ['Sécurité sociale','Revenu','🏥','#3498DB'],
    ['Divers','Revenu','📥','#27AE60'],
    ['Autre','Revenu','📥','#BDC3C7'],
    // Comptes / épargne
    ['Épargne bitstack','Virement','₿','#F7931A'],
    ['LEP','Virement','🏦','#1F4E79'],
    ['PEA','Virement','📈','#2E75B6'],
    ['Investissement cryptomonnaies','Virement','💎','#F7931A'],
    ['Compte titre TradeRepublic','Virement','📊','#0F9960'],
    ['Virement','Virement','↔️','#95A5A6'],
  ];
  const insert = db.prepare('INSERT INTO categories (name, flow_type, icon, color) VALUES (?,?,?,?)');
  cats.forEach(c => insert.run(...c));
}

module.exports = db;
