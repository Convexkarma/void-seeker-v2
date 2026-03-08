# ⚡ AutoRecon

**Automated reconnaissance and vulnerability scanning platform** with a real-time dashboard, modular tool orchestration, and report generation.

AutoRecon streamlines the recon phase of security assessments by running industry-standard tools (Nmap, Subfinder, Nuclei, etc.) through a unified interface, collecting results into a searchable dashboard with exportable reports.

---

## ✨ Features

- 🔍 **Modular Scanning** — Run subdomain enumeration, port scanning, vulnerability detection, WAF fingerprinting, SSL analysis, and more
- 📡 **Real-Time Terminal** — Live WebSocket feed of tool output as scans progress
- 📊 **Results Dashboard** — Aggregated findings with severity breakdowns, charts, and filterable tables
- 📜 **Report Generation** — Export results as PDF, HTML, JSON, or Markdown
- 🕘 **Scan History** — Browse, compare, and reload past scans
- 📱 **Responsive UI** — Fully adaptive layout for desktop, tablet, and mobile
- 🎯 **Demo Mode** — Works without the backend for UI exploration with simulated data

---

## 🏗 Architecture

```
┌──────────────────────────────┐
│  React Frontend (Vite)       │  ← Dashboard, config, terminal
│  Port 5173                   │
└──────────┬───────────────────┘
           │ REST + WebSocket
┌──────────▼───────────────────┐
│  Python Backend (FastAPI)    │  ← Orchestrates tools, stores results
│  Port 8000                   │
└──────────┬───────────────────┘
           │ subprocess
┌──────────▼───────────────────┐
│  Security Tools              │  ← Nmap, Subfinder, Nuclei, etc.
└──────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18 — [Install via nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **Python** ≥ 3.10
- **Security tools** (optional, for live scanning)

### 1. Clone & Install Frontend

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
```

### 2. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Install Security Tools (Linux/Debian)

```bash
chmod +x backend/setup.sh
./backend/setup.sh
source ~/.bashrc
```

This installs: `nmap`, `subfinder`, `nuclei`, `httpx`, `gobuster`, `whatweb`, `whois`, `wafw00f`, `testssl.sh`, `gowitness`, and more.

### 4. Run Everything

**Option A — One command:**

```bash
chmod +x backend/start.sh
./backend/start.sh
```

**Option B — Manual (two terminals):**

```bash
# Terminal 1: Backend
cd backend
uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend
npm run dev
```

Then open **http://localhost:5173**.

---

## 🎮 Usage

1. Enter a target domain in the config panel
2. Select which modules to run (subdomains, ports, vulns, etc.)
3. Click **Start Scan** — watch real-time output in the terminal panel
4. Review aggregated results in the dashboard tabs
5. Export a report in your preferred format

> **Demo Mode:** If the backend is offline, the app runs with simulated data so you can explore the UI.

---

## 🛡 Scanning Modules

| Module | Tool | Description |
|--------|------|-------------|
| Subdomains | Subfinder, Amass | Enumerate subdomains |
| Port Scan | Nmap | Discover open ports and services |
| Vulnerabilities | Nuclei | Template-based vulnerability detection |
| Web Tech | WhatWeb, Wappalyzer | Identify web technologies |
| WAF Detection | wafw00f | Fingerprint web application firewalls |
| SSL/TLS | testssl.sh | Analyze SSL/TLS configuration |
| DNS | dnsx, whois | DNS records and WHOIS lookup |
| Screenshots | Gowitness | Capture webpage screenshots |
| Directories | Gobuster | Brute-force directories and files |

---

## 📁 Project Structure

```
├── backend/              # Python FastAPI backend
│   ├── main.py           # API routes & WebSocket endpoints
│   ├── scanner.py        # Tool orchestration & subprocess management
│   ├── parser.py         # Tool output parsing
│   ├── db.py             # SQLite scan storage
│   ├── report.py         # Report generation (PDF/HTML/MD/JSON)
│   ├── terminal.py       # PTY-based terminal WebSocket
│   ├── setup.sh          # Tool installer script
│   ├── start.sh          # One-command launcher
│   └── requirements.txt  # Python dependencies
├── src/                  # React frontend
│   ├── components/       # UI components (Navbar, Dashboard, etc.)
│   ├── hooks/            # Custom hooks (useScan, useBackend)
│   ├── data/             # Mock data & scan simulation
│   └── pages/            # Route pages
└── public/               # Static assets
```

---

## ⚙️ Configuration

Access settings via the gear icon in the navbar:

- **Threads** — Parallel scan threads
- **Wordlist** — Custom wordlist for directory brute-forcing
- **Proxy** — Route traffic through a proxy
- **Stealth Mode** — Rate-limited scanning to reduce detection

---

## 📝 License

This project is for **authorized security testing only**. Always obtain proper permission before scanning any target. The authors are not responsible for misuse.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Python, FastAPI, SQLite, WebSockets |
| Tools | Nmap, Subfinder, Nuclei, Gobuster, WhatWeb, and more |
