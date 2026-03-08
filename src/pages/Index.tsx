import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '@/components/Navbar';
import ScanConfig from '@/components/ScanConfig';
import ResultsDashboard from '@/components/ResultsDashboard';
import ScanHistory from '@/components/ScanHistory';
import TerminalPanel from '@/components/TerminalPanel';
import SettingsPage from '@/components/SettingsPage';
import { ALL_MODULES } from '@/data/mockData';
import { MODULE_SIMULATION, MODULE_ORDER } from '@/data/scanSimulation';

export interface TerminalLine {
  text: string;
  color: string;
}

const colorMap: Record<string, string> = {
  command: 'text-success',
  info: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-danger',
  muted: 'text-muted-foreground',
  default: 'text-foreground',
};

const Index = () => {
  const [domain, setDomain] = useState('example.com');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentModule, setCurrentModule] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>(ALL_MODULES);
  const [hasResults, setHasResults] = useState(true);
  const [activeScanId, setActiveScanId] = useState('scan-001');

  const [showTerminal, setShowTerminal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(280);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);

  const cancelledRef = useRef(false);
  const backendOnline = false;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 't' || e.key === 'T') setShowTerminal(prev => !prev);
      if (e.key === 'h' || e.key === 'H') setShowHistory(prev => !prev);
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowHistory(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const handleStartScan = useCallback(async () => {
    cancelledRef.current = false;
    setIsRunning(true);
    setProgress(0);
    setHasResults(false);
    setShowTerminal(true);
    setTerminalLines([
      { text: `⚡ AutoRecon — scanning ${domain}`, color: 'text-primary' },
      { text: '', color: '' },
    ]);

    const modulesToRun = MODULE_ORDER.filter(
      m => selectedModules.includes(m) && MODULE_SIMULATION[m]
    );

    for (let i = 0; i < modulesToRun.length; i++) {
      if (cancelledRef.current) break;

      const mod = modulesToRun[i];
      const pct = Math.round(((i) / modulesToRun.length) * 100);
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
  }, [selectedModules, domain]);

  const handleCancelScan = () => {
    cancelledRef.current = true;
    setIsRunning(false);
    setProgress(0);
    setCurrentModule('');
    setTerminalLines(prev => [
      ...prev,
      { text: '', color: '' },
      { text: '✗ Scan cancelled', color: 'text-danger' },
    ]);
  };

  const handleLoadScan = (id: string) => {
    setActiveScanId(id);
    setHasResults(true);
    setDomain('example.com');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar
        domain={domain}
        isRunning={isRunning}
        backendOnline={backendOnline}
        showTerminal={showTerminal}
        showHistory={showHistory}
        stealthMode={false}
        onToggleTerminal={() => setShowTerminal(prev => !prev)}
        onToggleHistory={() => setShowHistory(prev => !prev)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <ScanConfig
          domain={domain}
          setDomain={setDomain}
          isRunning={isRunning}
          progress={progress}
          currentModule={currentModule}
          onStartScan={handleStartScan}
          onCancelScan={handleCancelScan}
          selectedModules={selectedModules}
          setSelectedModules={setSelectedModules}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <ResultsDashboard
            domain={domain}
            isRunning={isRunning}
            hasResults={hasResults}
          />

          {showTerminal && (
            <TerminalPanel
              height={terminalHeight}
              onClose={() => setShowTerminal(false)}
              lines={terminalLines}
            />
          )}
        </div>

        {showHistory && (
          <ScanHistory
            onLoadScan={handleLoadScan}
            activeScanId={activeScanId}
          />
        )}
      </div>

      {!backendOnline && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 border border-danger/30 rounded-lg bg-card text-xs font-mono text-danger">
          Backend offline — run: <span className="text-foreground">uvicorn main:app --port 8000</span>
        </div>
      )}

      {showSettings && <SettingsPage onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default Index;
