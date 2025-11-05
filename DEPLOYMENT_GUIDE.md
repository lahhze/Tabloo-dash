# Deployment Guide - Home-Lab Dashboard

## Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] A Debian 12 LXC container on Proxmox (or compatible Linux system)
- [ ] Root or sudo access
- [ ] Network connectivity
- [ ] All project files copied to the server
- [ ] Understanding of the security implications (NO AUTHENTICATION)

## Deployment Steps

### Step 1: Prepare the System

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required dependencies
sudo apt install -y curl ca-certificates build-essential sqlite3
```

### Step 2: Install Node.js LTS

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x or higher
npm --version   # Should show 9.x or higher
```

### Step 3: Deploy Application Files

```bash
# Create application directory
sudo mkdir -p /opt/homelab-dashboard

# Copy all project files to the server
# Option A: Using SCP from your local machine
scp -r /path/to/homelab-dashboard/* user@server-ip:/tmp/dashboard/
sudo mv /tmp/dashboard/* /opt/homelab-dashboard/

# Option B: Using Git
sudo git clone <your-repo-url> /opt/homelab-dashboard

# Option C: Manual upload via SFTP/WinSCP/FileZilla
# Upload all files to /opt/homelab-dashboard/
```

### Step 4: Configure Environment

```bash
cd /opt/homelab-dashboard

# Create .env from template
cp .env.example .env

# Edit if needed (optional - defaults are usually fine)
nano .env
```

Default `.env` contents (usually no changes needed):
```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
```

### Step 5: Install Node.js Dependencies

```bash
cd /opt/homelab-dashboard

# Install all dependencies
npm install
```

Expected output:
```
added 150 packages, and audited 151 packages in 15s
```

The uploads directory will be automatically created.

### Step 6: Test the Application

```bash
# Run the application in test mode
npm start
```

You should see:
```
========================================
  Home-Lab Dashboard
========================================

  Server running at: http://0.0.0.0:3000
  Dashboard: http://0.0.0.0:3000/
  Admin UI: http://0.0.0.0:3000/admin
  Environment: production

  WARNING: No authentication enabled!
  Run only on a private network.

========================================
```

Open your browser to `http://<server-ip>:3000` and verify:
- Dashboard loads successfully
- Three example apps are visible (AdGuard, Pi-hole, Immich)
- You can search and filter apps
- View modes (Grid/Cards/List) work
- Admin panel is accessible at `/admin`

Press `Ctrl+C` to stop the test server.

### Step 7: Set Correct Permissions

```bash
# Set ownership to www-data (secure, non-root user)
sudo chown -R www-data:www-data /opt/homelab-dashboard

# Set correct permissions
sudo chmod 755 /opt/homelab-dashboard
sudo chmod 755 /opt/homelab-dashboard/public/uploads
```

### Step 8: Install Systemd Service

```bash
# Copy service file to systemd directory
sudo cp /opt/homelab-dashboard/systemd/homelab-dashboard.service /etc/systemd/system/

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable homelab-dashboard

# Start the service
sudo systemctl start homelab-dashboard

# Check service status
sudo systemctl status homelab-dashboard
```

Expected output:
```
● homelab-dashboard.service - Home-Lab Dashboard
     Loaded: loaded (/etc/systemd/system/homelab-dashboard.service; enabled)
     Active: active (running) since [date]
```

### Step 9: Verify Service is Running

```bash
# Check if service is active
systemctl is-active homelab-dashboard
# Should output: active

# View live logs
sudo journalctl -u homelab-dashboard -f
# Press Ctrl+C to exit
```

### Step 10: Configure Firewall (Recommended)

```bash
# Install UFW if not already installed
sudo apt install -y ufw

# Allow SSH (important - don't lock yourself out!)
sudo ufw allow ssh

# Allow dashboard access from your local network only
sudo ufw allow from 192.168.1.0/24 to any port 3000 proto tcp

# Enable firewall
sudo ufw enable

# Check firewall status
sudo ufw status numbered
```

Replace `192.168.1.0/24` with your actual network range:
- For 192.168.0.x networks: use `192.168.0.0/24`
- For 192.168.2.x networks: use `192.168.2.0/24`
- For 10.0.0.x networks: use `10.0.0.0/24`

To find your network range:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

## Post-Deployment Verification

### 1. Access Dashboard

Open your browser and navigate to:
- Main Dashboard: `http://<server-ip>:3000/`
- Admin Panel: `http://<server-ip>:3000/admin`

### 2. Test Core Functionality

- [ ] Dashboard displays three example apps
- [ ] Search functionality works
- [ ] Filter by tag works
- [ ] View modes switch (Grid, Cards, List)
- [ ] Pin/unpin functionality works
- [ ] Quick add button opens modal
- [ ] Admin panel loads
- [ ] Can create new app in admin
- [ ] Can edit existing app
- [ ] Can delete app
- [ ] File upload works
- [ ] Bulk import works

### 3. Verify Service Behavior

```bash
# Check service starts on reboot
sudo systemctl reboot

# After reboot, check service status
sudo systemctl status homelab-dashboard

# Should be "active (running)"
```

## Customization After Deployment

### Add Your Own Apps

1. Go to `http://<server-ip>:3000/admin`
2. Click "Add New App"
3. Fill in the details:
   - **Name**: Your app name (e.g., "Portainer")
   - **URL**: Full URL including http:// (e.g., "http://192.168.1.10:9000")
   - **IP**: Optional IP address
   - **Description**: Brief description
   - **Tag**: Category (e.g., "Management", "Media", "Monitoring")
   - **Icon**: Leave empty for auto-generated initials, or upload a custom icon first
   - **Pin to top**: Check to pin

### Upload Custom Icons

1. Go to Admin Panel > Upload Manager tab
2. Drag and drop icon files (PNG, JPG, WebP, SVG)
3. Copy the file path (e.g., `/uploads/1699234567-abc123.png`)
4. When creating/editing an app, paste the path in the "Icon URL" field

### Remove Example Apps

1. Go to Admin Panel > Applications tab
2. Click "Delete" for AdGuard, Pi-hole, and Immich
3. Confirm deletion

### Change Port

If port 3000 is already in use:

```bash
# Stop service
sudo systemctl stop homelab-dashboard

# Edit .env
sudo nano /opt/homelab-dashboard/.env

# Change PORT to desired port (e.g., 8080)
PORT=8080

# Update firewall rule
sudo ufw delete allow 3000
sudo ufw allow from 192.168.1.0/24 to any port 8080 proto tcp

# Restart service
sudo systemctl start homelab-dashboard
```

## Backup and Restore

### Create Backup

```bash
# Create backup directory
mkdir -p ~/homelab-backups

# Backup database
sudo cp /opt/homelab-dashboard/db/app.db ~/homelab-backups/app-$(date +%Y%m%d-%H%M%S).db

# Backup uploaded files
sudo tar -czf ~/homelab-backups/uploads-$(date +%Y%m%d-%H%M%S).tar.gz /opt/homelab-dashboard/public/uploads

# Backup configuration
sudo cp /opt/homelab-dashboard/.env ~/homelab-backups/.env-$(date +%Y%m%d-%H%M%S)

# List backups
ls -lh ~/homelab-backups/
```

### Restore from Backup

```bash
# Stop service
sudo systemctl stop homelab-dashboard

# Restore database
sudo cp ~/homelab-backups/app-20241104-120000.db /opt/homelab-dashboard/db/app.db

# Restore uploads
sudo tar -xzf ~/homelab-backups/uploads-20241104-120000.tar.gz -C /

# Restore configuration
sudo cp ~/homelab-backups/.env-20241104-120000 /opt/homelab-dashboard/.env

# Fix permissions
sudo chown -R www-data:www-data /opt/homelab-dashboard

# Start service
sudo systemctl start homelab-dashboard
```

## Automated Backups (Optional)

Create a daily backup cron job:

```bash
# Create backup script
sudo nano /usr/local/bin/backup-homelab-dashboard.sh
```

Add this content:
```bash
#!/bin/bash
BACKUP_DIR="/root/homelab-backups"
DATE=$(date +%Y%m%d)
mkdir -p $BACKUP_DIR

# Backup database
cp /opt/homelab-dashboard/db/app.db $BACKUP_DIR/app-$DATE.db

# Backup uploads (if changed)
tar -czf $BACKUP_DIR/uploads-$DATE.tar.gz /opt/homelab-dashboard/public/uploads 2>/dev/null

# Keep only last 7 days of backups
find $BACKUP_DIR -name "app-*.db" -mtime +7 -delete
find $BACKUP_DIR -name "uploads-*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE" >> $BACKUP_DIR/backup.log
```

Make it executable and schedule:
```bash
sudo chmod +x /usr/local/bin/backup-homelab-dashboard.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e

# Add this line:
0 2 * * * /usr/local/bin/backup-homelab-dashboard.sh
```

## Monitoring and Maintenance

### View Logs

```bash
# Live log streaming
sudo journalctl -u homelab-dashboard -f

# Last 50 lines
sudo journalctl -u homelab-dashboard -n 50

# Logs from today
sudo journalctl -u homelab-dashboard --since today

# Logs with errors only
sudo journalctl -u homelab-dashboard -p err
```

### Resource Usage

```bash
# Check memory usage
ps aux | grep "node server.js"

# Check disk usage
du -sh /opt/homelab-dashboard

# Check database size
ls -lh /opt/homelab-dashboard/db/app.db

# Check uploads size
du -sh /opt/homelab-dashboard/public/uploads
```

### Service Management

```bash
# Restart service
sudo systemctl restart homelab-dashboard

# Stop service
sudo systemctl stop homelab-dashboard

# Start service
sudo systemctl start homelab-dashboard

# Check status
sudo systemctl status homelab-dashboard

# Disable auto-start
sudo systemctl disable homelab-dashboard

# Re-enable auto-start
sudo systemctl enable homelab-dashboard
```

## Troubleshooting

### Service Won't Start

```bash
# Check for detailed error messages
sudo journalctl -u homelab-dashboard -n 50

# Common causes:
# 1. Port already in use
sudo netstat -tlnp | grep 3000

# 2. Permission issues
sudo chown -R www-data:www-data /opt/homelab-dashboard

# 3. Missing dependencies
cd /opt/homelab-dashboard
sudo -u www-data npm install

# 4. Corrupted database
sudo systemctl stop homelab-dashboard
sudo rm /opt/homelab-dashboard/db/app.db
sudo -u www-data node /opt/homelab-dashboard/server.js --init-only
sudo systemctl start homelab-dashboard
```

### Can't Access Dashboard

```bash
# 1. Check if service is running
sudo systemctl status homelab-dashboard

# 2. Check firewall
sudo ufw status

# 3. Check port is listening
sudo netstat -tlnp | grep 3000

# 4. Test from server itself
curl http://localhost:3000

# 5. Check logs for errors
sudo journalctl -u homelab-dashboard -n 50
```

### Upload Fails

```bash
# Fix upload directory permissions
sudo chown -R www-data:www-data /opt/homelab-dashboard/public/uploads
sudo chmod 755 /opt/homelab-dashboard/public/uploads

# Check disk space
df -h /opt/homelab-dashboard
```

## Security Hardening (Optional)

### Add Reverse Proxy with Authentication

Install nginx:
```bash
sudo apt install -y nginx apache2-utils
```

Create password file:
```bash
sudo htpasswd -c /etc/nginx/.htpasswd admin
```

Create nginx config:
```bash
sudo nano /etc/nginx/sites-available/homelab-dashboard
```

Add this content:
```nginx
server {
    listen 80;
    server_name dashboard.local;

    auth_basic "Home-Lab Dashboard";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/homelab-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Now access via nginx at `http://<server-ip>` (port 80) with authentication.

## Uninstallation

If you need to completely remove the application:

```bash
# Stop and disable service
sudo systemctl stop homelab-dashboard
sudo systemctl disable homelab-dashboard

# Remove service file
sudo rm /etc/systemd/system/homelab-dashboard.service
sudo systemctl daemon-reload

# Remove application
sudo rm -rf /opt/homelab-dashboard

# Remove firewall rule
sudo ufw delete allow 3000

# Optional: Remove Node.js if not needed
sudo apt remove nodejs
sudo apt autoremove
```

## Support and Documentation

- **Full Documentation**: See `README.md`
- **Installation Help**: See `INSTALL.md`
- **Quick Reference**: See `QUICK_REFERENCE.md`
- **Project Details**: See `PROJECT_SUMMARY.md`

## Success Checklist

After deployment, you should have:

- [x] Service running automatically on boot
- [x] Dashboard accessible from your network
- [x] Admin panel accessible
- [x] Example apps visible (or replaced with your apps)
- [x] File uploads working
- [x] Firewall configured to restrict access
- [x] Backups configured (optional but recommended)
- [x] Understanding of security implications
- [x] Logs accessible via journalctl

Congratulations! Your Home-Lab Dashboard is now deployed and ready to use.
