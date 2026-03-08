#!/bin/bash
set -e
echo -e "\033[34m"
echo "  ⚡ AutoRecon Tool Installer"
echo "  ────────────────────────────"
echo -e "\033[0m"

# System packages
echo -e "\033[34m[*] Installing system packages...\033[0m"
sudo apt-get update -qq
sudo apt-get install -y nmap gobuster whatweb whois dnsutils wafw00f curl git python3-pip golang-go libssl-dev 2>/dev/null || {
    echo -e "\033[33m[!] Some packages may need manual install on non-Debian systems\033[0m"
}

# Python tools
echo -e "\033[34m[*] Installing Python tools...\033[0m"
pip3 install theHarvester wafw00f --break-system-packages 2>/dev/null || pip3 install theHarvester wafw00f

# Go tools
echo -e "\033[34m[*] Installing Go tools...\033[0m"
export GOPATH="$HOME/go"
export PATH="$PATH:$GOPATH/bin"

go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install github.com/projectdiscovery/httpx/cmd/httpx@latest
go install github.com/projectdiscovery/dnsx/cmd/dnsx@latest
go install github.com/projectdiscovery/amass/v4/...@latest
go install github.com/sensepost/gowitness@latest

# Update nuclei templates
echo -e "\033[34m[*] Updating nuclei templates...\033[0m"
nuclei -update-templates 2>/dev/null || true

# testssl.sh
if ! command -v testssl.sh &>/dev/null; then
    echo -e "\033[34m[*] Installing testssl.sh...\033[0m"
    git clone --depth 1 https://github.com/drwetter/testssl.sh.git ~/.local/testssl.sh 2>/dev/null || true
    ln -sf ~/.local/testssl.sh/testssl.sh ~/.local/bin/testssl.sh 2>/dev/null || true
fi

# Add Go bin to PATH
grep -q 'GOPATH/bin' ~/.bashrc 2>/dev/null || echo 'export PATH=$PATH:$(go env GOPATH)/bin' >> ~/.bashrc

echo ""
echo -e "\033[32m  ✓ All tools installed!\033[0m"
echo -e "\033[34m  Run 'source ~/.bashrc' to update PATH\033[0m"
