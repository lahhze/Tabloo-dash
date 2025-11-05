# Quick Installation Guide

This guide provides step-by-step instructions for setting up the Home-Lab Dashboard on Debian 12 LXC.

## SECURITY NOTICE

This application has NO AUTHENTICATION. Only use on private networks.

## Prerequisites

- Debian 12 LXC container on Proxmox
- Root or sudo access
- Network connectivity

## Quick Install Script

You can copy and paste this entire block into your terminal:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl ca-certificates build-essential sqlite3

# Install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# Create application directory
sudo mkdir -p /opt/homelab-dashboard

# Copy project files to /opt/homelab-dashboard
# (You need to upload/copy your project files first)

# Set up environment
cd /opt/homelab-dashboard
cp .env.example .env

# Install Node.js dependencies
npm install

# Test the application
npm start
```

## Step-by-Step Installation

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install System Dependencies

```bash
sudo apt install -y curl ca-certificates build-essential sqlite3
```

### 3. Install Node.js LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify installation:

```bash
node --version  # Should show v18.x or higher
npm --version   # Should show 9.x or higher
```

### 4. Create Application Directory

```bash
sudo mkdir -p /opt/homelab-dashboard
cd /opt/homelab-dashboard
```

### 5. Upload Project Files

Transfer all project files to `/opt/homelab-dashboard/` using one of these methods:

**Option A: Using SCP from your computer**

```bash
scp -r /path/to/homelab-dashboard/* user@lxc-ip:/opt/homelab-dashboard/
```

**Option B: Using Git**

```bash
git clone https://github.com/yourusername/homelab-dashboard.git /opt/homelab-dashboard
```

**Option C: Manual upload via SFTP**

Use FileZilla, WinSCP, or similar tool.

### 6. Configure Environment

```bash
cd /opt/homelab-dashboard
cp .env.example .env
nano .env
```

Default settings (usually fine):

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
```

Save and exit (Ctrl+X, then Y, then Enter).

### 7. Install Node.js Dependencies

```bash
npm install
```

This will:
- Install all required packages
- Automatically create the uploads directory

### 8. Test the Application

```bash
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

Open your browser and go to `http://<your-lxc-ip>:3000`

Press `Ctrl+C` to stop.

### 9. Set Up as System Service

Set correct ownership:

```bash
sudo chown -R www-data:www-data /opt/homelab-dashboard
```

Install systemd service:

```bash
sudo cp /opt/homelab-dashboard/systemd/homelab-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable homelab-dashboard
sudo systemctl start homelab-dashboard
```

Check status:

```bash
sudo systemctl status homelab-dashboard
```

Should show "active (running)".

### 10. Configure Firewall (Optional but Recommended)

Restrict access to your local network:

```bash
sudo apt install -y ufw
sudo ufw allow from 192.168.1.0/24 to any port 3000 proto tcp
sudo ufw enable
```

Replace `192.168.1.0/24` with your actual network range.

## Post-Installation

### Access Your Dashboard

- **Main Dashboard**: `http://<lxc-ip>:3000/`
- **Admin Panel**: `http://<lxc-ip>:3000/admin`

### Default Apps

The dashboard comes with three example apps:
- AdGuard Home (192.168.1.2:3000)
- Pi-hole (192.168.1.3)
- Immich (192.168.1.4:2283)

Edit or delete these in the admin panel and add your own apps.

## Useful Commands

### View logs

```bash
sudo journalctl -u homelab-dashboard -f
```

### Restart service

```bash
sudo systemctl restart homelab-dashboard
```

### Stop service

```bash
sudo systemctl stop homelab-dashboard
```

### Check service status

```bash
sudo systemctl status homelab-dashboard
```

## Troubleshooting

### Port already in use

Change PORT in `/opt/homelab-dashboard/.env` to another port (e.g., 8080), then restart.

### Permission denied errors

```bash
sudo chown -R www-data:www-data /opt/homelab-dashboard
sudo chmod 755 /opt/homelab-dashboard
```

### Can't upload files

```bash
sudo chown -R www-data:www-data /opt/homelab-dashboard/public/uploads
sudo chmod 755 /opt/homelab-dashboard/public/uploads
```

### Database errors

Reinitialize the database:

```bash
sudo systemctl stop homelab-dashboard
cd /opt/homelab-dashboard
sudo -u www-data node server.js --init-only
sudo systemctl start homelab-dashboard
```

## Next Steps

1. Customize your apps in the admin panel
2. Upload custom icons for your apps
3. Organize apps with tags (DNS, Media, Monitoring, etc.)
4. Pin your most-used apps to the top
5. Access your dashboard from any device on your network

## Need Help?

Refer to the full README.md for detailed documentation, API reference, and advanced configuration options.
