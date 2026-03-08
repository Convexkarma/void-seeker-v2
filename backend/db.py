"""
SQLite persistence layer using aiosqlite.
Stores scan data as JSON blobs for flexibility.
"""

import json
import aiosqlite
from pathlib import Path
from typing import Optional

DB_PATH = str(Path.home() / ".autorecon" / "autorecon.db")


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                id           TEXT PRIMARY KEY,
                domain       TEXT NOT NULL,
                status       TEXT NOT NULL DEFAULT 'running',
                created_at   TEXT NOT NULL,
                updated_at   TEXT,
                completed_at TEXT,
                data         TEXT NOT NULL
            )
        """)
        await db.execute("CREATE INDEX IF NOT EXISTS idx_scans_domain ON scans(domain)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_scans_created ON scans(created_at DESC)")
        await db.commit()


async def save_scan(data: dict):
    scan_id = data["id"]
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO scans (id, domain, status, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?)",
            (scan_id, data["domain"], data.get("status", "running"),
             data["created_at"], data.get("updated_at", ""), json.dumps(data)),
        )
        await db.commit()


async def update_scan(scan_id: str, data: dict):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE scans SET status=?, updated_at=?, completed_at=?, data=? WHERE id=?",
            (data.get("status", "running"), data.get("updated_at", ""),
             data.get("completed_at", ""), json.dumps(data), scan_id),
        )
        await db.commit()


async def get_scan(scan_id: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM scans WHERE id=?", (scan_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


async def list_scans() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM scans ORDER BY created_at DESC LIMIT 50") as cursor:
            rows = await cursor.fetchall()
            summaries = []
            for row in rows:
                data = json.loads(row["data"])
                summaries.append(_scan_summary(data))
            return summaries


async def delete_scan_db(scan_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM scans WHERE id=?", (scan_id,))
        await db.commit()


async def get_scans_for_domain(domain: str) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM scans WHERE domain=? ORDER BY created_at DESC", (domain,)
        ) as cursor:
            rows = await cursor.fetchall()
            return [_scan_summary(json.loads(r["data"])) for r in rows]


def _scan_summary(data: dict) -> dict:
    """Lightweight summary for listing — no full results."""
    results = data.get("results", {})
    summary = data.get("summary", {})

    # Count from results if summary not available
    subs = len(results.get("subfinder", {}).get("subdomains", []))
    subs += len(results.get("amass", {}).get("subdomains", []))
    ports = len(results.get("nmap", {}).get("ports", []))
    vulns = results.get("nuclei", {}).get("counts", {})

    return {
        "id": data.get("id"),
        "domain": data.get("domain"),
        "status": data.get("status"),
        "created_at": data.get("created_at"),
        "completed_at": data.get("completed_at"),
        "duration": data.get("duration", summary.get("duration", 0)),
        "progress": data.get("progress", 0),
        "modules": data.get("modules", []),
        "subdomains": summary.get("subdomains", subs),
        "ports": summary.get("ports", ports),
        "live_hosts": summary.get("live_hosts", 0),
        "critical": vulns.get("critical", summary.get("vulns", {}).get("critical", 0)),
        "high": vulns.get("high", summary.get("vulns", {}).get("high", 0)),
        "medium": vulns.get("medium", summary.get("vulns", {}).get("medium", 0)),
        "directories": summary.get("directories", 0),
        "emails": summary.get("emails", 0),
    }
