/**
 * Apps API Routes
 * Handles CRUD operations for home-lab applications
 *
 * SECURITY WARNING: No authentication - all routes are public
 */

const express = require('express');
const router = express.Router();

/**
 * Validate app data
 */
function validateApp(data) {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }

  if (!data.url || typeof data.url !== 'string') {
    errors.push('URL is required');
  } else {
    // Basic URL validation
    try {
      const url = new URL(data.url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('URL must use http or https protocol');
      }
    } catch (e) {
      errors.push('Invalid URL format');
    }
  }

  return errors;
}

/**
 * Sanitize HTML to prevent XSS
 */
function sanitize(str) {
  if (!str) return str;
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * GET /api/apps
 * List all apps
 */
router.get('/', (req, res) => {
  try {
    const db = req.app.locals.db;
    const apps = db.prepare(`
      SELECT * FROM apps
      ORDER BY is_pinned DESC, created_at DESC
    `).all();

    res.json(apps);
  } catch (error) {
    console.error('Error fetching apps:', error);
    res.status(500).json({ error: 'Failed to fetch apps' });
  }
});

/**
 * GET /api/apps/:id
 * Get single app by ID
 */
router.get('/:id', (req, res) => {
  try {
    const db = req.app.locals.db;
    const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(req.params.id);

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    res.json(app);
  } catch (error) {
    console.error('Error fetching app:', error);
    res.status(500).json({ error: 'Failed to fetch app' });
  }
});

/**
 * POST /api/apps
 * Create new app
 */
router.post('/', (req, res) => {
  try {
    const errors = validateApp(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    const db = req.app.locals.db;
    const stmt = db.prepare(`
      INSERT INTO apps (name, url, ip, description, tag, icon, section, is_pinned)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      sanitize(req.body.name),
      req.body.url, // URLs don't need sanitization
      req.body.ip || null,
      sanitize(req.body.description) || null,
      sanitize(req.body.tag) || null,
      req.body.icon || null,
      sanitize(req.body.section) || null,
      req.body.is_pinned ? 1 : 0
    );

    const newApp = db.prepare('SELECT * FROM apps WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newApp);
  } catch (error) {
    console.error('Error creating app:', error);
    res.status(500).json({ error: 'Failed to create app' });
  }
});

/**
 * PUT /api/apps/:id
 * Update existing app
 */
router.put('/:id', (req, res) => {
  try {
    const errors = validateApp(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    const db = req.app.locals.db;

    // Check if app exists
    const existing = db.prepare('SELECT id FROM apps WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'App not found' });
    }

    const stmt = db.prepare(`
      UPDATE apps
      SET name = ?,
          url = ?,
          ip = ?,
          description = ?,
          tag = ?,
          icon = ?,
          section = ?,
          is_pinned = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      sanitize(req.body.name),
      req.body.url,
      req.body.ip || null,
      sanitize(req.body.description) || null,
      sanitize(req.body.tag) || null,
      req.body.icon || null,
      sanitize(req.body.section) || null,
      req.body.is_pinned ? 1 : 0,
      req.params.id
    );

    const updatedApp = db.prepare('SELECT * FROM apps WHERE id = ?').get(req.params.id);
    res.json(updatedApp);
  } catch (error) {
    console.error('Error updating app:', error);
    res.status(500).json({ error: 'Failed to update app' });
  }
});

/**
 * DELETE /api/apps/:id
 * Delete app
 */
router.delete('/:id', (req, res) => {
  try {
    const db = req.app.locals.db;

    // Check if app exists
    const existing = db.prepare('SELECT id FROM apps WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'App not found' });
    }

    // Delete the app (note: we don't delete associated files)
    db.prepare('DELETE FROM apps WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: 'App deleted successfully' });
  } catch (error) {
    console.error('Error deleting app:', error);
    res.status(500).json({ error: 'Failed to delete app' });
  }
});

/**
 * PATCH /api/apps/:id/pin
 * Toggle pin status
 */
router.patch('/:id/pin', (req, res) => {
  try {
    const db = req.app.locals.db;

    const app = db.prepare('SELECT is_pinned FROM apps WHERE id = ?').get(req.params.id);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    const newPinStatus = app.is_pinned ? 0 : 1;
    db.prepare('UPDATE apps SET is_pinned = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(newPinStatus, req.params.id);

    const updatedApp = db.prepare('SELECT * FROM apps WHERE id = ?').get(req.params.id);
    res.json(updatedApp);
  } catch (error) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

/**
 * POST /api/apps/bulk
 * Bulk create apps from JSON array
 */
router.post('/bulk', (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be an array of apps' });
    }

    const db = req.app.locals.db;
    const results = { created: [], errors: [] };

    const stmt = db.prepare(`
      INSERT INTO apps (name, url, ip, description, tag, icon, section, is_pinned)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    req.body.forEach((app, index) => {
      try {
        const errors = validateApp(app);
        if (errors.length > 0) {
          results.errors.push({ index, errors });
          return;
        }

        const info = stmt.run(
          sanitize(app.name),
          app.url,
          app.ip || null,
          sanitize(app.description) || null,
          sanitize(app.tag) || null,
          app.icon || null,
          sanitize(app.section) || null,
          app.is_pinned ? 1 : 0
        );

        const newApp = db.prepare('SELECT * FROM apps WHERE id = ?').get(info.lastInsertRowid);
        results.created.push(newApp);
      } catch (error) {
        results.errors.push({ index, error: error.message });
      }
    });

    res.status(201).json(results);
  } catch (error) {
    console.error('Error bulk creating apps:', error);
    res.status(500).json({ error: 'Failed to bulk create apps' });
  }
});

module.exports = router;
