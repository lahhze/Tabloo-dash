/**
 * Settings API Routes
 * Manages dashboard settings and preferences
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/settings
 * Get all dashboard settings
 */
router.get('/', (req, res) => {
  try {
    const db = req.app.locals.db;

    // Get all settings as key-value pairs
    const settings = db.prepare('SELECT key, value FROM settings').all();

    // Convert to object
    const settingsObj = {};
    settings.forEach(setting => {
      try {
        // Try to parse JSON values
        settingsObj[setting.key] = JSON.parse(setting.value);
      } catch (e) {
        // If not JSON, use as string
        settingsObj[setting.key] = setting.value;
      }
    });

    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/settings
 * Update dashboard settings
 */
router.put('/', (req, res) => {
  try {
    const db = req.app.locals.db;
    const settings = req.body;

    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now')
    `);

    // Update each setting
    const updateMany = db.transaction((settingsObj) => {
      for (const [key, value] of Object.entries(settingsObj)) {
        const jsonValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        upsert.run(key, jsonValue);
      }
    });

    updateMany(settings);

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * GET /api/settings/:key
 * Get a specific setting by key
 */
router.get('/:key', (req, res) => {
  try {
    const db = req.app.locals.db;
    const { key } = req.params;

    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    try {
      const value = JSON.parse(setting.value);
      res.json({ [key]: value });
    } catch (e) {
      res.json({ [key]: setting.value });
    }
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

module.exports = router;
