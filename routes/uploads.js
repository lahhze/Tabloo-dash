/**
 * Uploads API Routes
 * Handles file uploads for app icons and images
 *
 * SECURITY WARNING: No authentication - all routes are public
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    // Generate safe filename: timestamp-random.ext
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedName = `${timestamp}-${random}${ext}`;
    cb(null, sanitizedName);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/svg+xml'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPEG, WebP, and SVG images are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024 // 8 MB max file size
  }
});

/**
 * POST /api/uploads
 * Upload a single file
 */
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const db = req.app.locals.db;

    // Store file metadata in database
    const stmt = db.prepare(`
      INSERT INTO uploads (filename, original_name, size, mime)
      VALUES (?, ?, ?, ?)
    `);

    const info = stmt.run(
      req.file.filename,
      req.file.originalname,
      req.file.size,
      req.file.mimetype
    );

    const upload = db.prepare('SELECT * FROM uploads WHERE id = ?').get(info.lastInsertRowid);

    res.status(201).json({
      ...upload,
      url: `/uploads/${req.file.filename}`,
      path: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

/**
 * POST /api/uploads/multiple
 * Upload multiple files
 */
router.post('/multiple', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const db = req.app.locals.db;
    const stmt = db.prepare(`
      INSERT INTO uploads (filename, original_name, size, mime)
      VALUES (?, ?, ?, ?)
    `);

    const uploads = [];

    req.files.forEach(file => {
      const info = stmt.run(
        file.filename,
        file.originalname,
        file.size,
        file.mimetype
      );

      const upload = db.prepare('SELECT * FROM uploads WHERE id = ?').get(info.lastInsertRowid);
      uploads.push({
        ...upload,
        url: `/uploads/${file.filename}`,
        path: `/uploads/${file.filename}`
      });
    });

    res.status(201).json(uploads);
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

/**
 * GET /api/uploads
 * List all uploads (most recent first)
 */
router.get('/', (req, res) => {
  try {
    const db = req.app.locals.db;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const uploads = db.prepare(`
      SELECT * FROM uploads
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    // Add URL to each upload
    const uploadsWithUrls = uploads.map(upload => ({
      ...upload,
      url: `/uploads/${upload.filename}`,
      path: `/uploads/${upload.filename}`
    }));

    res.json(uploadsWithUrls);
  } catch (error) {
    console.error('Error fetching uploads:', error);
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

/**
 * GET /api/uploads/:id
 * Get single upload by ID
 */
router.get('/:id', (req, res) => {
  try {
    const db = req.app.locals.db;
    const upload = db.prepare('SELECT * FROM uploads WHERE id = ?').get(req.params.id);

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    res.json({
      ...upload,
      url: `/uploads/${upload.filename}`,
      path: `/uploads/${upload.filename}`
    });
  } catch (error) {
    console.error('Error fetching upload:', error);
    res.status(500).json({ error: 'Failed to fetch upload' });
  }
});

// Error handler for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 8 MB.' });
    }
    return res.status(400).json({ error: error.message });
  }

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  next();
});

module.exports = router;
