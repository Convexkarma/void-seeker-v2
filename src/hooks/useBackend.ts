const API_BASE = 'http://127.0.0.1:8000';
const WS_BASE = 'ws://127.0.0.1:8000';

export interface ScanConfig {
  domain: string;
  modules: string[];
  threads?: number;
  wordlist?: string;
  stealth?: boolean;
  proxy?: string;
}

export interface ScanMessage {
  type: string;
  module?: string;
  line?: string;
  command?: string;
  index?: number;
  total?: number;
  progress?: number;
  parsed?: Record<string, unknown>;
  exit_code?: number;
  status?: string;
  duration?: number;
  summary?: Record<string, unknown>;
  results?: Record<string, unknown>;
  scan_id?: string;
  reason?: string;
  install_hint?: string;
  error?: string;
}

export interface ScanHistoryEntry {
  id: string;
  domain: string;
  status: string;
  created_at: string;
  completed_at?: string;
  duration: number;
  progress: number;
  subdomains: number;
  ports: number;
  critical: number;
  high: number;
  medium: number;
}

// ── Health check ──────────────────────────────────────────────────
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Start scan ──────────────────────────────────────────────────
export async function startScan(config: ScanConfig): Promise<{ scan_id: string }> {
  const res = await fetch(`${API_BASE}/api/scan/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`Failed to start scan: ${res.statusText}`);
  return res.json();
}

// ── Cancel scan ─────────────────────────────────────────────────
export async function cancelScan(scanId: string): Promise<void> {
  await fetch(`${API_BASE}/api/scan/${scanId}/cancel`, { method: 'POST' });
}

// ── Load scan results ───────────────────────────────────────────
export async function loadScanResults(scanId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/api/scan/${scanId}/results`);
  if (!res.ok) throw new Error('Scan not found');
  return res.json();
}

// ── Scan history ────────────────────────────────────────────────
export async function fetchScanHistory(): Promise<ScanHistoryEntry[]> {
  const res = await fetch(`${API_BASE}/api/scan/history`);
  if (!res.ok) return [];
  const raw = await res.json();
  // Normalize: backend may return summary as nested object
  return raw.map((entry: Record<string, unknown>) => {
    const summary = (entry.summary || {}) as Record<string, number>;
    return {
      id: entry.id,
      domain: entry.domain,
      status: entry.status,
      created_at: entry.created_at,
      completed_at: entry.completed_at,
      duration: entry.duration || 0,
      progress: entry.progress || 0,
      subdomains: entry.subdomains ?? summary.subdomains ?? 0,
      ports: entry.ports ?? summary.open_ports ?? 0,
      critical: entry.critical ?? summary.critical ?? 0,
      high: entry.high ?? summary.high ?? 0,
      medium: entry.medium ?? summary.medium ?? 0,
    } as ScanHistoryEntry;
  });
}

// ── Delete scan ─────────────────────────────────────────────────
export async function deleteScan(scanId: string): Promise<void> {
  await fetch(`${API_BASE}/api/scan/${scanId}`, { method: 'DELETE' });
}

// ── Tool check ──────────────────────────────────────────────────
export async function checkTools(): Promise<Record<string, { installed: boolean; version: string; path: string }>> {
  const res = await fetch(`${API_BASE}/api/tools/check`, { method: 'POST' });
  if (!res.ok) return {};
  return res.json();
}

// ── Settings ────────────────────────────────────────────────────
export async function getSettings(): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/api/settings`);
  if (!res.ok) return {};
  return res.json();
}

export async function saveSettings(settings: Record<string, unknown>): Promise<void> {
  await fetch(`${API_BASE}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
}

// ── Report generation ───────────────────────────────────────────
export async function generateReport(scanId: string, format: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/report/generate?scan_id=${scanId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format }),
  });
  if (!res.ok) throw new Error('Report generation failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report.${format === 'markdown' ? 'md' : format}`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Scan compare ────────────────────────────────────────────────
export async function compareScan(idA: string, idB: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/api/scan/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scan_id_a: idA, scan_id_b: idB }),
  });
  if (!res.ok) throw new Error('Compare failed');
  return res.json();
}

// ── WebSocket: Scan stream ──────────────────────────────────────
export function connectScanWS(
  scanId: string,
  onMessage: (msg: ScanMessage) => void,
  onClose?: () => void,
): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/scan/${scanId}`);
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      onMessage(msg);
    } catch {
      // ignore non-JSON
    }
  };
  ws.onclose = () => onClose?.();
  ws.onerror = () => onClose?.();
  return ws;
}

// ── WebSocket: Terminal ─────────────────────────────────────────
export function connectTerminalWS(
  sessionId: string,
  onData: (data: ArrayBuffer) => void,
  onClose?: () => void,
): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/terminal/${sessionId}`);
  ws.binaryType = 'arraybuffer';
  ws.onmessage = (event) => {
    if (event.data instanceof ArrayBuffer) {
      onData(event.data);
    } else if (typeof event.data === 'string') {
      // JSON control messages
      try {
        JSON.parse(event.data);
      } catch {
        onData(new TextEncoder().encode(event.data).buffer);
      }
    }
  };
  ws.onclose = () => onClose?.();
  ws.onerror = () => onClose?.();
  return ws;
}
