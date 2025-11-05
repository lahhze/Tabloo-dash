# Home-Lab Dashboard

A beautiful, customizable dashboard for managing and accessing your self-hosted home-lab applications. Built with Node.js, Express, SQLite, and vanilla JavaScript.

## SECURITY WARNING

**THIS APPLICATION HAS NO AUTHENTICATION AND IS COMPLETELY OPEN TO ANYONE WHO CAN ACCESS THE SERVER.**

- Only run this on a **private network** or behind a firewall
- **DO NOT** expose this to the public internet without adding proper authentication
- All admin functions are accessible to anyone who can reach the server
- Use at your own risk

## Features

- Clean, modern UI with dark theme optimized for always-on displays
- Multiple view modes: Grid, Cards, and List
- Real-time search and filtering by tags
- Pin important apps to the top
- Quick add functionality from the dashboard
- Full admin panel with CRUD operations
- Bulk import apps via JSON
- Image upload manager for custom icons
- Responsive design (desktop, tablet, mobile)
- SQLite database with auto-initialization
- Example apps included (AdGuard, Pi-hole, Immich)

## Technology Stack

- **Backend**: Node.js (LTS), Express, SQLite (better-sqlite3)
- **Frontend**: HTML5, CSS3, Tailwind CSS, Vanilla JavaScript
- **Security**: Helmet.js (basic headers)
- **Uploads**: Multer (image handling)

## Requirements

- Node.js 18+ (LTS recommended)
- Debian 12 or compatible Linux distribution
- 512 MB RAM minimum (1 GB recommended)
- 500 MB disk space

## Installation on Debian 12 LXC (Proxmox)

### 1. System Setup

Update your system and install dependencies:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl ca-certificates build-essential sqlite3 git
```

### 2. Install Node.js LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify installation:

```bash
node --version
npm --version
```

### 3. Create Application Directory

```bash
sudo mkdir -p /opt/homelab-dashboard
sudo chown $USER:$USER /opt/homelab-dashboard
cd /opt/homelab-dashboard
```

### 4. Download or Clone Project

If using git:

```bash
git clone <your-repo-url> /opt/homelab-dashboard
cd /opt/homelab-dashboard
```

Or manually copy all project files to `/opt/homelab-dashboard/`

### 5. Configure Environment

```bash
cp .env.example .env
nano .env
```

Edit the `.env` file as needed:

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
```

### 6. Install Dependencies

```bash
npm install
```

This will also automatically create the `public/uploads` directory.

### 7. Initialize Database (Optional)

```bash
npm run setup
```

This creates the database and tables without starting the server.

### 8. Test the Application

```bash
npm start
```

Open your browser and navigate to `http://<your-lxc-ip>:3000`

Press `Ctrl+C` to stop the test server.

## Running as a System Service

### 1. Prepare for System Service

Set correct ownership (running as www-data for security):

```bash
sudo chown -R www-data:www-data /opt/homelab-dashboard
sudo chmod 755 /opt/homelab-dashboard
```

### 2. Install Systemd Service

```bash
sudo cp /opt/homelab-dashboard/systemd/homelab-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload
```

### 3. Enable and Start Service

```bash
sudo systemctl enable homelab-dashboard
sudo systemctl start homelab-dashboard
```

### 4. Check Service Status

```bash
sudo systemctl status homelab-dashboard
```

### 5. View Logs

```bash
sudo journalctl -u homelab-dashboard -f
```

## Firewall Configuration

If using `ufw`, restrict access to your local network:

```bash
sudo apt install -y ufw
sudo ufw allow from 192.168.1.0/24 to any port 3000 proto tcp
sudo ufw enable
```

Replace `192.168.1.0/24` with your actual network range.

## Usage

### Public Dashboard (/)

Access the main dashboard at `http://<your-ip>:3000/`

Features:
- View all your apps in Grid, Cards, or List view
- Search by name, description, or tag
- Filter by tag category
- Sort by name, date, tag, or pinned status
- Pin/unpin apps directly from the dashboard
- Quick add new apps with the floating action button (bottom-right)
- Click "Open" to launch apps in a new tab

### Admin Panel (/admin)

Access the admin interface at `http://<your-ip>:3000/admin`

Features:
- **Applications Tab**: Full CRUD operations
  - Add, edit, and delete apps
  - Set app name, URL, IP, description, tag, and icon
  - Toggle pinned status
- **Upload Manager Tab**: Manage app icons and images
  - Drag-and-drop or click to upload
  - Supports PNG, JPG, WebP, SVG
  - Maximum 8 MB per file
  - Copy file paths for use in app settings
- **Bulk Add Tab**: Import multiple apps at once
  - Paste JSON array of apps
  - Validate JSON before importing
  - See detailed results of import operation

### Example Bulk Import JSON

```json
[
  {
    "name": "Portainer",
    "url": "http://192.168.1.10:9000",
    "ip": "192.168.1.10",
    "description": "Docker container management",
    "tag": "Management",
    "icon": "/uploads/portainer.png",
    "is_pinned": 1
  },
  {
    "name": "Grafana",
    "url": "http://192.168.1.11:3000",
    "ip": "192.168.1.11",
    "description": "Monitoring and visualization",
    "tag": "Monitoring",
    "icon": "/uploads/grafana.png",
    "is_pinned": 0
  }
]
```

## API Endpoints

All endpoints are public (no authentication required).

### Apps

- `GET /api/apps` - List all apps
- `GET /api/apps/:id` - Get single app
- `POST /api/apps` - Create new app
- `PUT /api/apps/:id` - Update app
- `DELETE /api/apps/:id` - Delete app
- `PATCH /api/apps/:id/pin` - Toggle pin status
- `POST /api/apps/bulk` - Bulk create apps

### Uploads

- `GET /api/uploads` - List uploads (query: ?limit=50&offset=0)
- `GET /api/uploads/:id` - Get single upload
- `POST /api/uploads` - Upload single file (multipart/form-data, field: "file")
- `POST /api/uploads/multiple` - Upload multiple files (multipart/form-data, field: "files")

### Static Files

- `GET /uploads/:filename` - Serve uploaded files

## Database Schema

### apps table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| name | TEXT | App name (required) |
| url | TEXT | App URL (required, must be http/https) |
| ip | TEXT | IP address (optional) |
| description | TEXT | App description (optional) |
| tag | TEXT | Category tag (optional) |
| icon | TEXT | Icon path (optional, e.g., /uploads/icon.png) |
| created_at | TEXT | Creation timestamp (ISO 8601) |
| updated_at | TEXT | Last update timestamp (ISO 8601) |
| is_pinned | INTEGER | Pin status (0 or 1) |

### uploads table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| filename | TEXT | Sanitized filename (timestamp-random.ext) |
| original_name | TEXT | Original filename |
| size | INTEGER | File size in bytes |
| mime | TEXT | MIME type |
| created_at | TEXT | Upload timestamp (ISO 8601) |

## File Structure

```
.
├── server.js                    # Main Express server
├── package.json                 # Node.js dependencies
├── .env.example                 # Environment template
├── .env                         # Your configuration (create this)
├── README.md                    # This file
├── db/
│   └── app.db                   # SQLite database (auto-created)
├── public/
│   ├── index.html               # Dashboard UI
│   ├── admin.html               # Admin panel UI
│   ├── dashboard.js             # Dashboard client code
│   ├── admin.js                 # Admin panel client code
│   ├── styles.css               # Custom styles
│   └── uploads/                 # Uploaded files directory
├── routes/
│   ├── apps.js                  # Apps API routes
│   └── uploads.js               # Upload API routes
└── systemd/
    └── homelab-dashboard.service # Systemd unit file
```

## Customization

### Change Port or Host

Edit the `.env` file:

```env
PORT=8080
HOST=127.0.0.1
```

Then restart the service:

```bash
sudo systemctl restart homelab-dashboard
```

### Custom Icons

Upload icon images via the Upload Manager in the admin panel, then set the icon path when creating or editing an app (e.g., `/uploads/myicon.png`).

If no icon is provided, the dashboard will generate initials from the app name.

### Styling

Edit `public/styles.css` to customize colors, fonts, spacing, and other visual elements.

The dashboard uses Tailwind CSS via CDN for utility classes.

## Troubleshooting

### Service won't start

Check logs:

```bash
sudo journalctl -u homelab-dashboard -n 50
```

Verify ownership:

```bash
ls -la /opt/homelab-dashboard
```

Should show `www-data:www-data` ownership.

### Port already in use

Change the port in `.env` and restart the service.

### Database errors

Stop the service and reinitialize:

```bash
sudo systemctl stop homelab-dashboard
cd /opt/homelab-dashboard
sudo -u www-data node server.js --init-only
sudo systemctl start homelab-dashboard
```

### Can't upload files

Check uploads directory permissions:

```bash
sudo chown -R www-data:www-data /opt/homelab-dashboard/public/uploads
sudo chmod 755 /opt/homelab-dashboard/public/uploads
```

### Node.js version issues

Ensure you're using Node.js 18 or higher:

```bash
node --version
```

If needed, reinstall Node.js LTS using the instructions above.

## Updating the Application

1. Stop the service:

```bash
sudo systemctl stop homelab-dashboard
```

2. Backup your data:

```bash
sudo cp -r /opt/homelab-dashboard/db /opt/homelab-dashboard/db.backup
sudo cp -r /opt/homelab-dashboard/public/uploads /opt/homelab-dashboard/uploads.backup
sudo cp /opt/homelab-dashboard/.env /opt/homelab-dashboard/.env.backup
```

3. Update files (git pull or manual copy)

4. Install any new dependencies:

```bash
cd /opt/homelab-dashboard
sudo -u www-data npm install
```

5. Restart the service:

```bash
sudo systemctl start homelab-dashboard
```

## Development

### Development Mode

For development with auto-reload:

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when files change.

### Environment

Set `NODE_ENV=development` in `.env` for more verbose error messages.

## Uninstallation

1. Stop and disable the service:

```bash
sudo systemctl stop homelab-dashboard
sudo systemctl disable homelab-dashboard
sudo rm /etc/systemd/system/homelab-dashboard.service
sudo systemctl daemon-reload
```

2. Remove application files:

```bash
sudo rm -rf /opt/homelab-dashboard
```

3. Optional: Remove Node.js if not needed for other apps:

```bash
sudo apt remove nodejs
sudo apt autoremove
```

## License

MIT License - See LICENSE file for details

## Support

This is a self-hosted application with no official support. Use at your own risk.

For issues, consult the troubleshooting section above or review the application logs.

## Credits

Built with Node.js, Express, SQLite, Tailwind CSS, and modern web technologies.

## Changelog

### Version 1.0.0

- Initial release
- Dashboard with Grid, Cards, and List views
- Search and filter functionality
- Pin/unpin apps
- Admin panel with full CRUD
- Upload manager
- Bulk import
- Example apps (AdGuard, Pi-hole, Immich)
- Systemd service integration
