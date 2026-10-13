#!/bin/bash
# ==============================================================================
# ALFRIANCLOUD ANDROID VPS — LINUX VPS RUNNER SETUP SCRIPT
# ==============================================================================
# Target OS: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS (x86_64 or ARM64)
# Run as: root (sudo bash setup-android-vps.sh)
#
# PURPOSE:
# Configures a dedicated or cloud VPS (Hetzner, OVH, Oracle Cloud, etc.)
# to host Android (Redroid) with kernel binder modules, persistent volume,
# and secure private connectivity to the ALFRIANCLOUD Railway Gateway.
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo "  ALFRIANCLOUD ANDROID VPS — VPS PROVISIONING"
echo "=========================================================="

# 1. System Updates & Kernel Headers
echo "[1/6] Updating package lists and installing kernel headers..."
apt-get update -y
apt-get install -y --no-install-recommends \
    linux-modules-extra-$(uname -r) \
    linux-headers-$(uname -r) \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    kmod \
    iptables \
    ufw \
    wireguard

# 2. Kernel Modules Check (Binder & Ashmem)
echo "[2/6] Configuring Android Binder kernel modules..."
# On Linux 5.15+ (Ubuntu 22.04+), binder is built-in or in linux-modules-extra
modprobe binder_linux devices="binder,hwbinder,vndbinder" || true
modprobe ashmem_linux || true

# Make module load persistent on reboot
cat <<EOF > /etc/modules-load.d/redroid.conf
binder_linux
ashmem_linux
EOF

# Verify /dev/binder devices
if [ -e "/dev/binder" ]; then
    echo "  -> SUCCESS: /dev/binder exists."
    chmod 666 /dev/binder /dev/hwbinder /dev/vndbinder
else
    echo "  -> WARNING: /dev/binder not found directly. Enabling binderfs..."
    mkdir -p /dev/binderfs
    mount -t binder binder /dev/binderfs || true
    cat <<EOF >> /etc/fstab
binder /dev/binderfs binder defaults 0 0
EOF
fi

# 3. Install Docker Engine if not installed
echo "[3/6] Installing Docker Engine..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm -f get-docker.sh
    systemctl enable --now docker
else
    echo "  -> Docker already installed."
fi

# 4. Create Persistent Storage Directory
echo "[4/6] Creating persistent volume for Android /data..."
mkdir -p /var/lib/alfrian-android/data
chmod 755 /var/lib/alfrian-android/data

# 5. Security & Firewall Hardening
# CRITICAL: Never expose port 5555 (ADB) to 0.0.0.0/0 on the public internet!
echo "[5/6] Hardening Firewall (blocking public ADB port 5555)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
# Allow ADB ONLY from private network or tunnel (e.g. 10.0.0.0/8 or WireGuard interface wg0)
ufw allow in on wg0 to any port 5555 comment 'Allow ADB on WireGuard VPN only' || true
ufw --force enable

# 6. Deploy Redroid Container
echo "[6/6] Launching Redroid container (Android 13.0)..."
docker pull redroid/redroid:13.0.0-latest

# Stop existing instance if present
docker stop alfrian-redroid 2>/dev/null || true
docker rm alfrian-redroid 2>/dev/null || true

# Run Redroid with proper permissions and binder mount
# Bound to 127.0.0.1 or private WireGuard IP to prevent public internet access
docker run -d \
    --name alfrian-redroid \
    --restart always \
    --privileged \
    -v /var/lib/alfrian-android/data:/data \
    -v /dev/binder:/dev/binder \
    -v /dev/hwbinder:/dev/hwbinder \
    -v /dev/vndbinder:/dev/vndbinder \
    -p 127.0.0.1:5555:5555 \
    redroid/redroid:13.0.0-latest \
    androidboot.redroid_width=720 \
    androidboot.redroid_height=1280 \
    androidboot.redroid_dpi=320 \
    androidboot.redroid_fps=30

echo "=========================================================="
echo "  PROVISIONING COMPLETE!"
echo "  Android is now running locally on 127.0.0.1:5555"
echo "  To bridge to your ALFRIANCLOUD Railway Gateway:"
echo "  Option A (WireGuard / Tailscale): Join both to your mesh VPN."
echo "  Option B (SSH Reverse Tunnel):"
echo "    ssh -N -R 5555:127.0.0.1:5555 user@railway-tunnel-host"
echo "=========================================================="
