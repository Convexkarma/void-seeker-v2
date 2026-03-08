import { useState, useEffect, useCallback, useRef } from 'react';
import {
  checkHealth, startScan as apiStartScan, cancelScan as apiCancelScan,
  connectScanWS, fetchScanHistory, deleteScan as apiDeleteScan,
  loadScanResults, generateReport as apiGenerateReport,
  ScanConfig, ScanMessage, ScanHistoryEntry,
} from './useBackend';
import { MODULE_SIMULATION, MODULE_ORDER } from '@/data/scanSimulation';
import { TerminalLine } from '@/pages/Index';

const colorMap: Record<string, string> = {
  command: 'text-success',
  info: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-danger',
  muted: 'text-muted-foreground',
  default: 'text-foreground',
};

export function useScan() {
  const [backendOnline, setBackendOnline] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentModule, setCurrentModule] = useState('');
  const [activeScanId, setActiveScanId] = useState('');
  const [hasResults, setHasResults] = useState(false);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const cancelledRef = useRef(false);

  // Health check polling
  useEffect(() => {
    const check = async () => setBackendOnline(await checkHealth());
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load history when backend comes online
  useEffect(() => {
    if (backendOnline) {
      fetchScanHistory().then(setScanHistory).catch(() => {});
    }
  }, [backendOnline]);

  // Refresh history periodically
  useEffect(() => {
    if (!backendOnline) return;
    const interval = setInterval(() => {
      fetchScanHistory().then(setScanHistory).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [backendOnline]);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // Start scan — real backend or simulation
  const handleStartScan = useCallback(async (domain: string, selectedModules: string[]) => {
    cancelledRef.current = false;
    setIsRunning(true);
    setProgress(0);
    setHasResults(false);
    setTerminalLines([
      { text: `⚡ AutoRecon — scanning ${domain}`, color: 'text-primary' },
      { text: '', color: '' },
    ]);

    if (backendOnline) {
      // Real backend mode
      try {
        const config: ScanConfig = { domain, modules: selectedModules };
        const { scan_id } = await apiStartScan(config);
        setActiveScanId(scan_id);

        const ws = connectScanWS(scan_id, (msg: ScanMessage) => {
          switch (msg.type) {
            case 'module_start':
              setCurrentModule(msg.module || '');
              setProgress(msg.progress || 0);
              setTerminalLines(prev => [
                ...prev,
                { text: '', color: '' },
                { text: `── [${msg.index}/${msg.total}] ${msg.module} ──`, color: 'text-accent' },
              ]);
              break;
            case 'command':
              setTerminalLines(prev => [
                ...prev,
                { text: `$ ${msg.command}`, color: 'text-success' },
              ]);
              break;
            case 'output':
              setTerminalLines(prev => [
                ...prev,
                { text: msg.line || '', color: 'text-foreground' },
              ]);
              break;
            case 'module_skip':
              setTerminalLines(prev => [
                ...prev,
                { text: `⚠ ${msg.module} skipped: ${msg.reason}`, color: 'text-warning' },
                { text: `  Install: ${msg.install_hint}`, color: 'text-muted-foreground' },
              ]);
              break;
            case 'module_complete':
              setTerminalLines(prev => [
                ...prev,
                { text: `✓ ${msg.module} done (exit: ${msg.exit_code})`, color: msg.exit_code === 0 ? 'text-success' : 'text-warning' },
              ]);
              setProgress(msg.progress || 0);
              break;
            case 'module_error':
              setTerminalLines(prev => [
                ...prev,
                { text: `✗ ${msg.module} error: ${msg.error}`, color: 'text-danger' },
              ]);
              break;
            case 'scan_complete':
              setProgress(100);
              setCurrentModule('');
              setIsRunning(false);
              setHasResults(true);
              setResults(msg.results || null);
              setTerminalLines(prev => [
                ...prev,
                { text: '', color: '' },
                { text: `⚡ Scan complete — ${domain} (${msg.duration}s)`, color: 'text-success' },
              ]);
              fetchScanHistory().then(setScanHistory).catch(() => {});
              break;
            case 'cancelled':
              setIsRunning(false);
              setProgress(0);
              setCurrentModule('');
              setTerminalLines(prev => [
                ...prev,
                { text: '', color: '' },
                { text: '✗ Scan cancelled', color: 'text-danger' },
              ]);
              break;
          }
        }, () => {
          // onClose
          if (!cancelledRef.current) {
            setIsRunning(false);
          }
        });
        wsRef.current = ws;
      } catch (err) {
        setTerminalLines(prev => [
          ...prev,
          { text: `✗ Failed to start: ${err}`, color: 'text-danger' },
        ]);
        setIsRunning(false);
      }
    } else {
      // Simulation mode (offline)
      const modulesToRun = MODULE_ORDER.filter(
        m => selectedModules.includes(m) && MODULE_SIMULATION[m]
      );

      for (let i = 0; i < modulesToRun.length; i++) {
        if (cancelledRef.current) break;
        const mod = modulesToRun[i];
        const pct = Math.round((i / modulesToRun.length) * 100);
        setProgress(pct);
        setCurrentModule(mod);

        setTerminalLines(prev => [
          ...prev,
          { text: '', color: '' },
          { text: `── [${i + 1}/${modulesToRun.length}] ${mod} ──`, color: 'text-accent' },
        ]);

        const lines = MODULE_SIMULATION[mod] || [];
        for (const line of lines) {
          if (cancelledRef.current) break;
          const text = line.text
            .replace(/\{domain\}/g, domain)
            .replace(/\{DOMAIN\}/g, domain.toUpperCase());
          setTerminalLines(prev => [
            ...prev,
            { text, color: colorMap[line.color || 'default'] || 'text-foreground' },
          ]);
          await sleep(line.delay || 100);
        }

        if (!cancelledRef.current) {
          setTerminalLines(prev => [
            ...prev,
            { text: `✓ ${mod} done`, color: 'text-success' },
          ]);
          await sleep(200);
        }
      }

      if (!cancelledRef.current) {
        setProgress(100);
        setCurrentModule('');
        setIsRunning(false);
        setHasResults(true);
        setTerminalLines(prev => [
          ...prev,
          { text: '', color: '' },
          { text: `⚡ Scan complete — ${domain}`, color: 'text-success' },
        ]);
      }
    }
  }, [backendOnline]);

  const handleCancelScan = useCallback(async () => {
    cancelledRef.current = true;
    if (backendOnline && activeScanId) {
      try {
        await apiCancelScan(activeScanId);
      } catch { /* ignore */ }
    }
    wsRef.current?.close();
    setIsRunning(false);
    setProgress(0);
    setCurrentModule('');
    setTerminalLines(prev => [
      ...prev,
      { text: '', color: '' },
      { text: '✗ Scan cancelled', color: 'text-danger' },
    ]);
  }, [backendOnline, activeScanId]);

  const handleLoadScan = useCallback(async (id: string) => {
    setActiveScanId(id);
    if (backendOnline) {
      try {
        const data = await loadScanResults(id);
        setResults(data);
        setHasResults(true);
      } catch {
        // Fallback to mock
        setHasResults(true);
      }
    } else {
      setHasResults(true);
    }
  }, [backendOnline]);

  const handleDeleteScan = useCallback(async (id: string) => {
    if (backendOnline) {
      try {
        await apiDeleteScan(id);
        setScanHistory(prev => prev.filter(s => s.id !== id));
      } catch { /* ignore */ }
    }
  }, [backendOnline]);

  const handleGenerateReport = useCallback(async (format: string) => {
    if (backendOnline && activeScanId) {
      try {
        await apiGenerateReport(activeScanId, format);
      } catch (err) {
        console.error('Report error:', err);
      }
    }
  }, [backendOnline, activeScanId]);

  return {
    backendOnline,
    isRunning,
    progress,
    currentModule,
    activeScanId,
    hasResults,
    terminalLines,
    scanHistory,
    results,
    handleStartScan,
    handleCancelScan,
    handleLoadScan,
    handleDeleteScan,
    handleGenerateReport,
  };
}
