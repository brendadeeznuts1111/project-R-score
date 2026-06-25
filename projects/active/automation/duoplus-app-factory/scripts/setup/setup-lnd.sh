#!/bin/bash
# DuoPlus Lightning Node Setup Script
# Ubuntu 22.04 LTS - Production Ready

set -e

echo "🚀 Setting up LND Lightning Node for DuoPlus v3.5"
echo "================================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root or with sudo"
  exit 1
fi

# System updates
echo "📦 Updating system..."
apt update && apt upgrade -y

# Install dependencies
echo "🔧 Installing dependencies..."
apt install -y \
  software-properties-common \
  build-essential \
  curl \
  wget \
  git \
  unzip \
  tar \
  jq \
  sqlite3 \
  python3 \
  python3-pip

# Install Go 1.21+
echo "🐹 Installing Go 1.21..."
cd /tmp
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
rm -rf /usr/local/go
tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
go version

# Create lnd user
echo "👤 Creating lnd user..."
if ! id "lnd" &>/dev/null; then
  useradd -r -m -s /bin/bash lnd
fi

# Install LND
echo "⚡ Installing LND v0.17.3-beta..."
cd /home/lnd
sudo -u lnd git clone https://github.com/lightningnetwork/lnd.git
cd lnd
sudo -u lnd git checkout v0.17.3-beta
sudo -u lnd make install

# Create LND data directory
echo "📁 Creating data directories..."
mkdir -p /home/lnd/.lnd
chown -R lnd:lnd /home/lnd/.lnd

# Generate LND configuration
echo "⚙️ Generating LND config..."
cat > /home/lnd/.lnd/lnd.conf << 'EOF'
# DuoPlus Lightning Configuration
[Application Options]
debuglevel=info
maxpendingchannels=5
alias=DuoPlus-Family-Node
color=#FF6B35

[Bitcoin]
bitcoin.active=1
bitcoin.testnet=1
bitcoin.node=bitcoind

[Bitcoind]
bitcoind.rpchost=localhost
bitcoind.rpcuser=duoplus
bitcoind.rpcpass=duoplus123
bitcoind.zmqpubrawblock=tcp://127.0.0.1:28332
bitcoind.zmqpubrawtx=tcp://127.0.0.1:28333

[tor]
tor.active=true
tor.v3=true
tor.streamisolation=true

[protocol]
protocol.wumbo-channels=true

[db]
db.backend=sqlite
db.sqlite.timeout=60s
EOF

chown lnd:lnd /home/lnd/.lnd/lnd.conf

# Install bitcoind (for testnet)
echo "🔗 Installing Bitcoin Core (testnet)..."
cd /tmp
wget https://bitcoincore.org/bin/bitcoin-core-25.1/bitcoin-25.1-x86_64-linux-gnu.tar.gz
tar -xzf bitcoin-25.1-x86_64-linux-gnu.tar.gz
cp bitcoin-25.1/bin/bitcoind /usr/local/bin/
cp bitcoin-25.1/bin/bitcoin-cli /usr/local/bin/

# Create bitcoind config
echo "⚙️ Creating bitcoind config..."
mkdir -p /home/lnd/.bitcoin
cat > /home/lnd/.bitcoin/bitcoin.conf << 'EOF'
testnet=1
server=1
rpcuser=duoplus
rpcpassword=duoplus123
rpcallowip=127.0.0.1
zmqpubrawblock=tcp://127.0.0.1:28332
zmqpubrawtx=tcp://127.0.0.1:28333
txindex=1
fallbackfee=0.0001
EOF

chown -R lnd:lnd /home/lnd/.bitcoin

# Create systemd service for LND
echo "🔧 Creating systemd service..."
cat > /etc/systemd/system/lnd.service << 'EOF'
[Unit]
Description=LND Lightning Network Daemon
After=network.target

[Service]
Type=simple
User=lnd
Group=lnd
ExecStart=/usr/local/bin/lnd --lnddir=/home/lnd/.lnd
Restart=always
RestartSec=30
TimeoutStopSec=600

[Install]
WantedBy=multi-user.target
EOF

# Create systemd service for bitcoind
cat > /etc/systemd/system/bitcoind.service << 'EOF'
[Unit]
Description=Bitcoin Core Daemon
After=network.target

[Service]
Type=simple
User=lnd
Group=lnd
ExecStart=/usr/local/bin/bitcoind -datadir=/home/lnd/.bitcoin
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
echo "🚀 Starting services..."
systemctl daemon-reload
systemctl enable bitcoind
systemctl enable lnd

# Start bitcoind first (LND needs it)
echo "⏳ Starting bitcoind (syncing testnet - this may take a while)..."
systemctl start bitcoind
sleep 5

# Check if bitcoind is running
if systemctl is-active --quiet bitcoind; then
  echo "✅ bitcoind is running"
else
  echo "❌ bitcoind failed to start"
  journalctl -u bitcoind -n 50 --no-pager
  exit 1
fi

# Start LND
echo "⏳ Starting LND..."
systemctl start lnd
sleep 5

# Check if LND is running
if systemctl is-active --quiet lnd; then
  echo "✅ LND is running"
else
  echo "❌ LND failed to start"
  journalctl -u lnd -n 50 --no-pager
  exit 1
fi

# Wait for LND to initialize
echo "⏳ Waiting for LND to initialize..."
sleep 10

# Create macaroon and TLS cert symlinks for easy access
echo "🔑 Setting up access credentials..."
sudo -u lnd ln -sf /home/lnd/.lnd/data/chain/bitcoin/testnet/admin.macaroon /home/lnd/admin.macaroon
sudo -u lnd ln -sf /home/lnd/.lnd/tls.cert /home/lnd/tls.cert

# Make credentials readable for DuoPlus app
chmod 644 /home/lnd/.lnd/tls.cert
chmod 644 /home/lnd/.lnd/data/chain/bitcoin/testnet/admin.macaroon

# Generate base64 macaroon for .env
MACAROON_BASE64=$(sudo -u lnd base64 /home/lnd/.lnd/data/chain/bitcoin/testnet/admin.macaroon 2>/dev/null)
TLS_CERT_PATH="/home/lnd/.lnd/tls.cert"

echo ""
echo "📋 LND Setup Complete!"
echo "================================================"
echo "REST Endpoint: https://localhost:8080"
echo "GRPC Endpoint: localhost:10009"
echo "TLS Cert: $TLS_CERT_PATH"
echo "Macaroon (base64): $MACAROON_BASE64"
echo ""
echo "Add these to your .env file:"
echo ""
echo "LND_REST_URL=https://localhost:8080"
echo "LND_MACAROON=$MACAROON_BASE64"
echo "LND_TLS_CERT_PATH=$TLS_CERT_PATH"
echo "LND_GRPC_PORT=10009"
echo ""
echo "To check LND status: systemctl status lnd"
echo "To view LND logs: journalctl -u lnd -f"
echo "To create wallet: lncli --lnddir=/home/lnd/.lnd create"
echo ""
echo "⚠️  IMPORTANT: Backup your macaroon and TLS cert!"
echo "   Without these, you cannot access your node."
echo "================================================"

# Create a helper script for wallet creation
cat > /home/lnd/create-wallet.sh << 'EOF'
#!/bin/bash
echo "🔐 Creating LND Wallet"
echo "Run this once to initialize your Lightning wallet"
sudo -u lnd lncli --lnddir=/home/lnd/.lnd create
EOF
chmod +x /home/lnd/create-wallet.sh
chown lnd:lnd /home/lnd/create-wallet.sh

# Create info script
cat > /home/lnd/node-info.sh << 'EOF'
#!/bin/bash
echo "📊 LND Node Information"
echo "======================"
sudo -u lnd lncli --lnddir=/home/lnd/.lnd getinfo 2>/dev/null || echo "Wallet not initialized yet. Run: /home/lnd/create-wallet.sh"
EOF
chmod +x /home/lnd/node-info.sh
chown lnd:lnd /home/lnd/node-info.sh

echo ""
echo "✅ Setup complete! You can now:"
echo "1. Create wallet: sudo -u lnd /home/lnd/create-wallet.sh"
echo "2. Check node info: sudo -u lnd /home/lnd/node-info.sh"
echo "3. Start using DuoPlus Lightning v3.5!"