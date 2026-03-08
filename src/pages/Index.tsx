import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import ScanConfig from '@/components/ScanConfig';
import ResultsDashboard from '@/components/ResultsDashboard';
import ScanHistory from '@/components/ScanHistory';
import TerminalPanel from '@/components/TerminalPanel';
import SettingsPage from '@/components/SettingsPage';
import { ALL_MODULES } from '@/data/mockData';

const Index = () => {
  const [domain, setDomain] = useState('example.com');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentModule, setCurrentModule] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>(ALL_MODULES);
  const [hasResults, setHasResults] = useState(true);
  const [activeScanId, setActiveScanId] = useState('scan-001');

  const [showTerminal, setShowTerminal] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(280);

  const backendOnline = false; // Mock: no real backend

  // Keyboard shortcuts
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

  const handleStartScan = useCallback(() => {
    setIsRunning(true);
    setProgress(0);
    setHasResults(false);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 8;
      if (p >= 100) {
        p = 100;
        setIsRunning(false);
        setHasResults(true);
        setCurrentModule('');
        clearInterval(interval);
      }
      setProgress(Math.min(100, Math.round(p)));
      const modIndex = Math.floor((p / 100) * selectedModules.length);
      setCurrentModule(selectedModules[Math.min(modIndex, selectedModules.length - 1)]);
    }, 800);
  }, [selectedModules]);

  const handleCancelScan = () => {
    setIsRunning(false);
    setProgress(0);
    setCurrentModule('');
  };

  const handleLoadScan = (id: string) => {
    setActiveScanId(id);
    setHasResults(true);
    setDomain('example.com');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden grid-bg">
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

      {/* Backend offline banner */}
      {!backendOnline && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 border border-danger/50 rounded-sm bg-card text-xs font-mono text-danger neon-glow-sm">
          Backend offline — run: <span className="text-foreground">uvicorn main:app --port 8000</span>
        </div>
      )}

      {showSettings && <SettingsPage onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default Index;
