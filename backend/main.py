"""
AutoRecon Backend — FastAPI server for automated reconnaissance.
Run: uvicorn main:app --host 127.0.0.1 --port 8000 --reload
"""

import os
import json
import uuid
import asyncio
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from db import init_db, save_scan, update_scan, get_scan, list_scans, delete_scan_db, get_scans_for_domain
from scanner import ScanOrchestrator, MODULE_ORDER, COMMANDS
from parser import parse_all_results
from report import generate_report
from terminal import TerminalManager

# ── App ──────────────────────────────────────────────────────────────
app = FastAPI(title="AutoRecon", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000",
                   "http://localhost:5173", "http://127.0.0.1:5173",
                   "http://localhost:8080", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path.home() / ".autorecon"
SCANS_DIR = BASE_DIR / "scans"
REPORTS_DIR = BASE_DIR / "reports"
SETTINGS_FILE = BASE_DIR / "settings.json"

# Active scans and terminal sessions
active_scans: dict[str, ScanOrchestrator] = {}
scan_subscribers: dict[str, list[asyncio.Queue]] = {}
terminal_mgr = TerminalManager()


# ── Models ───────────────────────────────────────────────────────────
class ScanStartRequest(BaseModel):
    domain: str
    modules: list[str] = Field(default_factory=lambda: list(MODULE_ORDER))
    threads: int = 10
    wordlist: str = "/usr/share/wordlists/dirb/common.txt"
    stealth: bool = False
    proxy: Optional[str] = None


class ReportRequest(BaseModel):
    format: str = "html"  # html, pdf, json, markdown


class SettingsUpdate(BaseModel):
    api_keys: dict = {}
    notifications: dict = {}
    scan_defaults: dict = {}


class CompareRequest(BaseModel):
    scan_id_a: str
    scan_id_b: str


# ── Startup ──────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    for d in [BASE_DIR, SCANS_DIR, REPORTS_DIR]:
        d.mkdir(parents=True, exist_ok=True)
    await init_db()
    print("\033[34m")
    print("  ⚡ AutoRecon Backend v1.0.0")
    print("  ─────────────────────────────")
    print(f"  Listening on http://127.0.0.1:8000")
    print(f"  Data dir:    {BASE_DIR}")
    print("\033[0m")


# ── Health ───────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0", "timestamp": datetime.utcnow().isoformat()}


# ── Tool Check ───────────────────────────────────────────────────────
@app.post("/api/tools/check")
async def check_tools():
    results = {}
    for tool in COMMANDS.keys():
        binary = tool.replace("curl_headers", "curl").replace("dig", "dig")
        if tool == "curl_headers":
            binary = "curl"
        elif tool == "testssl":
            binary = "testssl.sh"
        path = shutil.which(binary)
        results[tool] = {
            "installed": path is not None,
            "path": path or "",
            "version": "",
        }
        if path:
            try:
                proc = await asyncio.create_subprocess_exec(
                    binary, "--version" if tool not in ("whois", "dig", "curl_headers") else "--help",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5)
                first_line = stdout.decode(errors="ignore").split("\n")[0].strip()
                results[tool]["version"] = first_line[:80]
            except Exception:
                pass
    return results


# ── Scan Start ───────────────────────────────────────────────────────
@app.post("/api/scan/start")
async def start_scan(req: ScanStartRequest):
    scan_id = f"scan-{uuid.uuid4().hex[:8]}"
    scan_dir = SCANS_DIR / scan_id
    scan_dir.mkdir(parents=True, exist_ok=True)
    (scan_dir / "screenshots").mkdir(exist_ok=True)

    now = datetime.utcnow().isoformat()
    scan_data = {
        "id": scan_id,
        "domain": req.domain,
        "status": "running",
        "created_at": now,
        "updated_at": now,
        "modules": req.modules,
        "config": {
            "threads": req.threads,
            "wordlist": req.wordlist,
            "stealth": req.stealth,
            "proxy": req.proxy,
        },
        "results": {},
        "progress": 0,
        "current_module": "",
    }

    await save_scan(scan_data)

    # Load settings for API keys / proxy
    settings = _load_settings()

    orchestrator = ScanOrchestrator(
        scan_id=scan_id,
        domain=req.domain,
        modules=req.modules,
        scan_dir=str(scan_dir),
        threads=req.threads,
        wordlist=req.wordlist,
        stealth=req.stealth,
        proxy=req.proxy or settings.get("scan_defaults", {}).get("proxy", ""),
        api_keys=settings.get("api_keys", {}),
        notify_config=settings.get("notifications", {}),
    )
    active_scans[scan_id] = orchestrator
    scan_subscribers[scan_id] = []

    # Run scan in background
    asyncio.create_task(_run_scan(scan_id, orchestrator))

    return {"scan_id": scan_id, "status": "started", "domain": req.domain}


async def _run_scan(scan_id: str, orchestrator: ScanOrchestrator):
    """Background task that runs the scan and broadcasts to WebSocket subscribers."""
    try:
        async for msg in orchestrator.run():
            # Broadcast to all subscribers
            for queue in scan_subscribers.get(scan_id, []):
                await queue.put(msg)

            # Persist intermediate results
            if msg.get("type") in ("module_complete", "scan_complete"):
                scan = await get_scan(scan_id)
                if scan:
                    data = json.loads(scan["data"])
                    if msg["type"] == "module_complete":
                        data["results"][msg["module"]] = msg.get("parsed", {})
                        data["progress"] = msg.get("progress", data.get("progress", 0))
                        data["current_module"] = ""
                    elif msg["type"] == "scan_complete":
                        data["status"] = msg.get("status", "completed")
                        data["completed_at"] = datetime.utcnow().isoformat()
                        data["progress"] = 100
                        data["duration"] = msg.get("duration", 0)
                        data["summary"] = msg.get("summary", {})
                    data["updated_at"] = datetime.utcnow().isoformat()
                    await update_scan(scan_id, data)
    except Exception as e:
        print(f"\033[31m[ERROR] Scan {scan_id}: {e}\033[0m")
        for queue in scan_subscribers.get(scan_id, []):
            await queue.put({"type": "module_error", "error": str(e)})
    finally:
        active_scans.pop(scan_id, None)


# ── Scan Cancel ──────────────────────────────────────────────────────
@app.post("/api/scan/{scan_id}/cancel")
async def cancel_scan(scan_id: str):
    orchestrator = active_scans.get(scan_id)
    if not orchestrator:
        raise HTTPException(404, "Scan not found or not running")
    await orchestrator.cancel()
    scan = await get_scan(scan_id)
    if scan:
        data = json.loads(scan["data"])
        data["status"] = "cancelled"
        data["updated_at"] = datetime.utcnow().isoformat()
        await update_scan(scan_id, data)
    for queue in scan_subscribers.get(scan_id, []):
        await queue.put({"type": "cancelled", "scan_id": scan_id})
    return {"status": "cancelled"}


# ── Scan Status / Results ────────────────────────────────────────────
@app.get("/api/scan/{scan_id}/status")
async def scan_status(scan_id: str):
    scan = await get_scan(scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")
    data = json.loads(scan["data"])
    return {
        "id": scan_id,
        "status": data.get("status"),
        "progress": data.get("progress", 0),
        "current_module": data.get("current_module", ""),
        "domain": data.get("domain"),
    }


@app.get("/api/scan/{scan_id}/results")
async def scan_results(scan_id: str):
    scan = await get_scan(scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")
    return json.loads(scan["data"])


# ── Scan History ─────────────────────────────────────────────────────
@app.get("/api/scan/history")
async def scan_history():
    scans = await list_scans()
    return scans


# ── Delete Scan ──────────────────────────────────────────────────────
@app.delete("/api/scan/{scan_id}")
async def delete_scan(scan_id: str):
    await delete_scan_db(scan_id)
    scan_dir = SCANS_DIR / scan_id
    if scan_dir.exists():
        shutil.rmtree(scan_dir, ignore_errors=True)
    return {"status": "deleted"}


# ── Scan Compare ─────────────────────────────────────────────────────
@app.post("/api/scan/compare")
async def compare_scans(req: CompareRequest):
    scan_a = await get_scan(req.scan_id_a)
    scan_b = await get_scan(req.scan_id_b)
    if not scan_a or not scan_b:
        raise HTTPException(404, "One or both scans not found")

    data_a = json.loads(scan_a["data"])
    data_b = json.loads(scan_b["data"])

    def _get_set(data, key, field="name"):
        items = data.get("results", {}).get(key, [])
        if isinstance(items, list):
            return {i.get(field, str(i)) if isinstance(i, dict) else str(i) for i in items}
        return set()

    subs_a = _get_set(data_a, "subdomains")
    subs_b = _get_set(data_b, "subdomains")
    ports_a = _get_set(data_a, "ports", "port")
    ports_b = _get_set(data_b, "ports", "port")
    vulns_a = _get_set(data_a, "vulns", "id")
    vulns_b = _get_set(data_b, "vulns", "id")

    return {
        "subdomains": {"new": list(subs_b - subs_a), "removed": list(subs_a - subs_b)},
        "ports": {"new": list(ports_b - ports_a), "removed": list(ports_a - ports_b)},
        "vulns": {"new": list(vulns_b - vulns_a), "removed": list(vulns_a - vulns_b)},
    }


# ── Screenshots ──────────────────────────────────────────────────────
@app.get("/api/screenshot")
async def get_screenshot(scan_id: str = Query(...), filename: str = Query(...)):
    safe_path = (SCANS_DIR / scan_id / "screenshots" / filename).resolve()
    if not str(safe_path).startswith(str(SCANS_DIR.resolve())):
        raise HTTPException(403, "Path traversal blocked")
    if not safe_path.exists():
        raise HTTPException(404, "Screenshot not found")
    return FileResponse(safe_path, media_type="image/png")


# ── Report Generation ────────────────────────────────────────────────
@app.post("/api/report/generate")
async def gen_report(scan_id: str = Query(...), req: ReportRequest = ReportRequest()):
    scan = await get_scan(scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")
    data = json.loads(scan["data"])
    report_path = await generate_report(data, req.format, str(REPORTS_DIR))
    return FileResponse(
        report_path,
        filename=Path(report_path).name,
        media_type="application/octet-stream",
    )


# ── Settings ─────────────────────────────────────────────────────────
def _load_settings() -> dict:
    if SETTINGS_FILE.exists():
        return json.loads(SETTINGS_FILE.read_text())
    return {}


@app.get("/api/settings")
async def get_settings():
    s = _load_settings()
    # Mask API keys
    masked = {}
    for k, v in s.get("api_keys", {}).items():
        if v:
            masked[k] = v[:4] + "•" * (len(v) - 4) if len(v) > 4 else "••••"
        else:
            masked[k] = ""
    return {**s, "api_keys": masked}


@app.post("/api/settings")
async def save_settings(req: SettingsUpdate):
    existing = _load_settings()
    # Merge API keys — don't overwrite with masked values
    for k, v in req.api_keys.items():
        if "•" not in v:
            existing.setdefault("api_keys", {})[k] = v
    existing["notifications"] = req.notifications
    existing["scan_defaults"] = req.scan_defaults
    SETTINGS_FILE.write_text(json.dumps(existing, indent=2))
    return {"status": "saved"}


# ── WebSocket: Scan ──────────────────────────────────────────────────
@app.websocket("/ws/scan/{scan_id}")
async def ws_scan(ws: WebSocket, scan_id: str):
    await ws.accept()
    queue: asyncio.Queue = asyncio.Queue()
    scan_subscribers.setdefault(scan_id, []).append(queue)
    try:
        while True:
            msg = await queue.get()
            await ws.send_json(msg)
            if msg.get("type") in ("scan_complete", "cancelled"):
                break
    except WebSocketDisconnect:
        pass
    finally:
        subs = scan_subscribers.get(scan_id, [])
        if queue in subs:
            subs.remove(queue)


# ── WebSocket: Terminal ──────────────────────────────────────────────
@app.websocket("/ws/terminal/{session_id}")
async def ws_terminal(ws: WebSocket, session_id: str):
    await ws.accept()
    await terminal_mgr.handle_session(ws, session_id)
