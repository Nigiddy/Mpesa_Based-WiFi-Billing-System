#!/usr/bin/env bash
# =============================================================================
# deploy/vps-setup.sh — One-time Linux VPS setup for Qonnect WiFi (Docker)
# =============================================================================
#
# PURPOSE
#   Installs Docker, docker-compose, and Caddy on a fresh Ubuntu/Debian VPS,
#   then copies the application files and prepares the runtime environment.
#
# USAGE
#   1. Upload this script and the project to the VPS:
#        rsync -avz --exclude '.git' --exclude 'node_modules' \
#              --exclude 'frontend/.next' --exclude 'backups' \
#              ./ root@<VPS_IP>:/opt/kibaruani/
#
#   2. SSH into the VPS and run:
#        chmod +x /opt/kibaruani/deploy/vps-setup.sh
#        /opt/kibaruani/deploy/vps-setup.sh
#
# REQUIREMENTS
#   - Ubuntu 22.04 LTS or Debian 12 (amd64)
#   - Run as root (or a sudoer with NOPASSWD)
#   - Outbound internet access on the VPS
#
# WHAT IT DOES
#   1. Updates system packages
#   2. Installs Docker Engine + docker-compose (standalone v2 binary)
#   3. Installs Caddy stable
#   4. Creates /opt/kibaruani working directory
#   5. Opens firewall ports 80, 443 (UFW)
#   6. Prints next steps
#
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERR]${NC}   $*"; exit 1; }

APP_DIR="/opt/kibaruani"
COMPOSE_VERSION="2.27.1"   # https://github.com/docker/compose/releases

# ── 0. Preflight ──────────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || error "Run as root or with sudo."
command -v apt-get &>/dev/null || error "This script requires a Debian/Ubuntu system."

info "Starting Qonnect WiFi VPS setup…"

# ── 1. System update ──────────────────────────────────────────────────────────
info "Updating system packages…"
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl ca-certificates gnupg lsb-release ufw

# ── 2. Docker Engine ──────────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
    info "Docker already installed: $(docker --version)"
else
    info "Installing Docker Engine…"
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" \
      | tee /etc/apt/sources.list.d/docker.list >/dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io

    systemctl enable --now docker
    info "Docker installed: $(docker --version)"
fi

# ── 3. docker-compose (standalone binary) ─────────────────────────────────────
if command -v docker-compose &>/dev/null; then
    info "docker-compose already installed: $(docker-compose --version)"
else
    info "Installing docker-compose v${COMPOSE_VERSION}…"
    curl -fsSL \
        "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
        -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    info "docker-compose installed: $(docker-compose --version)"
fi

# ── 4. Caddy ─────────────────────────────────────────────────────────────────
if command -v caddy &>/dev/null; then
    info "Caddy already installed: $(caddy version)"
else
    info "Installing Caddy…"
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
        | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    echo \
        "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] \
        https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" \
        | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
    apt-get update -qq
    apt-get install -y -qq caddy
    info "Caddy installed: $(caddy version)"
fi

# ── 5. Caddy log directory ────────────────────────────────────────────────────
mkdir -p /var/log/caddy
chown caddy:caddy /var/log/caddy 2>/dev/null || chown root:root /var/log/caddy

# ── 6. App working directory ──────────────────────────────────────────────────
info "Ensuring app directory exists: ${APP_DIR}"
mkdir -p "${APP_DIR}"

# ── 7. UFW firewall ───────────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
    info "Configuring UFW firewall…"
    ufw allow OpenSSH   || true
    ufw allow 80/tcp    || true   # HTTP (ACME challenge + captive portal)
    ufw allow 443/tcp   || true   # HTTPS
    # Port 5000 is NOT opened — backend is only reachable via Caddy on 127.0.0.1
    ufw --force enable
    ufw status verbose
else
    warn "UFW not found — configure your firewall manually."
    warn "Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS). Keep 3306, 6379, 5000 closed."
fi

# ── 8. Summary & next steps ───────────────────────────────────────────────────
cat <<EOF

${GREEN}════════════════════════════════════════════════════════════════${NC}
${GREEN}  VPS setup complete!${NC}
${GREEN}════════════════════════════════════════════════════════════════${NC}

Next steps (run from ${APP_DIR}):

1. Create production environment file:
   cp .env.docker.example .env.docker
   nano .env.docker
   # Set NODE_ENV=production, real DB/Redis passwords, JWT secrets,
   # FRONTEND_ORIGIN, MPESA_CALLBACK_URL, MIKROTIK_* values.

2. Generate strong secrets (run once per value):
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

3. Update Caddyfile with your real domain:
   sed -i 's/yourdomain\.com/example.com/g' Caddyfile

4. Migrate existing MySQL data:
   # On old host: mysqldump --single-transaction --no-tablespaces \\
   #              -u wifiadmin -p wifi_billing > backup.sql
   # On VPS: docker-compose --env-file .env.docker up -d mysql
   #         docker cp backup.sql kibaruani-mysql:/tmp/dump.sql
   #         docker exec kibaruani-mysql sh -c \\
   #           'mysql -u kibaruani -p\$MYSQL_PASSWORD wifi_billing < /tmp/dump.sql'

5. Start the full stack:
   docker-compose --env-file .env.docker up -d

6. Start Caddy:
   caddy run --config Caddyfile --adapter caddyfile &
   # Or as a systemd service: systemctl enable --now caddy

7. Verify:
   curl https://api.yourdomain.com/healthz
   # Expected: {"status":"ok"}

8. Point Vercel to the new API:
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   (Vercel Dashboard → Project Settings → Environment Variables → Redeploy)

${YELLOW}Remember:${NC}
  - Never commit .env.docker (it's in .gitignore)
  - MySQL and Redis are NOT exposed on host ports (internal Docker network only)
  - Use 'docker-compose logs -f backend' to tail backend logs
  - Use 'docker exec -it kibaruani-mysql mysql -u root -p' for DB root access

EOF
