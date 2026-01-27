# Oracle Cloud Free Tier - Complete Deployment Guide

> **Get 4 OCPU, 24GB RAM, 200GB Storage - FREE FOREVER (not a trial!)**

This guide walks you through deploying applications on Oracle Cloud's Always Free Tier A1 instances. The biggest challenge? A1 instances are incredibly popular, so you'll often see "Out of host capacity" errors. This guide includes auto-retry scripts that keep trying until an instance becomes available.

---

## Table of Contents

1. [What You Get (Free Forever)](#1-what-you-get-free-forever)
2. [Prerequisites](#2-prerequisites)
3. [Phase 1: Oracle Cloud Account Setup](#3-phase-1-oracle-cloud-account-setup)
4. [Phase 2: Install & Configure OCI CLI](#4-phase-2-install--configure-oci-cli)
5. [Phase 3: Generate SSH Keys](#5-phase-3-generate-ssh-keys)
6. [Phase 4: Create A1 Instance (Auto-Retry Script)](#6-phase-4-create-a1-instance-auto-retry-script)
7. [Phase 5: Configure Firewall](#7-phase-5-configure-firewall)
8. [Phase 6: Install Docker](#8-phase-6-install-docker)
9. [Phase 7: Deploy Your Application](#9-phase-7-deploy-your-application)
10. [Phase 8: Setup SSL with Let's Encrypt](#10-phase-8-setup-ssl-with-lets-encrypt)
11. [Phase 9: Setup Monitoring (Grafana + Prometheus)](#11-phase-9-setup-monitoring-grafana--prometheus)
12. [Phase 10: Automated Backups](#12-phase-10-automated-backups)
13. [Troubleshooting](#13-troubleshooting)
14. [Pro Tips](#14-pro-tips)

---

## 1. What You Get (Free Forever)

| Resource | Specification | Monthly Value |
|----------|---------------|---------------|
| **Ampere A1 Compute** | 4 OCPU (ARM64), 24GB RAM | ~$50-80 |
| **Block Storage** | 200GB SSD | ~$20 |
| **Object Storage** | 10GB (for backups) | ~$2 |
| **Bandwidth** | 10TB egress/month | ~$100+ |
| **Total** | **Always Free** | **$0/month** |

This is NOT a trial. These resources are free forever as long as you use them.

### Live Example

> **[tredye.com](https://tredye.com/)** - A production application running entirely on Oracle Cloud Free Tier A1 instance. Proof that this setup works great for MVPs, side projects, and early-stage startups without spending a single dollar on infrastructure.

---

## 2. Prerequisites

Before starting, ensure you have:

- [ ] A computer with terminal access (Linux, Mac, or Windows with WSL)
- [ ] An email address for Oracle account
- [ ] A credit/debit card for verification (charged ~$1-2, then refunded)
- [ ] Basic familiarity with command line

---

## 3. Phase 1: Oracle Cloud Account Setup

### Step 1.1: Create Oracle Cloud Account

1. Go to [https://cloud.oracle.com](https://cloud.oracle.com)
2. Click **"Sign Up"** or **"Start for free"**
3. Select your **Home Region** (choose closest to you):
   - India: `ap-mumbai-1` (Mumbai) or `ap-hyderabad-1` (Hyderabad)
   - US: `us-ashburn-1` (Ashburn) or `us-phoenix-1` (Phoenix)
   - Europe: `eu-frankfurt-1` (Frankfurt) or `uk-london-1` (London)

> **Important**: You CANNOT change your home region later. A1 instances are only available in your home region.

### Step 1.2: Complete Verification

1. Verify your email address
2. Verify your phone number
3. Add a payment method (credit/debit card)
4. You'll see a small verification charge (~$1-2) - this gets refunded

### Step 1.3: Wait for Account Activation

- Usually takes 5-30 minutes
- You'll receive an email when your account is ready
- Sign in to the OCI Console to verify

---

## 4. Phase 2: Install & Configure OCI CLI

The OCI CLI is required to programmatically create instances.

### Step 2.1: Install OCI CLI

**Linux/Mac:**
```bash
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"
```

**Windows (PowerShell as Admin):**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.ps1'))"
```

After installation, restart your terminal and verify:
```bash
oci --version
```

### Step 2.2: Get Your OCIDs from Console

Before configuring, gather these IDs from the OCI Console:

1. **User OCID**:
   - Click your profile icon (top right) → "User Settings"
   - Copy the OCID (starts with `ocid1.user...`)

2. **Tenancy OCID**:
   - Click your profile icon → "Tenancy: [name]"
   - Copy the OCID (starts with `ocid1.tenancy...`)

3. **Region Identifier**:
   - Look at the URL or top bar for your region
   - Example: `ap-mumbai-1`, `us-ashburn-1`

### Step 2.3: Configure OCI CLI

```bash
oci setup config
```

Follow the prompts:
```
Enter a location for your config [~/.oci/config]: (press Enter)
Enter a user OCID: ocid1.user.oc1..xxxxx (paste your User OCID)
Enter a tenancy OCID: ocid1.tenancy.oc1..xxxxx (paste your Tenancy OCID)
Enter a region: ap-mumbai-1 (or your region)
Do you want to generate a new API Signing RSA key pair? [Y/n]: Y
Enter a directory for your keys [~/.oci]: (press Enter)
Enter a name for your key [oci_api_key]: (press Enter)
```

### Step 2.4: Upload API Key to OCI Console

1. Go to OCI Console → Profile → "User Settings"
2. Click **"API Keys"** in the left menu
3. Click **"Add API Key"**
4. Select **"Paste Public Key"**
5. Paste the contents of `~/.oci/oci_api_key_public.pem`:
   ```bash
   cat ~/.oci/oci_api_key_public.pem
   ```
6. Click **"Add"**

### Step 2.5: Verify OCI CLI is Working

```bash
oci iam compartment list --all
```

If successful, you'll see JSON output with your compartments.

---

## 5. Phase 3: Generate SSH Keys

You need an SSH key pair to access your instance.

### Step 3.1: Generate SSH Key

```bash
# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Generate key pair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/oracle_key -N ""
```

This creates:
- `~/.ssh/oracle_key` - Private key (keep secret!)
- `~/.ssh/oracle_key.pub` - Public key (will be added to instance)

### Step 3.2: Verify Keys

```bash
ls -la ~/.ssh/oracle_key*
```

You should see both files.

---

## 6. Phase 4: Create A1 Instance (Auto-Retry Script)

This is the main script that handles the "Out of capacity" issue by automatically retrying.

### Step 4.1: Create the Script

Create a file called `oracle-a1-retry.sh`:

```bash
#!/bin/bash
################################################################################
# Oracle Cloud A1 Instance Auto-Provisioner
#
# Automatically retries until capacity is available.
# Auto-detects: Compartment, Availability Domain, Image, VCN, Subnet
# Auto-creates: VCN, Internet Gateway, Route Tables, Subnet (if missing)
#
# Usage: chmod +x oracle-a1-retry.sh && ./oracle-a1-retry.sh
################################################################################

set -e

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Instance Configuration (Free Tier Maximum)
INSTANCE_NAME="my-free-a1-instance"
OCPU_COUNT=4
MEMORY_GB=24
BOOT_VOLUME_SIZE_GB=200

# Retry Configuration
MAX_RETRIES=1000
RETRY_DELAY=30

# SSH Key Path (update if different)
SSH_KEY_PATH="${HOME}/.ssh/oracle_key.pub"

################################################################################
# Helper Functions
################################################################################

print_header() { echo -e "\n${BLUE}=== $1 ===${NC}"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}! $1${NC}"; }
print_info() { echo -e "${BLUE}→ $1${NC}"; }

################################################################################
# Step 1: Check Prerequisites
################################################################################

check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check OCI CLI
    if ! command -v oci &> /dev/null; then
        print_error "OCI CLI not installed!"
        echo ""
        echo "Install with:"
        echo "  Linux/Mac: bash -c \"\$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)\""
        echo "  Windows:   Use PowerShell install command"
        echo ""
        echo "Then configure: oci setup config"
        exit 1
    fi
    print_success "OCI CLI installed"

    # Check OCI config
    if [ ! -f "${HOME}/.oci/config" ]; then
        print_error "OCI CLI not configured!"
        echo "Run: oci setup config"
        exit 1
    fi
    print_success "OCI CLI configured"

    # Check SSH key
    if [ ! -f "$SSH_KEY_PATH" ]; then
        print_error "SSH key not found at $SSH_KEY_PATH"
        echo "Generate with: ssh-keygen -t rsa -b 4096 -f ~/.ssh/oracle_key"
        exit 1
    fi
    print_success "SSH key found"
}

################################################################################
# Step 2: Auto-Detect Configuration
################################################################################

auto_detect_config() {
    print_header "Auto-Detecting Configuration"

    # Get Compartment ID (root compartment)
    print_info "Finding compartment..."
    COMPARTMENT_ID=$(oci iam compartment list \
        --query "data[0].\"compartment-id\"" \
        --raw-output 2>/dev/null)

    if [ -z "$COMPARTMENT_ID" ]; then
        # Try tenancy as compartment
        COMPARTMENT_ID=$(oci iam compartment list \
            --query "data[0].id" \
            --raw-output 2>/dev/null)
    fi

    if [ -z "$COMPARTMENT_ID" ]; then
        print_error "Could not detect compartment ID"
        exit 1
    fi
    print_success "Compartment: ${COMPARTMENT_ID:0:30}..."

    # Get Availability Domain
    print_info "Finding availability domain..."
    AVAILABILITY_DOMAIN=$(oci iam availability-domain list \
        --compartment-id "$COMPARTMENT_ID" \
        --query "data[0].name" \
        --raw-output 2>/dev/null)

    if [ -z "$AVAILABILITY_DOMAIN" ]; then
        print_error "Could not detect availability domain"
        exit 1
    fi
    print_success "Availability Domain: $AVAILABILITY_DOMAIN"

    # Get Ubuntu 22.04 ARM64 Image
    print_info "Finding Ubuntu 22.04 ARM64 image..."
    IMAGE_ID=$(oci compute image list \
        --compartment-id "$COMPARTMENT_ID" \
        --operating-system "Canonical Ubuntu" \
        --operating-system-version "22.04" \
        --shape "VM.Standard.A1.Flex" \
        --query "data[0].id" \
        --raw-output 2>/dev/null)

    if [ -z "$IMAGE_ID" ]; then
        print_error "Could not find Ubuntu 22.04 ARM64 image"
        exit 1
    fi
    print_success "Image: ${IMAGE_ID:0:30}..."
}

################################################################################
# Step 3: Setup Networking (Auto-Create if Missing)
################################################################################

setup_networking() {
    print_header "Setting Up Networking"

    # Check for existing VCN
    print_info "Checking for existing VCN..."
    VCN_ID=$(oci network vcn list \
        --compartment-id "$COMPARTMENT_ID" \
        --query "data[0].id" \
        --raw-output 2>/dev/null || echo "")

    if [ -z "$VCN_ID" ]; then
        # Create VCN
        print_warning "No VCN found. Creating..."
        VCN_ID=$(oci network vcn create \
            --compartment-id "$COMPARTMENT_ID" \
            --cidr-block "10.0.0.0/16" \
            --display-name "free-tier-vcn" \
            --dns-label "freevcn" \
            --wait-for-state AVAILABLE \
            --query "data.id" \
            --raw-output)
        print_success "VCN created: ${VCN_ID:0:30}..."

        # Create Internet Gateway
        print_info "Creating Internet Gateway..."
        IGW_ID=$(oci network internet-gateway create \
            --compartment-id "$COMPARTMENT_ID" \
            --vcn-id "$VCN_ID" \
            --is-enabled true \
            --display-name "free-tier-igw" \
            --wait-for-state AVAILABLE \
            --query "data.id" \
            --raw-output)
        print_success "Internet Gateway created"

        # Update Route Table
        print_info "Configuring route table..."
        RT_ID=$(oci network route-table list \
            --compartment-id "$COMPARTMENT_ID" \
            --vcn-id "$VCN_ID" \
            --query "data[0].id" \
            --raw-output)
        oci network route-table update \
            --rt-id "$RT_ID" \
            --route-rules "[{\"destination\":\"0.0.0.0/0\",\"networkEntityId\":\"$IGW_ID\"}]" \
            --force > /dev/null
        print_success "Route table configured"

        # Create Security List (open necessary ports)
        print_info "Configuring security rules..."
        SL_ID=$(oci network security-list list \
            --compartment-id "$COMPARTMENT_ID" \
            --vcn-id "$VCN_ID" \
            --query "data[0].id" \
            --raw-output)
        oci network security-list update \
            --security-list-id "$SL_ID" \
            --ingress-security-rules '[
                {"protocol":"6","source":"0.0.0.0/0","tcpOptions":{"destinationPortRange":{"min":22,"max":22}}},
                {"protocol":"6","source":"0.0.0.0/0","tcpOptions":{"destinationPortRange":{"min":80,"max":80}}},
                {"protocol":"6","source":"0.0.0.0/0","tcpOptions":{"destinationPortRange":{"min":443,"max":443}}},
                {"protocol":"1","source":"0.0.0.0/0","icmpOptions":{"type":3,"code":4}},
                {"protocol":"1","source":"10.0.0.0/16","icmpOptions":{"type":3}}
            ]' \
            --egress-security-rules '[{"protocol":"all","destination":"0.0.0.0/0"}]' \
            --force > /dev/null
        print_success "Security rules configured (SSH, HTTP, HTTPS)"
    else
        print_success "Found existing VCN: ${VCN_ID:0:30}..."
    fi

    # Check for existing Subnet
    print_info "Checking for existing subnet..."
    SUBNET_ID=$(oci network subnet list \
        --compartment-id "$COMPARTMENT_ID" \
        --vcn-id "$VCN_ID" \
        --query "data[0].id" \
        --raw-output 2>/dev/null || echo "")

    if [ -z "$SUBNET_ID" ]; then
        # Create Subnet
        print_warning "No subnet found. Creating..."
        SUBNET_ID=$(oci network subnet create \
            --compartment-id "$COMPARTMENT_ID" \
            --vcn-id "$VCN_ID" \
            --cidr-block "10.0.1.0/24" \
            --display-name "free-tier-subnet" \
            --dns-label "freesub" \
            --wait-for-state AVAILABLE \
            --query "data.id" \
            --raw-output)
        print_success "Subnet created: ${SUBNET_ID:0:30}..."
    else
        print_success "Found existing subnet: ${SUBNET_ID:0:30}..."
    fi
}

################################################################################
# Step 4: Create Instance with Auto-Retry
################################################################################

create_instance_with_retry() {
    print_header "Creating A1 Instance (Auto-Retry)"

    echo ""
    print_warning "A1 instances are in HIGH DEMAND!"
    print_info "Script will keep retrying until capacity is available"
    print_info "Best time: 2-6 AM IST (instances expire, capacity frees up)"
    print_info "Press Ctrl+C to cancel anytime"
    echo ""

    local attempt=1

    while [ $attempt -le $MAX_RETRIES ]; do
        echo -e "${BLUE}[Attempt $attempt/$MAX_RETRIES]${NC} $(date '+%Y-%m-%d %H:%M:%S')"

        # Attempt to create instance
        RESULT=$(oci compute instance launch \
            --availability-domain "$AVAILABILITY_DOMAIN" \
            --compartment-id "$COMPARTMENT_ID" \
            --shape "VM.Standard.A1.Flex" \
            --shape-config "{\"ocpus\":$OCPU_COUNT,\"memoryInGBs\":$MEMORY_GB}" \
            --image-id "$IMAGE_ID" \
            --subnet-id "$SUBNET_ID" \
            --display-name "$INSTANCE_NAME" \
            --assign-public-ip true \
            --ssh-authorized-keys-file "$SSH_KEY_PATH" \
            --boot-volume-size-in-gbs $BOOT_VOLUME_SIZE_GB \
            --wait-for-state RUNNING \
            --query "data.id" \
            --raw-output 2>&1)

        if [ $? -eq 0 ]; then
            # SUCCESS!
            INSTANCE_ID="$RESULT"
            echo ""
            print_header "SUCCESS! Instance Created!"

            # Get instance details
            PUBLIC_IP=$(oci compute instance list-vnics \
                --instance-id "$INSTANCE_ID" \
                --query 'data[0]."public-ip"' \
                --raw-output)

            PRIVATE_IP=$(oci compute instance list-vnics \
                --instance-id "$INSTANCE_ID" \
                --query 'data[0]."private-ip"' \
                --raw-output)

            echo ""
            echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
            echo -e "${GREEN}║           INSTANCE CREATED SUCCESSFULLY!               ║${NC}"
            echo -e "${GREEN}╠════════════════════════════════════════════════════════╣${NC}"
            echo -e "${GREEN}║${NC} Instance Name: $INSTANCE_NAME"
            echo -e "${GREEN}║${NC} Public IP:     $PUBLIC_IP"
            echo -e "${GREEN}║${NC} Private IP:    $PRIVATE_IP"
            echo -e "${GREEN}║${NC} Shape:         VM.Standard.A1.Flex"
            echo -e "${GREEN}║${NC} CPUs:          $OCPU_COUNT OCPU (ARM64)"
            echo -e "${GREEN}║${NC} Memory:        ${MEMORY_GB} GB"
            echo -e "${GREEN}║${NC} Storage:       ${BOOT_VOLUME_SIZE_GB} GB"
            echo -e "${GREEN}║${NC} OS:            Ubuntu 22.04 LTS"
            echo -e "${GREEN}╠════════════════════════════════════════════════════════╣${NC}"
            echo -e "${GREEN}║${NC} SSH Command:"
            echo -e "${GREEN}║${NC}   ssh -i ~/.ssh/oracle_key ubuntu@$PUBLIC_IP"
            echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
            echo ""

            # Save to file
            cat > instance-details.txt <<EOF
Oracle Cloud A1 Instance Details
================================
Instance Name: $INSTANCE_NAME
Instance ID:   $INSTANCE_ID
Public IP:     $PUBLIC_IP
Private IP:    $PRIVATE_IP
Shape:         VM.Standard.A1.Flex ($OCPU_COUNT OCPU, ${MEMORY_GB}GB RAM)
Storage:       ${BOOT_VOLUME_SIZE_GB}GB
OS:            Ubuntu 22.04 LTS (ARM64)
Created:       $(date)

SSH Command:   ssh -i ~/.ssh/oracle_key ubuntu@$PUBLIC_IP
EOF
            print_success "Details saved to: instance-details.txt"

            return 0

        elif echo "$RESULT" | grep -q "Out of.*capacity\|NotAuthorizedOrNotFound"; then
            echo -e "  ${YELLOW}↳ Out of capacity. Retrying in ${RETRY_DELAY}s...${NC}"
            sleep $RETRY_DELAY
        else
            print_error "Unexpected error:"
            echo "$RESULT"
            return 1
        fi

        ((attempt++))
    done

    print_error "Failed after $MAX_RETRIES attempts"
    echo "Suggestions:"
    echo "  1. Try different availability domain"
    echo "  2. Try 2-6 AM IST (off-peak hours)"
    echo "  3. Try different region (Hyderabad instead of Mumbai)"
    return 1
}

################################################################################
# Main Execution
################################################################################

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Oracle Cloud A1 Free Tier Auto-Provisioner        ║${NC}"
    echo -e "${BLUE}║                                                        ║${NC}"
    echo -e "${BLUE}║  4 OCPU │ 24GB RAM │ 200GB Storage │ FREE FOREVER     ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""

    check_prerequisites
    auto_detect_config
    setup_networking
    create_instance_with_retry

    if [ $? -eq 0 ]; then
        echo ""
        print_header "Next Steps"
        echo "1. Wait 2-3 minutes for instance to fully boot"
        echo "2. SSH to your instance: ssh -i ~/.ssh/oracle_key ubuntu@$PUBLIC_IP"
        echo "3. Update system: sudo apt update && sudo apt upgrade -y"
        echo "4. Install Docker: curl -fsSL https://get.docker.com | sh"
        echo ""
        print_success "Enjoy your FREE cloud server!"
    fi
}

# Handle Ctrl+C gracefully
trap 'echo ""; print_warning "Cancelled by user"; exit 130' INT

# Run!
main
```

### Step 4.2: Run the Script

```bash
chmod +x oracle-a1-retry.sh
./oracle-a1-retry.sh
```

### Step 4.3: Let It Run

- The script will automatically retry every 30 seconds
- **Best time to run**: 2-6 AM IST (when instances expire and capacity frees up)
- Use `tmux` or `screen` so it keeps running if you disconnect:

```bash
# Install tmux
sudo apt install tmux

# Create session
tmux new -s oracle

# Run script
./oracle-a1-retry.sh

# Detach: Press Ctrl+B, then D
# Reattach later: tmux attach -t oracle
```

---

## 7. Phase 5: Configure Firewall

After your instance is created, configure the firewall to allow necessary traffic.

### Step 5.1: SSH to Your Instance

```bash
ssh -i ~/.ssh/oracle_key ubuntu@YOUR_PUBLIC_IP
```

### Step 5.2: Configure UFW (Ubuntu Firewall)

```bash
# Install UFW
sudo apt update
sudo apt install -y ufw

# Reset and configure
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow essential ports
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Allow application ports (optional)
sudo ufw allow 8000/tcp comment 'API'
sudo ufw allow 3000/tcp comment 'Grafana'
sudo ufw allow 9090/tcp comment 'Prometheus'

# Enable firewall
sudo ufw enable

# Verify
sudo ufw status numbered
```

---

## 8. Phase 6: Install Docker

Docker is essential for running containerized applications.

### Step 6.1: Quick Install (Recommended)

```bash
# One-line Docker install
curl -fsSL https://get.docker.com | sh

# Add your user to docker group
sudo usermod -aG docker $USER

# IMPORTANT: Log out and log back in for group changes
exit
```

### Step 6.2: SSH Back In and Verify

```bash
ssh -i ~/.ssh/oracle_key ubuntu@YOUR_PUBLIC_IP

# Verify Docker works
docker --version
docker run hello-world
```

### Step 6.3: Install Docker Compose

```bash
# Docker Compose is included with Docker, verify:
docker compose version
```

---

## 9. Phase 7: Deploy Your Application

### Step 9.1: Clone Your Repository

```bash
cd ~
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### Step 9.2: Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit with your values
nano .env
```

### Step 9.3: Build and Start Services

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

---

## 10. Phase 8: Setup SSL with Let's Encrypt

Get free HTTPS certificates for your domain.

### Step 10.1: Point Your Domain to the Server

In your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):

1. Create an **A Record**:
   - **Name**: `@` (or your subdomain like `app`)
   - **Value**: Your instance's Public IP
   - **TTL**: 300 (or auto)

2. Wait for DNS propagation (5-30 minutes):
   ```bash
   nslookup yourdomain.com
   ```

### Step 10.2: Install Nginx

```bash
sudo apt update
sudo apt install -y nginx

# Verify
sudo systemctl status nginx
```

### Step 10.3: Configure Nginx as Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/myapp
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Step 10.4: Install Certbot and Get SSL Certificate

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter your email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)
```

### Step 10.5: Verify SSL Auto-Renewal

```bash
# Test renewal process
sudo certbot renew --dry-run

# Certificates auto-renew via systemd timer
sudo systemctl status certbot.timer
```

---

## 11. Phase 9: Setup Monitoring (Grafana + Prometheus)

### Step 11.1: Create Monitoring Docker Compose File

Create `docker-compose.monitoring.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

### Step 11.2: Create Prometheus Config

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Step 11.3: Start Monitoring Stack

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

### Step 11.4: Access Grafana

1. Open: `http://YOUR_PUBLIC_IP:3000`
2. Login: `admin` / `admin`
3. Change password when prompted
4. Add Prometheus data source:
   - URL: `http://prometheus:9090`
5. Import dashboard ID `1860` for Node Exporter metrics

---

## 12. Phase 10: Automated Backups

### Step 12.1: Create Backup Script

Create `backup.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="${HOME}/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL (adjust container name)
echo "Backing up database..."
docker exec postgres pg_dump -U your_user your_database | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup important configs
echo "Backing up configs..."
cp ~/.env "$BACKUP_DIR/env_$DATE.bak" 2>/dev/null || true

# Cleanup old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.bak" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
```

### Step 12.2: Make It Executable

```bash
chmod +x backup.sh
```

### Step 12.3: Schedule Daily Backups with Cron

```bash
crontab -e
```

Add this line (runs daily at 2 AM):

```
0 2 * * * /home/ubuntu/backup.sh >> /home/ubuntu/backups/backup.log 2>&1
```

### Step 12.4: Upload to Oracle Object Storage (Optional)

```bash
# Create bucket
oci os bucket create --name my-backups --compartment-id YOUR_COMPARTMENT_ID

# Upload backup
oci os object put --bucket-name my-backups --file backup.sql.gz
```

---

## 13. Troubleshooting

### "Out of host capacity" Error

- **Solution**: Keep the retry script running
- **Best time**: 2-6 AM IST
- **Alternative**: Try Hyderabad region instead of Mumbai

### "NotAuthorizedOrNotFound" Error

- Check your OCI CLI configuration
- Verify API key is uploaded to OCI Console
- Ensure you're using the correct compartment ID

### Can't SSH to Instance

```bash
# Check if instance is running
oci compute instance get --instance-id YOUR_INSTANCE_ID | grep lifecycle

# Verify security list allows port 22
# Check UFW isn't blocking (from console)
```

### Docker Permission Denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# MUST log out and back in
exit
ssh -i ~/.ssh/oracle_key ubuntu@YOUR_IP
```

### SSL Certificate Failed

```bash
# Verify DNS is correctly pointing
dig yourdomain.com

# Ensure ports 80/443 are open in:
# 1. OCI Security List (cloud firewall)
# 2. UFW (OS firewall)

# Check Nginx config
sudo nginx -t
```

---

## 14. Pro Tips

### Best Times for Instance Creation

| Region | Best Time (Local) | Why |
|--------|-------------------|-----|
| Mumbai | 2-6 AM IST | Overnight instance expirations |
| US East | 2-6 AM EST | Same reason |
| Europe | 2-6 AM CET | Same reason |

### Optimize Your Instance

```bash
# Enable swap (useful for memory-intensive tasks)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Monitor Resource Usage

```bash
# Live monitoring
htop

# Disk usage
df -h

# Docker stats
docker stats
```

### Keep Instance from Being Reclaimed

Oracle may reclaim idle free tier instances. Keep them active:

```bash
# Add to crontab - runs every 6 hours
0 */6 * * * curl -s http://localhost:8000/health > /dev/null 2>&1
```

---

## Summary

| Phase | Time | Description |
|-------|------|-------------|
| 1 | 10 min | Create Oracle Cloud account |
| 2 | 10 min | Install & configure OCI CLI |
| 3 | 2 min | Generate SSH keys |
| 4 | 10 min - 24 hours | Run A1 instance retry script |
| 5 | 5 min | Configure firewall |
| 6 | 5 min | Install Docker |
| 7 | 10+ min | Deploy your application |
| 8 | 10 min | Setup SSL |
| 9 | 10 min | Setup monitoring |
| 10 | 5 min | Setup backups |

**Total**: ~1-2 hours (excluding A1 wait time)

---

## Cost Summary

| Resource | Monthly Cost |
|----------|--------------|
| 4 OCPU ARM64 | $0 |
| 24 GB RAM | $0 |
| 200 GB Storage | $0 |
| 10 TB Bandwidth | $0 |
| **Total** | **$0/month** |

**Equivalent value on other clouds**: $100-200/month

---

## Real-World Example

### [tredye.com](https://tredye.com/)

A production application running entirely on Oracle Cloud Free Tier:

| Aspect | Details |
|--------|---------|
| **Infrastructure** | Single A1 instance (4 OCPU, 24GB RAM) |
| **Stack** | Docker containers with Nginx reverse proxy |
| **SSL** | Let's Encrypt (auto-renewed) |
| **Cost** | $0/month |
| **Use Case** | MVP / Early-stage product |

This proves that Oracle Cloud Free Tier is production-ready for:
- MVPs and prototypes
- Side projects and hobby apps
- Early-stage startups
- Development and staging environments
- Learning and experimentation

**No credit card charges. No surprise bills. Just free compute.**

---

## Contributing

Found an issue or have improvements? Feel free to contribute!

---

**Happy deploying!** If this guide helped you, consider sharing it with others struggling with OCI capacity issues.

---

*Guide created with real-world experience deploying production applications on Oracle Cloud Free Tier.*
