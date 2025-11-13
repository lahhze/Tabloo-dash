/**
 * App Health API Routes
 * Performs server-side reachability checks for registered applications
 */

const express = require('express');
const http = require('http');
const https = require('https');
const router = express.Router();

const DEFAULT_HEALTH_TIMEOUT = 7000;
const MAX_REDIRECTS = 3;

/**
 * Perform an HTTP(S) request with timeout and basic redirect support
 */
function performRequest(targetUrl, method = 'HEAD', redirects = 0) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const transport = urlObj.protocol === 'https:' ? https : http;

    const req = transport.request(
      {
        method,
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: `${urlObj.pathname}${urlObj.search}`,
        timeout: DEFAULT_HEALTH_TIMEOUT,
        headers: {
          'User-Agent': 'TablooHealth/1.0 (+https://tabloo)'
        }
      },
      (res) => {
        const { statusCode = 0, headers } = res;
        const redirectLocation = headers.location;

        if (
          redirectLocation &&
          [301, 302, 303, 307, 308].includes(statusCode) &&
          redirects < MAX_REDIRECTS
        ) {
          res.resume();
          const redirectedUrl = new URL(redirectLocation, urlObj);
          resolve(performRequest(redirectedUrl.toString(), method, redirects + 1));
          return;
        }

        res.resume();
        resolve({ statusCode });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Check an application's reachability
 */
async function checkAppHealth(app) {
  const start = Date.now();
  const methods = ['HEAD', 'GET'];
  let lastError = null;

  for (const method of methods) {
    try {
      const response = await performRequest(app.url, method);

      // If the endpoint does not support HEAD, fall back to GET
      if (method === 'HEAD' && (response.statusCode === 405 || response.statusCode === 501)) {
        continue;
      }

      return {
        id: app.id,
        name: app.name,
        url: app.url,
        tag: app.tag,
        section: app.section,
        status: response.statusCode >= 200 && response.statusCode < 400 ? 'up' : 'down',
        statusCode: response.statusCode,
        latencyMs: Date.now() - start
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    id: app.id,
    name: app.name,
    url: app.url,
    tag: app.tag,
    section: app.section,
    status: 'down',
    statusCode: null,
    latencyMs: Date.now() - start,
    error: lastError ? lastError.message : 'Request failed'
  };
}

/**
 * GET /api/apps/health/check
 * Return reachability status for all apps
 */
router.get('/check', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const apps = db.prepare(`
      SELECT id, name, url, tag, section
      FROM apps
      ORDER BY name ASC
    `).all();

    if (!apps.length) {
      return res.json({
        checkedAt: new Date().toISOString(),
        apps: []
      });
    }

    const results = await Promise.all(apps.map(app => checkAppHealth(app)));

    res.json({
      checkedAt: new Date().toISOString(),
      apps: results
    });
  } catch (error) {
    console.error('Error checking app health:', error);
    res.status(500).json({ error: 'Failed to check app health' });
  }
});

module.exports = router;
