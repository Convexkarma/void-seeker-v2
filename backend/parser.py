"""
Output parsers for every recon tool.
Each parser returns a structured dict from raw output lines and/or output files.
"""

import json
import re
import os
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional


# ── Risk classification ──────────────────────────────────────────────
HIGH_RISK_PORTS = {21, 22, 23, 25, 53, 445, 512, 513, 514, 1433, 1521,
                   2375, 2376, 3306, 3389, 4848, 5432, 5900, 5985,
                   6379, 9200, 9300, 11211, 27017, 50070}
MEDIUM_RISK_PORTS = {80, 8080, 8443, 8888, 110, 143, 161, 993, 995, 3000, 4000, 5000}

SENSITIVE_PATHS = {".git", ".env", ".htaccess", "admin", "wp-admin", "phpmyadmin",
                   "backup", "config", "api", "swagger", "graphql", "console",
                   "debug", "actuator", "upload", "tmp", "test", "phpinfo"}

DANGER_DESCRIPTIONS = {
    21: "FTP - Legacy protocol, cleartext credentials",
    22: "SSH - Remote access, brute force target",
    23: "Telnet - Cleartext protocol, highly dangerous",
    25: "SMTP - Mail relay, spam potential",
    53: "DNS - Zone transfer risk",
    445: "SMB - Lateral movement, ransomware vector",
    1433: "MSSQL - Database exposed",
    1521: "Oracle DB - Database exposed",
    2375: "Docker API - Unauthenticated container access",
    2376: "Docker TLS - Container management",
    3306: "MySQL - Database exposed to network",
    3389: "RDP - Remote desktop, brute force target",
    5432: "PostgreSQL - Database exposed",
    5900: "VNC - Remote desktop, often unauthed",
    5985: "WinRM - Windows remote management",
    6379: "Redis - In-memory DB, often unauthed",
    9200: "Elasticsearch - Data exposure",
    9300: "Elasticsearch transport",
    11211: "Memcached - Cache amplification",
    27017: "MongoDB - NoSQL, often unauthed",
    50070: "Hadoop NameNode - Big data exposure",
}


def _port_risk(port: int) -> str:
    if port in HIGH_RISK_PORTS:
        return "high"
    if port in MEDIUM_RISK_PORTS:
        return "medium"
    return "low"


# ── subfinder ────────────────────────────────────────────────────────
def parse_subfinder(scan_dir: str, lines: list[str], domain: str) -> dict:
    subs = set()
    # From output lines
    for line in lines:
        line = line.strip()
        if line and not line.startswith("["):
            subs.add(line.lower())
    # From file
    fpath = Path(scan_dir) / "subdomains_sf.txt"
    if fpath.exists():
        for line in fpath.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("["):
                subs.add(line.lower())
    return {"subdomains": sorted(subs), "count": len(subs)}


# ── amass ────────────────────────────────────────────────────────────
def parse_amass(scan_dir: str, lines: list[str], domain: str) -> dict:
    subs = set()
    for line in lines:
        line = line.strip()
        if line and not line.startswith("[") and "." in line:
            subs.add(line.lower())
    fpath = Path(scan_dir) / "subdomains_am.txt"
    if fpath.exists():
        for line in fpath.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("["):
                subs.add(line.lower())
    return {"subdomains": sorted(subs), "count": len(subs)}


# ── httpx ────────────────────────────────────────────────────────────
def parse_httpx(scan_dir: str, lines: list[str], domain: str) -> dict:
    hosts = []
    pattern = re.compile(r'^(https?://\S+)\s+\[(\d+)\]\s+\[([^\]]*)\]\s*(?:\[([^\]]*)\])?\s*(?:\[(\d+)\])?')
    for line in lines:
        m = pattern.match(line.strip())
        if m:
            url, status, title, tech, cl = m.groups()
            hosts.append({
                "url": url,
                "status": int(status),
                "title": title.strip(),
                "tech": [t.strip() for t in (tech or "").split(",") if t.strip()],
                "content_length": int(cl) if cl else 0,
            })
    # Also read file
    fpath = Path(scan_dir) / "live_hosts.txt"
    if fpath.exists():
        for line in fpath.read_text().splitlines():
            m = pattern.match(line.strip())
            if m and not any(h["url"] == m.group(1) for h in hosts):
                url, status, title, tech, cl = m.groups()
                hosts.append({
                    "url": url,
                    "status": int(status),
                    "title": title.strip(),
                    "tech": [t.strip() for t in (tech or "").split(",") if t.strip()],
                    "content_length": int(cl) if cl else 0,
                })
    return {"hosts": hosts, "count": len(hosts)}


# ── nmap ─────────────────────────────────────────────────────────────
def parse_nmap(scan_dir: str, lines: list[str], domain: str) -> dict:
    ports = []
    # Try XML first
    xml_path = Path(scan_dir) / "nmap.xml"
    if xml_path.exists():
        try:
            tree = ET.parse(str(xml_path))
            root = tree.getroot()
            for host in root.findall(".//host"):
                ip = ""
                addr = host.find("address")
                if addr is not None:
                    ip = addr.get("addr", "")
                for port_elem in host.findall(".//port"):
                    port_id = int(port_elem.get("portid", 0))
                    protocol = port_elem.get("protocol", "tcp")
                    state_elem = port_elem.find("state")
                    state = state_elem.get("state", "unknown") if state_elem is not None else "unknown"
                    service_elem = port_elem.find("service")
                    service = product = version = extrainfo = ""
                    if service_elem is not None:
                        service = service_elem.get("name", "")
                        product = service_elem.get("product", "")
                        version = service_elem.get("version", "")
                        extrainfo = service_elem.get("extrainfo", "")
                    # Scripts
                    scripts = {}
                    for script in port_elem.findall("script"):
                        scripts[script.get("id", "")] = script.get("output", "")
                    risk = _port_risk(port_id)
                    ports.append({
                        "port": port_id,
                        "protocol": protocol,
                        "state": state,
                        "service": service,
                        "product": product,
                        "version": version,
                        "extrainfo": extrainfo,
                        "ip": ip,
                        "risk": risk,
                        "danger": DANGER_DESCRIPTIONS.get(port_id, ""),
                        "scripts": scripts,
                    })
            return {"ports": ports, "count": len(ports)}
        except Exception:
            pass

    # Fallback: parse text
    port_re = re.compile(r'^(\d+)/(tcp|udp)\s+(\w+)\s+(\S+)\s*(.*)')
    for line in lines:
        m = port_re.match(line.strip())
        if m:
            port_id = int(m.group(1))
            ports.append({
                "port": port_id,
                "protocol": m.group(2),
                "state": m.group(3),
                "service": m.group(4),
                "product": m.group(5).strip(),
                "version": "",
                "risk": _port_risk(port_id),
                "danger": DANGER_DESCRIPTIONS.get(port_id, ""),
            })
    return {"ports": ports, "count": len(ports)}


# ── gobuster ─────────────────────────────────────────────────────────
def parse_gobuster(scan_dir: str, lines: list[str], domain: str) -> dict:
    dirs = []
    pattern = re.compile(r'(/\S+)\s+\(Status:\s*(\d+)\)')
    all_lines = list(lines)
    fpath = Path(scan_dir) / "dirs.txt"
    if fpath.exists():
        all_lines += fpath.read_text().splitlines()

    seen = set()
    for line in all_lines:
        m = pattern.search(line)
        if m and m.group(1) not in seen:
            path = m.group(1)
            status = int(m.group(2))
            seen.add(path)
            sensitive = any(s in path.lower() for s in SENSITIVE_PATHS)
            dirs.append({"path": path, "status": status, "sensitive": sensitive})
    return {"directories": dirs, "count": len(dirs)}


# ── nuclei ───────────────────────────────────────────────────────────
def parse_nuclei(scan_dir: str, lines: list[str], domain: str) -> dict:
    findings = []
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    pattern = re.compile(r'\[(\w+)\]\s+\[([^\]]+)\]\s+\[(\w+)\]\s+(https?://\S+)(?:\s+\[([^\]]*)\])?')

    all_lines = list(lines)
    fpath = Path(scan_dir) / "nuclei.txt"
    if fpath.exists():
        all_lines += fpath.read_text().splitlines()

    for line in all_lines:
        m = pattern.search(line)
        if m:
            severity, template_id, protocol, url = m.group(1), m.group(2), m.group(3), m.group(4)
            matcher = m.group(5) or ""
            findings.append({
                "severity": severity.lower(),
                "template": template_id,
                "url": url,
                "matcher": matcher,
                "raw": line.strip(),
            })

    findings.sort(key=lambda f: severity_order.get(f["severity"], 99))
    counts = {}
    for f in findings:
        counts[f["severity"]] = counts.get(f["severity"], 0) + 1
    return {"findings": findings, "counts": counts, "total": len(findings)}


# ── whatweb ──────────────────────────────────────────────────────────
def parse_whatweb(scan_dir: str, lines: list[str], domain: str) -> dict:
    techs = []
    seen = set()

    # Try JSON file
    jpath = Path(scan_dir) / "whatweb.json"
    if jpath.exists():
        try:
            for json_line in jpath.read_text().splitlines():
                data = json.loads(json_line)
                plugins = data.get("plugins", {})
                for name, info in plugins.items():
                    if name.lower() not in seen:
                        seen.add(name.lower())
                        version = ""
                        if isinstance(info, dict):
                            ver_list = info.get("version", [])
                            version = ver_list[0] if ver_list else ""
                        techs.append({"name": name, "version": version})
            return {"technologies": techs, "count": len(techs)}
        except Exception:
            pass

    # Fallback: parse text
    for line in lines:
        parts = re.findall(r'(\w[\w.-]+)\[([^\]]*)\]', line)
        for name, version in parts:
            if name.lower() not in seen:
                seen.add(name.lower())
                techs.append({"name": name, "version": version})
        # Also capture names without brackets
        bare = re.findall(r',\s*(\w[\w.-]+?)(?:,|$)', line)
        for name in bare:
            if name.lower() not in seen and len(name) > 2:
                seen.add(name.lower())
                techs.append({"name": name, "version": ""})

    return {"technologies": techs, "count": len(techs)}


# ── wafw00f ──────────────────────────────────────────────────────────
def parse_wafw00f(scan_dir: str, lines: list[str], domain: str) -> dict:
    for line in lines:
        m = re.search(r'is behind\s+(.+?)(?:\s+\(|$)', line)
        if m:
            return {"protected": True, "waf": m.group(1).strip()}
    if any("No WAF" in l or "not behind" in l for l in lines):
        return {"protected": False, "waf": ""}
    return {"protected": False, "waf": "", "raw_lines": len(lines)}


# ── dnsx ─────────────────────────────────────────────────────────────
def parse_dnsx(scan_dir: str, lines: list[str], domain: str) -> dict:
    records = []
    pattern = re.compile(r'(\S+)\s+\[(\w+)\]\s+\[([^\]]+)\]')
    all_lines = list(lines)
    fpath = Path(scan_dir) / "dns.txt"
    if fpath.exists():
        all_lines += fpath.read_text().splitlines()
    for line in all_lines:
        m = pattern.search(line)
        if m:
            records.append({
                "domain": m.group(1),
                "type": m.group(2),
                "value": m.group(3),
            })
    return {"records": records, "count": len(records)}


# ── dig ──────────────────────────────────────────────────────────────
def parse_dig(scan_dir: str, lines: list[str], domain: str) -> dict:
    records = []
    pattern = re.compile(r'^(\S+)\.\s+\d+\s+IN\s+(\w+)\s+(.+)')
    for line in lines:
        m = pattern.match(line.strip())
        if m:
            records.append({
                "domain": m.group(1),
                "type": m.group(2),
                "value": m.group(3).strip(),
            })
    return {"records": records, "count": len(records)}


# ── whois ────────────────────────────────────────────────────────────
def parse_whois(scan_dir: str, lines: list[str], domain: str) -> dict:
    raw = "\n".join(lines)
    def _extract(pattern: str) -> str:
        m = re.search(pattern, raw, re.IGNORECASE)
        return m.group(1).strip() if m else ""

    nameservers = re.findall(r'Name Server:\s*(\S+)', raw, re.IGNORECASE)
    status_lines = re.findall(r'(?:Domain )?Status:\s*(\S+)', raw, re.IGNORECASE)

    # Email security checks
    spf = bool(re.search(r'v=spf1', raw, re.IGNORECASE))
    dmarc = bool(re.search(r'v=DMARC', raw, re.IGNORECASE))
    dkim = bool(re.search(r'DKIM', raw, re.IGNORECASE))

    return {
        "registrar": _extract(r'Registrar:\s*(.+)'),
        "registrant": _extract(r'Registrant\s+(?:Organization|Name):\s*(.+)'),
        "created": _extract(r'Creat(?:ion|ed)\s+Date:\s*(\S+)'),
        "updated": _extract(r'Updated?\s+Date:\s*(\S+)'),
        "expires": _extract(r'(?:Registry Expir|Expir(?:ation|y))\s+Date:\s*(\S+)'),
        "nameservers": list(set(ns.lower().rstrip(".") for ns in nameservers)),
        "status": status_lines[:3],
        "email_security": {"spf": spf, "dmarc": dmarc, "dkim": dkim},
    }


# ── curl_headers ─────────────────────────────────────────────────────
def parse_curl_headers(scan_dir: str, lines: list[str], domain: str) -> dict:
    headers = []
    security_headers = {
        "Strict-Transport-Security", "Content-Security-Policy",
        "X-Frame-Options", "X-Content-Type-Options",
        "X-XSS-Protection", "Referrer-Policy", "Permissions-Policy",
    }
    found_headers = set()
    for line in lines:
        if ":" in line and not line.startswith("HTTP/"):
            key, _, value = line.partition(":")
            key = key.strip()
            headers.append({"key": key, "value": value.strip()})
            found_headers.add(key.lower())
    missing = [h for h in security_headers if h.lower() not in found_headers]
    return {"headers": headers, "missing_security": missing, "count": len(headers)}


# ── theHarvester ─────────────────────────────────────────────────────
def parse_theharvester(scan_dir: str, lines: list[str], domain: str) -> dict:
    emails = set()
    hosts = set()
    ips = set()
    email_re = re.compile(r'[\w.\-+]+@[\w.\-]+\.[a-zA-Z]{2,}')
    ip_re = re.compile(r'\b\d{1,3}(?:\.\d{1,3}){3}\b')

    all_text = "\n".join(lines)

    # Try JSON file
    for ext in (".json", ".xml"):
        fpath = Path(scan_dir) / f"harvester{ext}"
        if fpath.exists():
            try:
                all_text += "\n" + fpath.read_text()
            except Exception:
                pass

    for email in email_re.findall(all_text):
        emails.add(email.lower())
    for ip in ip_re.findall(all_text):
        ips.add(ip)
    for line in lines:
        line = line.strip()
        if "." in line and not line.startswith("[") and not line.startswith("*"):
            if email_re.match(line):
                continue
            if any(c.isalpha() for c in line) and "." in line:
                hosts.add(line.lower())

    return {
        "emails": sorted(emails),
        "hosts": sorted(hosts),
        "ips": sorted(ips),
        "email_count": len(emails),
    }


# ── testssl ──────────────────────────────────────────────────────────
def parse_testssl(scan_dir: str, lines: list[str], domain: str) -> dict:
    findings = []
    protocols = {}
    cert = {}

    # Try JSON
    jpath = Path(scan_dir) / "ssl.json"
    if jpath.exists():
        try:
            data = json.loads(jpath.read_text())
            if isinstance(data, list):
                for item in data:
                    sev = item.get("severity", "INFO")
                    findings.append({
                        "id": item.get("id", ""),
                        "severity": sev,
                        "finding": item.get("finding", ""),
                    })
            return {"findings": findings, "protocols": protocols, "cert": cert}
        except Exception:
            pass

    # Text fallback
    for line in lines:
        if "offered" in line.lower() or "not offered" in line.lower():
            parts = line.strip().split()
            if len(parts) >= 2:
                proto = parts[0].strip()
                offered = "not offered" not in line.lower()
                protocols[proto] = offered
        if "VULNERABLE" in line:
            findings.append({
                "id": line.strip()[:60],
                "severity": "HIGH",
                "finding": line.strip(),
            })

    return {"findings": findings, "protocols": protocols, "cert": cert}


# ── gowitness ────────────────────────────────────────────────────────
def parse_gowitness(scan_dir: str, lines: list[str], domain: str) -> dict:
    screenshots = []
    ss_dir = Path(scan_dir) / "screenshots"
    if ss_dir.exists():
        for f in ss_dir.glob("*.png"):
            screenshots.append({
                "path": str(f),
                "filename": f.name,
                "size": f.stat().st_size,
            })
    return {"screenshots": screenshots, "count": len(screenshots)}


# ── Aggregate parser ─────────────────────────────────────────────────
def parse_all_results(scan_dir: str, module: str, lines: list[str], domain: str) -> dict:
    parser = PARSERS.get(module)
    if parser:
        return parser(scan_dir, lines, domain)
    return {"raw_lines": len(lines)}


PARSERS = {
    "subfinder": parse_subfinder,
    "amass": parse_amass,
    "httpx": parse_httpx,
    "nmap": parse_nmap,
    "gobuster": parse_gobuster,
    "nuclei": parse_nuclei,
    "whatweb": parse_whatweb,
    "wafw00f": parse_wafw00f,
    "dnsx": parse_dnsx,
    "whois": parse_whois,
    "curl_headers": parse_curl_headers,
    "theHarvester": parse_theharvester,
    "testssl": parse_testssl,
    "gowitness": parse_gowitness,
    "dig": parse_dig,
}
