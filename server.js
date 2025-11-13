/**
 * Home-Lab Dashboard Server
 *
 * SECURITY WARNING:
 * This application has NO AUTHENTICATION and is designed for private networks only.
 * Do NOT expose this to the public internet without adding proper security measures.
 * Run only on a private network or behind a firewall.
 */

const express = require('express');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const Database = require('better-sqlite3');

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'production';

// Initialize Express app
const app = express();

// Security headers (relaxed for local network use)
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for simplicity
  crossOriginEmbedderPolicy: false
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Ensure required directories exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
const dbDir = path.join(__dirname, 'db');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('Created database directory:', dbDir);
}

// Initialize SQLite database
const dbPath = path.join(__dirname, 'db', 'app.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
function initializeDatabase() {
  console.log('Initializing database...');

  // Apps table
  db.exec(`
    CREATE TABLE IF NOT EXISTS apps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      ip TEXT,
      description TEXT,
      tag TEXT,
      icon TEXT,
      section TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      is_pinned INTEGER DEFAULT 0
    )
  `);

  // Migration: Add section column if it doesn't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(apps)").all();
    const hasSectionColumn = tableInfo.some(col => col.name === 'section');

    if (!hasSectionColumn) {
      console.log('Adding section column to apps table...');
      db.exec('ALTER TABLE apps ADD COLUMN section TEXT');
      console.log('Section column added successfully');
    }
  } catch (error) {
    console.error('Error checking/adding section column:', error);
  }

  // Uploads table
  db.exec(`
    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT,
      size INTEGER,
      mime TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Initialize default settings if not exists
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (settingsCount.count === 0) {
    console.log('Initializing default settings...');
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insertSetting.run('timeWidgetEnabled', 'false');
    insertSetting.run('weatherWidgetEnabled', 'false');
    insertSetting.run('weatherLocation', '');
    insertSetting.run('weatherLat', '');
    insertSetting.run('weatherLon', '');
    console.log('Default settings initialized');
  }

  // Ensure newer settings exist for upgrades
  const ensureSetting = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO NOTHING
  `);

  const defaultSettings = [
    ['timeWidgetEnabled', 'false'],
    ['weatherWidgetEnabled', 'false'],
    ['weatherLocation', ''],
    ['weatherLat', ''],
    ['weatherLon', ''],
    ['weatherTempUnit', 'fahrenheit'],
    ['appHealthWidgetEnabled', 'false'],
    ['appHealthCheckInterval', '60000']
  ];

  defaultSettings.forEach(([key, value]) => {
    ensureSetting.run(key, value);
  });

  console.log('Database tables created/verified');

  // Check if we need to add example apps
  const count = db.prepare('SELECT COUNT(*) as count FROM apps').get();

  if (count.count === 0) {
    console.log('Adding example apps...');

    const insert = db.prepare(`
      INSERT INTO apps (name, url, ip, description, tag, icon, section, is_pinned)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const examples = [
      {
        name: 'AdGuard Home',
        url: 'http://192.168.1.2:3000',
        ip: '192.168.1.2',
        description: 'Network-wide ad and tracker blocking',
        tag: 'DNS',
        icon: '/uploads/adguard.svg',
        section: 'Network',
        is_pinned: 1
      },
      {
        name: 'Pi-hole',
        url: 'http://192.168.1.3/admin',
        ip: '192.168.1.3',
        description: 'DNS sinkhole for blocking ads',
        tag: 'DNS',
        icon: '/uploads/pihole.svg',
        section: 'Network',
        is_pinned: 0
      },
      {
        name: 'Immich',
        url: 'http://192.168.1.4:2283',
        ip: '192.168.1.4',
        description: 'Self-hosted photo and video backup',
        tag: 'Media',
        icon: '/uploads/immich.svg',
        section: 'Media',
        is_pinned: 1
      }
    ];

    examples.forEach(app => {
      insert.run(app.name, app.url, app.ip, app.description, app.tag, app.icon, app.section, app.is_pinned);
    });

    console.log('Example apps added');
  }
}

initializeDatabase();

// Make database available to routes
app.locals.db = db;

// API Routes
const appsRouter = require('./routes/apps');
const appHealthRouter = require('./routes/appHealth');
const uploadsRouter = require('./routes/uploads');
const settingsRouter = require('./routes/settings');

app.use('/api/apps/health', appHealthRouter);
app.use('/api/apps', appsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/settings', settingsRouter);

// Serve main dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve admin interface
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Check if running in init-only mode
if (process.argv.includes('--init-only')) {
  console.log('Database initialized successfully');
  process.exit(0);
}

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log('');
  console.log('========================================');
  console.log('  Home-Lab Dashboard');
  console.log('========================================');
  console.log('');
  console.log(`  Server running at: http://${HOST}:${PORT}`);
  console.log(`  Dashboard: http://${HOST}:${PORT}/`);
  console.log(`  Admin UI: http://${HOST}:${PORT}/admin`);
  console.log(`  Environment: ${NODE_ENV}`);
  console.log('');
  console.log('  WARNING: No authentication enabled!');
  console.log('  Run only on a private network.');
  console.log('');
  console.log('========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    db.close();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  server.close(() => {
    db.close();
    console.log('Server closed');
    process.exit(0);
  });
});
