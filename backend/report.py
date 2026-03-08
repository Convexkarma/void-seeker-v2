"""
Report generation — JSON, Markdown, HTML, PDF.
"""

import json
import shutil
from datetime import datetime
from pathlib import Path


def _attack_surface_score(data: dict) -> int:
    results = data.get("results", {})
    subs = len(results.get("subfinder", {}).get("subdomains", []))
    subs += len(results.get("amass", {}).get("subdomains", []))
    ports = len(results.get("nmap", {}).get("ports", []))
    vulns = results.get("nuclei", {}).get("counts", {})
    dirs = len(results.get("gobuster", {}).get("directories", []))
    score = int(
        subs * 0.5 +
        ports * 2 +
        vulns.get("critical", 0) * 20 +
        vulns.get("high", 0) * 10 +
        vulns.get("medium", 0) * 5 +
        vulns.get("low", 0) * 2 +
        dirs * 0.3
    )
    return min(100, score)


async def generate_report(data: dict, fmt: str, reports_dir: str) -> str:
    domain = data.get("domain", "unknown")
    scan_id = data.get("id", "scan")
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    base = Path(reports_dir)
    base.mkdir(parents=True, exist_ok=True)

    if fmt == "json":
        path = base / f"{domain}_{ts}.json"
        path.write_text(json.dumps(data, indent=2, default=str))
        return str(path)

    if fmt == "markdown":
        path = base / f"{domain}_{ts}.md"
        path.write_text(_gen_markdown(data))
        return str(path)

    if fmt == "html":
        path = base / f"{domain}_{ts}.html"
        path.write_text(_gen_html(data))
        return str(path)

    if fmt == "pdf":
        html_content = _gen_html(data)
        path = base / f"{domain}_{ts}.pdf"
        # Try weasyprint first
        try:
            import weasyprint
            weasyprint.HTML(string=html_content).write_pdf(str(path))
            return str(path)
        except ImportError:
            pass
        # Try wkhtmltopdf
        if shutil.which("wkhtmltopdf"):
            html_path = base / f"_tmp_{ts}.html"
            html_path.write_text(html_content)
            import asyncio
            proc = await asyncio.create_subprocess_exec(
                "wkhtmltopdf", "--quiet", str(html_path), str(path)
            )
            await proc.wait()
            html_path.unlink(missing_ok=True)
            if path.exists():
                return str(path)
        # Fallback: return HTML
        path = base / f"{domain}_{ts}.html"
        path.write_text(html_content)
        return str(path)

    raise ValueError(f"Unknown format: {fmt}")


def _gen_markdown(data: dict) -> str:
    domain = data.get("domain", "unknown")
    results = data.get("results", {})
    score = _attack_surface_score(data)

    lines = [
        f"# AutoRecon Report — {domain}",
        f"**Date:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        f"**Attack Surface Score:** {score}/100",
        "",
        "## Executive Summary",
        "",
        "| Metric | Count |",
        "|--------|-------|",
    ]

    subs = results.get("subfinder", {}).get("subdomains", [])
    ports = results.get("nmap", {}).get("ports", [])
    vulns = results.get("nuclei", {}).get("findings", [])
    dirs = results.get("gobuster", {}).get("directories", [])
    emails = results.get("theHarvester", {}).get("emails", [])

    lines.append(f"| Subdomains | {len(subs)} |")
    lines.append(f"| Open Ports | {len(ports)} |")
    lines.append(f"| Vulnerabilities | {len(vulns)} |")
    lines.append(f"| Directories | {len(dirs)} |")
    lines.append(f"| Emails | {len(emails)} |")
    lines.append("")

    # Vulnerabilities
    if vulns:
        lines.append("## Vulnerabilities")
        lines.append("")
        for sev in ("critical", "high", "medium", "low", "info"):
            sev_vulns = [v for v in vulns if v.get("severity") == sev]
            if sev_vulns:
                lines.append(f"### {sev.upper()}")
                for v in sev_vulns:
                    lines.append(f"- **{v.get('template', '')}** — {v.get('url', '')}")
                    if v.get("matcher"):
                        lines.append(f"  - {v['matcher']}")
                lines.append("")

    # Ports
    if ports:
        lines.append("## Open Ports")
        lines.append("")
        lines.append("| Port | Service | Product | Risk |")
        lines.append("|------|---------|---------|------|")
        for p in ports:
            lines.append(f"| {p['port']}/{p.get('protocol','tcp')} | {p.get('service','')} | {p.get('product','')} {p.get('version','')} | {p.get('risk','')} |")
        lines.append("")

    # Subdomains
    if subs:
        lines.append("## Subdomains")
        lines.append("")
        shown = subs[:100]
        for s in shown:
            name = s if isinstance(s, str) else s.get("name", "")
            lines.append(f"- `{name}`")
        if len(subs) > 100:
            lines.append(f"\n*... and {len(subs) - 100} more*")
        lines.append("")

    # Directories
    if dirs:
        lines.append("## Sensitive Directories")
        lines.append("")
        for d in dirs:
            if d.get("sensitive"):
                lines.append(f"- `{d['path']}` (Status: {d['status']})")
        lines.append("")

    # Emails
    if emails:
        lines.append("## Discovered Emails")
        lines.append("")
        for e in emails:
            lines.append(f"- {e}")

    return "\n".join(lines)


def _gen_html(data: dict) -> str:
    domain = data.get("domain", "unknown")
    results = data.get("results", {})
    score = _attack_surface_score(data)
    score_color = "#ff2d55" if score >= 70 else "#ff7b00" if score >= 40 else "#00ff88"
    score_label = "HIGH RISK" if score >= 70 else "MODERATE" if score >= 40 else "LIMITED"

    subs = results.get("subfinder", {}).get("subdomains", [])
    ports = results.get("nmap", {}).get("ports", [])
    vulns = results.get("nuclei", {}).get("findings", [])
    dirs = results.get("gobuster", {}).get("directories", [])
    techs = results.get("whatweb", {}).get("technologies", [])
    emails = results.get("theHarvester", {}).get("emails", [])
    dns = results.get("dnsx", {}).get("records", [])
    whois_data = results.get("whois", {})
    headers = results.get("curl_headers", {})
    missing_headers = headers.get("missing_security", []) if isinstance(headers, dict) else []

    severity_colors = {
        "critical": "#ff2d55", "high": "#ff7b00",
        "medium": "#ffd60a", "low": "#00b4ff", "info": "#7aa8d0",
    }

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AutoRecon Report — {domain}</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ background: #020408; color: #e8f4ff; font-family: 'Space Grotesk', sans-serif; padding: 40px; line-height: 1.6; }}
  h1 {{ color: #00b4ff; font-size: 28px; margin-bottom: 8px; }}
  h2 {{ color: #40d4ff; font-size: 20px; margin: 32px 0 16px; border-bottom: 1px solid #0d2040; padding-bottom: 8px; }}
  .meta {{ color: #7aa8d0; font-size: 14px; margin-bottom: 24px; }}
  .score-bar {{ background: #080f1e; border: 1px solid #0d2040; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }}
  .score-num {{ font-size: 48px; font-weight: bold; color: {score_color}; }}
  .score-label {{ font-size: 14px; color: {score_color}; letter-spacing: 2px; }}
  .stat-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin: 20px 0; }}
  .stat {{ background: #080f1e; border: 1px solid #0d2040; border-radius: 6px; padding: 16px; text-align: center; }}
  .stat-num {{ font-size: 24px; font-weight: bold; color: #00b4ff; }}
  .stat-label {{ font-size: 12px; color: #7aa8d0; margin-top: 4px; }}
  table {{ width: 100%; border-collapse: collapse; margin: 12px 0; }}
  th {{ background: #080f1e; color: #7aa8d0; text-align: left; padding: 8px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }}
  td {{ padding: 8px 12px; border-bottom: 1px solid #0d2040; font-size: 14px; }}
  .badge {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }}
  .tech-badge {{ background: #0a1628; border: 1px solid #0d2040; padding: 4px 10px; border-radius: 4px; display: inline-block; margin: 4px; font-size: 13px; }}
  .mono {{ font-family: 'JetBrains Mono', monospace; }}
  .sensitive {{ background: rgba(255,45,85,0.1); }}
  @media print {{ body {{ background: #fff; color: #000; }} h1,h2 {{ color: #003366; }} }}
</style>
</head>
<body>
<h1>⚡ AutoRecon Report</h1>
<div class="meta">{domain} — {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</div>

<div class="score-bar">
  <div class="score-num">{score}</div>
  <div class="score-label">{score_label}</div>
  <div style="background:#0d2040;height:8px;border-radius:4px;margin-top:12px;">
    <div style="background:{score_color};height:8px;border-radius:4px;width:{score}%;"></div>
  </div>
</div>

<div class="stat-grid">
  <div class="stat"><div class="stat-num">{len(subs)}</div><div class="stat-label">Subdomains</div></div>
  <div class="stat"><div class="stat-num">{len(ports)}</div><div class="stat-label">Ports</div></div>
  <div class="stat"><div class="stat-num" style="color:#ff2d55">{len([v for v in vulns if v.get('severity')=='critical'])}</div><div class="stat-label">Critical</div></div>
  <div class="stat"><div class="stat-num" style="color:#ff7b00">{len([v for v in vulns if v.get('severity')=='high'])}</div><div class="stat-label">High</div></div>
  <div class="stat"><div class="stat-num">{len(dirs)}</div><div class="stat-label">Directories</div></div>
  <div class="stat"><div class="stat-num">{len(emails)}</div><div class="stat-label">Emails</div></div>
</div>
"""

    # Vulnerabilities table
    if vulns:
        html += "<h2>Vulnerabilities</h2><table><tr><th>Severity</th><th>Template</th><th>URL</th></tr>"
        for v in vulns:
            sev = v.get("severity", "info")
            color = severity_colors.get(sev, "#7aa8d0")
            html += f'<tr><td><span class="badge" style="background:{color};color:#000">{sev.upper()}</span></td>'
            html += f'<td class="mono">{v.get("template","")}</td>'
            html += f'<td class="mono" style="color:#00ffee">{v.get("url","")}</td></tr>'
        html += "</table>"

    # Ports table
    if ports:
        html += "<h2>Open Ports</h2><table><tr><th>Port</th><th>Service</th><th>Product</th><th>Risk</th></tr>"
        for p in ports:
            risk = p.get("risk", "low")
            color = "#ff2d55" if risk == "high" else "#ffd60a" if risk == "medium" else "#00ff88"
            html += f'<tr><td class="mono" style="color:{color}">{p["port"]}/{p.get("protocol","tcp")}</td>'
            html += f'<td>{p.get("service","")}</td><td>{p.get("product","")} {p.get("version","")}</td>'
            html += f'<td><span class="badge" style="border:1px solid {color};color:{color}">{risk}</span></td></tr>'
        html += "</table>"

    # Subdomains
    if subs:
        html += f"<h2>Subdomains ({len(subs)})</h2><div style='display:grid;grid-template-columns:repeat(3,1fr);gap:8px'>"
        for s in subs[:100]:
            name = s if isinstance(s, str) else s.get("name", "")
            html += f'<div class="mono" style="font-size:13px;padding:4px;color:#00b4ff">{name}</div>'
        if len(subs) > 100:
            html += f'<div style="color:#7aa8d0">...and {len(subs)-100} more</div>'
        html += "</div>"

    # Tech
    if techs:
        html += "<h2>Technology Stack</h2><div>"
        for t in techs:
            html += f'<span class="tech-badge">{t.get("name","")} <span style="color:#7aa8d0">{t.get("version","")}</span></span>'
        html += "</div>"

    # DNS
    if dns:
        html += "<h2>DNS Records</h2><table><tr><th>Domain</th><th>Type</th><th>Value</th></tr>"
        for r in dns:
            html += f'<tr><td class="mono" style="color:#00ff88">{r.get("domain","")}</td>'
            html += f'<td><span class="badge" style="background:#0a1628;color:#00ffee;border:1px solid #0d2040">{r.get("type","")}</span></td>'
            html += f'<td class="mono">{r.get("value","")}</td></tr>'
        html += "</table>"

    # WHOIS
    if whois_data:
        html += "<h2>WHOIS</h2><table>"
        for k, v in whois_data.items():
            if k == "email_security":
                continue
            val = v if isinstance(v, str) else ", ".join(v) if isinstance(v, list) else str(v)
            html += f"<tr><td style='color:#00ffee;width:200px'>{k}</td><td>{val}</td></tr>"
        html += "</table>"

    # Missing headers
    if missing_headers:
        html += "<h2>Missing Security Headers</h2><ul>"
        for h in missing_headers:
            html += f'<li style="color:#ff7b00">{h}</li>'
        html += "</ul>"

    # Emails
    if emails:
        html += "<h2>Discovered Emails</h2><ul>"
        for e in emails:
            html += f'<li class="mono">{e}</li>'
        html += "</ul>"

    html += "</body></html>"
    return html
