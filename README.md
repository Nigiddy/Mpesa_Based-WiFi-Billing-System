
# Mpesa_Based-WiFi-Billing-System
A WiFi billing system that allows users to purchase internet access via MPesa payments (STK Push). Ideal for cybercafés, small businesses, and public WiFi hotspots.

**📌 FEATURES**

✅ MPesa STK Push Integration – Users pay directly from their phone via STK Push.

✅ Time-Based Access.

✅ Admin Dashboard – Track payments and manage users.

✅ MAC Address Whitelisting – Secure WiFi access via MikroTik integration.


**🛠️ TECH STACK**

Frontend: React + Tailwind CSS

Backend: Node.js + Express

Database: MySQL

Router Integration: MikroTik (MAC Address Whitelisting)


**🔧 INSTALLATION & SETUP**

1️⃣ Clone the repository

```bash
git clone https://github.com/Nigiddy/Mpesa_Based-WiFi-Billing-System.git
cd PROJECT_FOLDER
```

2️⃣ Install backend dependencies

```bash
npm install
```

3️⃣ Configure environment variables

Copy the template and edit the values for your local setup:

```bash
copy env.template .env
```

Then update `.env` with your database and API credentials. At minimum, set:

```env
DATABASE_URL="mysql://<db_user>:<db_password>@localhost:3306/<db_name>"
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_chars
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_SHORTCODE=your_mpesa_shortcode
MPESA_PASSKEY=your_mpesa_passkey
MPESA_CALLBACK_URL=https://your-callback-url.ngrok.io/mpesa/callback
NEXT_PUBLIC_API_URL=http://localhost:5000
FRONTEND_ORIGIN=http://localhost:3000

# Optional — seed script defaults (used by npx prisma db seed / npm run db:seed)
SEED_ADMIN_EMAIL=admin@qonnect.com
SEED_ADMIN_PASSWORD=Admin@1234
```

> `DATABASE_URL` must point to your MySQL database. Example:
> `DATABASE_URL="mysql://root:password@localhost:3306/wifi_billing"`


## Fresh Database Setup

This project uses **Prisma Migrate** for schema management. Never use `prisma db push` in production — it bypasses the migration history and causes schema drift.

1. Make sure your MySQL database exists and `DATABASE_URL` is set in `.env`.
2. Apply all migrations:

```bash
npx prisma migrate deploy
```

3. Seed the database (creates the `SystemSettings` singleton and a default admin account):

```bash
npx prisma db seed
# or equivalently:
npm run db:seed
```

> The seed script is **idempotent** — safe to run multiple times. It will not overwrite an existing admin or system-settings row.

### Default admin credentials

| Field    | Default value          | Override with env var   |
|----------|------------------------|-------------------------|
| Email    | `admin@qonnect.com`    | `SEED_ADMIN_EMAIL`      |
| Password | `Admin@1234`           | `SEED_ADMIN_PASSWORD`   |

> ⚠️ **Change the default password immediately after first login.**

To use custom credentials without editing source code, set the env vars before seeding:

```bash
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD=StrongPassWord npm run db:seed
```


## Development Workflow

### 1. Start Redis

The backend uses Redis for job queues and callback processing.

If Redis is installed locally:

```bash
redis-server
```



Set `REDIS_URL` in `.env` if you use a different host.


### 2. Start the backend

```bash
npm run dev
```

This starts the Express backend at `http://localhost:5000` by default.

> **Production (PM2):** `npm run pm2:start` points PM2 at `scripts/start.js`, which
> automatically runs `prisma migrate deploy` before starting the server. No manual
> migration step is needed on deploy.


### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend should run on `http://localhost:3000`.


### 4. Run ngrok for M-Pesa callbacks

If you are developing M-Pesa integration locally, expose port 5000 with ngrok:

```bash
ngrok http 5000
```

Then update the callback URL in `.env`:

```env
MPESA_CALLBACK_URL=https://<your-ngrok-id>.ngrok.io/mpesa/callback
```

Restart the backend after changing `.env`.


---

## 🐳 Docker Deployment (Production)

This section covers deploying the **backend, MySQL, and Redis** in Docker on a Linux VPS, with the **Next.js frontend continuing to run on Vercel**.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Public Internet                          │
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
   ┌───────────▼──────────┐   ┌───────────▼───────────────────┐
   │      Vercel CDN      │   │          Linux VPS             │
   │  portal.yourdomain   │   │       api.yourdomain.com       │
   │  (Next.js frontend)  │   │                               │
   └──────────────────────┘   │  ┌─────────────────────────┐  │
                               │  │   Caddy (port 80/443)   │  │
                               │  │  TLS termination +      │  │
                               │  │  WebSocket upgrades     │  │
                               │  └────────────┬────────────┘  │
                               │               │ :5000          │
                               │  ┌────────────▼────────────┐  │
                               │  │  kibaruani-backend      │  │
                               │  │  (Node.js / Express)    │  │
                               │  └───────┬────────┬────────┘  │
                               │          │        │            │
                               │  ┌───────▼──┐  ┌──▼────────┐  │
                               │  │  MySQL   │  │  Redis 7  │  │
                               │  │  (8.0)   │  │  BullMQ   │  │
                               │  │ internal │  │  internal │  │
                               │  └──────────┘  └───────────┘  │
                               └───────────────────────────────┘
```

**Domain layout** — both subdomains share the same apex domain (`.yourdomain.com`), so `SameSite=Lax` cookies are forwarded cross-subdomain by browsers without any code changes.

| Service | URL | Notes |
|---|---|---|
| Frontend | `https://portal.yourdomain.com` | Vercel, not on this VPS |
| Backend (REST + WS) | `https://api.yourdomain.com` | Caddy → Docker `:5000` |
| MySQL | internal only | No host port exposed |
| Redis | internal only | No host port exposed |

---

### Prerequisites

- Linux VPS (Ubuntu 22.04 LTS recommended, ≥ 1 GB RAM)
- Domain with two DNS A-records pointing to the VPS IP:
  - `api.yourdomain.com` → VPS IP
  - `portal.yourdomain.com` → Vercel handles this automatically
- Docker & docker-compose installed (see [deploy/vps-setup.sh](deploy/vps-setup.sh))
- Safaricom Daraja **production** account with approved callback URL

Run the one-time VPS setup script:

```bash
# Upload project to VPS (from your dev machine)
rsync -avz --exclude '.git' --exclude 'node_modules' \
      --exclude 'frontend/.next' --exclude 'backups' \
      ./ root@<VPS_IP>:/opt/kibaruani/

# SSH in and run the setup script
ssh root@<VPS_IP>
chmod +x /opt/kibaruani/deploy/vps-setup.sh
/opt/kibaruani/deploy/vps-setup.sh
```

---

### Environment Setup

```bash
cd /opt/kibaruani
cp .env.docker.example .env.docker
nano .env.docker   # fill in every value — see comments in the file
```

Key values to set for production:

```env
NODE_ENV=production
FRONTEND_ORIGIN=https://portal.yourdomain.com
MPESA_CALLBACK_URL=https://api.yourdomain.com/mpesa/callback
MIKROTIK_HOST=<router-IP-or-VPN-IP>
MIKROTIK_PORT=8729
MIKROTIK_USE_TLS=true
```

**Generate cryptographic secrets** (run once per secret, store securely):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Use the output for `JWT_SECRET`, `COOKIE_SECRET`, `SESSION_SECRET`, `DB_PASSWORD`, and `DB_ROOT_PASSWORD`.

> ⚠️ **Never commit `.env.docker`** — it is in `.gitignore`. The file `.env.docker.example` is the committed template.

---

### Database Migration Strategy

> ⚠️ **Zero data loss** — do not initialize a fresh database. Migrate your existing data.

**Step 1 — Dump the existing MySQL instance** (run on old host / dev machine):

```bash
mysqldump --single-transaction --no-tablespaces \
  -u wifiadmin -p wifi_billing > backups/kibaruani_dump.sql
```

**Step 2 — Start the MySQL container** (before the full stack):

```bash
docker-compose --env-file .env.docker up -d mysql
# Wait for healthy status
docker-compose ps
```

**Step 3 — Restore the dump into the container**:

```bash
docker cp backups/kibaruani_dump.sql kibaruani-mysql:/tmp/dump.sql
docker exec kibaruani-mysql sh -c \
  'mysql -u kibaruani -p"$MYSQL_PASSWORD" wifi_billing < /tmp/dump.sql'
```

**Step 4 — Verify row counts match your baseline**:

```bash
docker exec kibaruani-mysql mysql -u kibaruani -p"$MYSQL_PASSWORD" wifi_billing \
  -e "SELECT 'admin' tbl, COUNT(*) n FROM admin
      UNION ALL SELECT 'voucher', COUNT(*) FROM voucher
      UNION ALL SELECT 'migrations', COUNT(*) FROM _prisma_migrations;"
```

All 7 Prisma migrations will show as already applied — `scripts/start.js` runs `prisma migrate deploy` on startup and prints _"No pending migrations to apply"_.

---

### Start the Stack

```bash
cd /opt/kibaruani
docker-compose --env-file .env.docker up -d
```

Check container health:

```bash
docker-compose ps
# All three containers should show (healthy)
```

Tail logs:

```bash
docker-compose logs -f backend
```

---

### Reverse Proxy — Caddy (Recommended)

Edit `Caddyfile` and replace `yourdomain.com` with your real domain:

```bash
sed -i 's/yourdomain\.com/example.com/g' Caddyfile
```

Start Caddy (Caddy auto-provisions Let's Encrypt TLS):

```bash
caddy run --config Caddyfile --adapter caddyfile
```

Or run as a systemd service (recommended for production):

```bash
# Copy Caddyfile to Caddy's default config location
cp Caddyfile /etc/caddy/Caddyfile
systemctl enable --now caddy
systemctl status caddy
```

**Caddy handles WebSocket upgrades automatically** — no extra configuration needed for `/ws*` paths.

#### Nginx Alternative

If Nginx is already installed, use `nginx/nginx.conf` instead:

```bash
# Install Certbot TLS cert first
certbot --nginx -d api.yourdomain.com

# Copy config and reload
cp nginx/nginx.conf /etc/nginx/sites-available/kibaruani
ln -s /etc/nginx/sites-available/kibaruani /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

> Add the `map $http_upgrade $connection_upgrade { default upgrade; '' close; }` block to the top-level `http {}` section of `/etc/nginx/nginx.conf` to enable WebSocket upgrades.

---

### Vercel Frontend Cutover (Phase 6)

1. **In Vercel Dashboard** → Project Settings → Environment Variables → Production:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` |
   | `NEXT_PUBLIC_SITE_URL` | `https://portal.yourdomain.com` |
   | `NEXT_PUBLIC_PROJECT_NAME` | `Qonnect WiFi` |

2. **Trigger a new Vercel deployment** (push a commit or click "Redeploy" in the dashboard). Vercel bakes `NEXT_PUBLIC_*` values into the client bundle at build time — the existing deployment still uses the old values until redeployed.

3. **Verify** WebSocket connects to `wss://api.yourdomain.com/ws` (check browser DevTools → Network → WS tab on the admin dashboard).

---

### End-to-End Cutover Checklist

Run through these steps in order when going live:

```
[ ] 1.  Enable maintenanceMode on the existing DB (admin dashboard → Settings)
[ ] 2.  Run final mysqldump on old host → upload to VPS backups/
[ ] 3.  docker cp dump into kibaruani-mysql → restore → verify row counts
[ ] 4.  Confirm _prisma_migrations = 7 and all applied
[ ] 5.  Update DNS: api.yourdomain.com A → <VPS IP>  (TTL flush: ~5 min)
[ ] 6.  docker-compose --env-file .env.docker up -d  (all three containers)
[ ] 7.  caddy run --config Caddyfile  (or systemctl restart caddy)
[ ] 8.  curl https://api.yourdomain.com/healthz
        → {"status":"ok"}
[ ] 9.  curl https://api.yourdomain.com/
        → {"success":true,"dependencies":{"database":"ok","redis":"ok"}}
[ ] 10. Redeploy Vercel frontend (triggers rebuild with new NEXT_PUBLIC_API_URL)
[ ] 11. Test admin login → JWT cookie set on api.yourdomain.com
[ ] 12. Test WebSocket dashboard → real-time updates flowing
[ ] 13. Test M-Pesa STK Push → callback hits api.yourdomain.com/mpesa/callback
[ ] 14. Test voucher generation and MikroTik whitelist sync
[ ] 15. Disable maintenanceMode
```

---

### Health Verification

```bash
# Backend health (from VPS host or external)
curl https://api.yourdomain.com/healthz
# → {"status":"ok"}

curl https://api.yourdomain.com/
# → {"success":true,"status":"healthy","dependencies":{"database":"ok","redis":"ok"}}

# Container status
docker-compose ps

# Redis queue keys
docker exec kibaruani-redis redis-cli KEYS "bull:*"

# MySQL row counts
docker exec kibaruani-mysql mysql -u kibaruani -p"$DB_PASSWORD" wifi_billing \
  -e "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema='wifi_billing';"
```

---

### Maintenance Commands

```bash
# View real-time backend logs
docker-compose logs -f backend

# Restart only the backend (zero MySQL/Redis downtime)
docker-compose restart backend

# Open a shell inside the backend container
docker exec -it kibaruani-backend sh

# Open MySQL shell as app user
docker exec -it kibaruani-mysql mysql -u kibaruani -p

# Open MySQL shell as root (interactive prompt — do not embed password)
docker exec -it kibaruani-mysql mysql -u root -p

# Inspect Redis
docker exec -it kibaruani-redis redis-cli

# Stop the full stack (data volumes are preserved)
docker-compose down

# Stop and destroy all volumes (⚠️ DATA LOSS — only for a clean reset)
docker-compose down -v

# Pull the latest image and redeploy backend
docker-compose --env-file .env.docker build backend
docker-compose --env-file .env.docker up -d backend
```

---

### Rollback Strategy

If the Docker deployment fails and you need to revert to the previous PM2-based setup:

```bash
# 1. Stop Docker stack
docker-compose down

# 2. Restore original .env (non-Docker)
#    DATABASE_URL should point to localhost:3306 (host MySQL)

# 3. Start backend with PM2 as before
npm run pm2:start

# 4. Revert Vercel env var NEXT_PUBLIC_API_URL back to previous value
#    and redeploy from Vercel dashboard

# 5. Update DNS if changed
```

> The MySQL data volume (`kibaruani_mysql_data`) is **not destroyed** by `docker-compose down` — your data is safe. Only `docker-compose down -v` removes volumes.

---

## Call for Collaboration

This project is open to contributions! If you want to help, please:

- open issues for bugs or missing features
- submit pull requests with fixes or improvements
- improve UI/UX for the admin dashboard
- optimize payment workers, callback handling, or Redis queue flow
- harden security around admin auth and M-Pesa callbacks

### Suggested contribution workflow

1. Fork the repository
2. Create a feature branch
3. Make focused changes
4. Submit a PR with a clear description of the problem and fix

Your help is welcome — especially for better documentation, more robust testing, and cleaner deployment flows.


#


## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.






***📞 CONTACT***

For inquiries & support, reach out via: 

*(Paid Consultations)* only

📧 Email: gideonpapa9@gmail.com

📱 WhatsApp: https://wa.me/254756521055
