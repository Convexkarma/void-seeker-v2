"""
ScanOrchestrator — Executes real recon tools as OS subprocesses.
Streams output line-by-line via async generators.
"""

import os
import asyncio
import time
import json
import aiohttp
from pathlib import Path
from typing import AsyncGenerator, Optional

from parser import (
    parse_subfinder, parse_amass, parse_httpx, parse_nmap, parse_gobuster,
    parse_nuclei, parse_whatweb, parse_wafw00f, parse_dnsx, parse_whois,
    parse_curl_headers, parse_theharvester, parse_testssl, parse_gowitness,
    parse_dig,
)

COMMANDS = {
    "subfinder":    "subfinder -d {domain} -silent -all -o {out}/subdomains_sf.txt",
    "amass":        "amass enum -passive -d {domain} -o {out}/subdomains_am.txt -timeout 10",
    "dnsx":         "dnsx -d {domain} -a -aaaa -mx -ns -txt -cname -ptr -soa -o {out}/dns.txt -silent",
    "dig":          "dig any {domain} +noall +answer +multiline",
    "whois":        "whois {domain}",
    "httpx":        "httpx -l {out}/subdomains_all.txt -silent -status-code -title -tech-detect -content-length -o {out}/live_hosts.txt",
    "nmap":         "nmap -sV -sC -T4 --open -p 21,22,23,25,53,80,110,143,443,445,465,587,993,995,1433,1521,2375,2376,3000,3306,3389,4848,5432,5900,5985,6379,8080,8443,8888,9200,9300,11211,27017,50070 {domain} -oX {out}/nmap.xml -oN {out}/nmap.txt",
    "whatweb":      "whatweb -a 3 http://{domain} --log-json={out}/whatweb.json --quiet",
    "wafw00f":      "wafw00f http://{domain} -o {out}/waf.txt -a",
    "curl_headers": "curl -sI --max-time 15 --user-agent 'Mozilla/5.0' http://{domain}",
    "gobuster":     "gobuster dir -u http://{domain} -w {wordlist} -t {threads} -o {out}/dirs.txt -b 404,403,400 --no-error -q",
    "nuclei":       "nuclei -u http://{domain} -severity low,medium,high,critical -o {out}/nuclei.txt -silent -no-color",
    "theHarvester": "theHarvester -d {domain} -b all -f {out}/harvester",
    "gowitness":    "gowitness file -f {out}/subdomains_all.txt -P {out}/screenshots/ --quiet",
    "testssl":      "testssl.sh --jsonfile {out}/ssl.json --quiet https://{domain}",
}

MODULE_ORDER = [
    "subfinder", "amass", "dnsx", "dig", "whois",
    "httpx", "nmap", "whatweb", "wafw00f", "curl_headers",
    "gobuster", "nuclei", "theHarvester", "gowitness", "testssl",
]

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

import shutil


class ScanOrchestrator:
    def __init__(
        self,
        scan_id: str,
        domain: str,
        modules: list[str],
        scan_dir: str,
        threads: int = 10,
        wordlist: str = "/usr/share/wordlists/dirb/common.txt",
        stealth: bool = False,
        proxy: str = "",
        api_keys: dict = None,
        notify_config: dict = None,
    ):
        self.scan_id = scan_id
        self.domain = domain
        self.modules = [m for m in MODULE_ORDER if m in modules]
        self.scan_dir = scan_dir
        self.threads = threads
        self.wordlist = wordlist
        self.stealth = stealth
        self.proxy = proxy
        self.api_keys = api_keys or {}
        self.notify_config = notify_config or {}
        self.cancelled = False
        self._process: Optional[asyncio.subprocess.Process] = None
        self._start_time = 0

    async def cancel(self):
        self.cancelled = True
        if self._process:
            try:
                self._process.terminate()
                await asyncio.sleep(1)
                if self._process.returncode is None:
                    self._process.kill()
            except ProcessLookupError:
                pass

    async def run(self) -> AsyncGenerator[dict, None]:
        self._start_time = time.time()
        total = len(self.modules)

        yield {
            "type": "started",
            "scan_id": self.scan_id,
            "domain": self.domain,
            "modules": self.modules,
        }

        all_results = {}

        for idx, module in enumerate(self.modules):
            if self.cancelled:
                break

            progress = int((idx / total) * 100)
            yield {
                "type": "module_start",
                "module": module,
                "index": idx + 1,
                "total": total,
                "progress": progress,
            }

            # Check if tool is installed
            binary = self._get_binary(module)
            if not shutil.which(binary):
                install_hint = self._get_install_hint(module)
                yield {
                    "type": "module_skip",
                    "module": module,
                    "reason": f"{binary} not found in PATH",
                    "install_hint": install_hint,
                }
                continue

            # Merge subdomains before httpx
            if module == "httpx":
                await self._merge_subdomains()

            # Build command
            cmd = COMMANDS[module].format(
                domain=self.domain,
                out=self.scan_dir,
                wordlist=self.wordlist,
                threads=self.threads,
            )

            yield {"type": "command", "module": module, "command": cmd}

            # Execute
            env = self._build_env()
            exit_code = 0
            output_lines = []

            try:
                self._process = await asyncio.create_subprocess_shell(
                    cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,
                    env=env,
                    cwd=self.scan_dir,
                )

                async for line in self._read_lines(self._process.stdout):
                    if self.cancelled:
                        break
                    output_lines.append(line)
                    yield {"type": "output", "module": module, "line": line}
                    if self.stealth:
                        await asyncio.sleep(0.05)

                await self._process.wait()
                exit_code = self._process.returncode or 0

            except Exception as e:
                yield {"type": "module_error", "module": module, "error": str(e)}
                continue

            if self.cancelled:
                break

            # Parse results
            parser = PARSERS.get(module)
            parsed = {}
            if parser:
                try:
                    parsed = parser(self.scan_dir, output_lines, self.domain)
                except Exception as e:
                    parsed = {"error": str(e), "raw_lines": len(output_lines)}

            all_results[module] = parsed

            yield {
                "type": "module_complete",
                "module": module,
                "parsed": parsed,
                "exit_code": exit_code,
                "progress": int(((idx + 1) / total) * 100),
            }

            if self.stealth:
                await asyncio.sleep(3)
            else:
                await asyncio.sleep(0.2)

        duration = int(time.time() - self._start_time)

        if not self.cancelled:
            summary = self._build_summary(all_results)
            yield {
                "type": "scan_complete",
                "status": "completed",
                "duration": duration,
                "summary": summary,
                "results": all_results,
            }
            # Send webhook notifications
            await self._notify(summary)
        else:
            yield {"type": "cancelled", "scan_id": self.scan_id}

    async def _read_lines(self, stream) -> AsyncGenerator[str, None]:
        while True:
            line = await stream.readline()
            if not line:
                break
            yield line.decode(errors="replace").rstrip("\n\r")

    async def _merge_subdomains(self):
        """Merge subfinder + amass output into subdomains_all.txt"""
        all_subs = set()
        for fname in ("subdomains_sf.txt", "subdomains_am.txt"):
            fpath = Path(self.scan_dir) / fname
            if fpath.exists():
                for line in fpath.read_text().splitlines():
                    line = line.strip()
                    if line and not line.startswith("["):
                        all_subs.add(line.lower())
        # Always include the main domain
        all_subs.add(self.domain)
        out = Path(self.scan_dir) / "subdomains_all.txt"
        out.write_text("\n".join(sorted(all_subs)))

    def _build_env(self) -> dict:
        env = os.environ.copy()
        env["TERM"] = "xterm-256color"
        go_bin = str(Path.home() / "go" / "bin")
        local_bin = str(Path.home() / ".local" / "bin")
        env["PATH"] = f"{go_bin}:{local_bin}:{env.get('PATH', '')}"
        if self.proxy:
            env["HTTP_PROXY"] = self.proxy
            env["HTTPS_PROXY"] = self.proxy
        # Inject API keys
        for key, val in self.api_keys.items():
            if val:
                env[key.upper()] = val
        return env

    def _get_binary(self, module: str) -> str:
        mapping = {
            "curl_headers": "curl",
            "testssl": "testssl.sh",
            "theHarvester": "theHarvester",
        }
        return mapping.get(module, module)

    def _get_install_hint(self, module: str) -> str:
        hints = {
            "subfinder": "go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest",
            "amass": "go install github.com/projectdiscovery/amass/v4/...@latest",
            "httpx": "go install github.com/projectdiscovery/httpx/cmd/httpx@latest",
            "dnsx": "go install github.com/projectdiscovery/dnsx/cmd/dnsx@latest",
            "nuclei": "go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest",
            "gowitness": "go install github.com/sensepost/gowitness@latest",
            "nmap": "sudo apt install nmap",
            "gobuster": "sudo apt install gobuster",
            "whatweb": "sudo apt install whatweb",
            "wafw00f": "pip3 install wafw00f",
            "theHarvester": "pip3 install theHarvester",
            "testssl": "git clone https://github.com/drwetter/testssl.sh.git",
            "whois": "sudo apt install whois",
            "dig": "sudo apt install dnsutils",
            "curl_headers": "sudo apt install curl",
        }
        return hints.get(module, f"Install {module}")

    def _build_summary(self, results: dict) -> dict:
        subs = results.get("subfinder", {}).get("subdomains", [])
        subs += results.get("amass", {}).get("subdomains", [])
        ports = results.get("nmap", {}).get("ports", [])
        vulns = results.get("nuclei", {}).get("findings", [])
        dirs = results.get("gobuster", {}).get("directories", [])
        emails = results.get("theHarvester", {}).get("emails", [])
        live = results.get("httpx", {}).get("hosts", [])

        vuln_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        for v in vulns:
            sev = v.get("severity", "info").lower()
            vuln_counts[sev] = vuln_counts.get(sev, 0) + 1

        return {
            "subdomains": len(set(s if isinstance(s, str) else s.get("name", "") for s in subs)),
            "live_hosts": len(live),
            "ports": len(ports),
            "vulns": vuln_counts,
            "directories": len(dirs),
            "emails": len(emails),
        }

    async def _notify(self, summary: dict):
        """Send webhook notifications on scan complete."""
        msg = (
            f"⚡ AutoRecon scan complete: {self.domain}\n"
            f"Subdomains: {summary['subdomains']} | Ports: {summary['ports']} | "
            f"Critical: {summary['vulns']['critical']} | High: {summary['vulns']['high']}"
        )
        for key in ("discord_webhook", "slack_webhook"):
            url = self.notify_config.get(key, "")
            if url:
                try:
                    payload = {"content": msg} if "discord" in key else {"text": msg}
                    async with aiohttp.ClientSession() as session:
                        await session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=10))
                except Exception:
                    pass
