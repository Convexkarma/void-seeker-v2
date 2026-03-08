import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ScanConfig from '@/components/ScanConfig';
import ResultsDashboard from '@/components/ResultsDashboard';
import ScanHistory from '@/components/ScanHistory';
import TerminalPanel from '@/components/TerminalPanel';
import SettingsPage from '@/components/SettingsPage';
import { ALL_MODULES } from '@/data/mockData';
import { useScan } from '@/hooks/useScan';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export interface TerminalLine {
  text: string;
  color: string;
}

const Index = () => {
  const [domain, setDomain] = useState('example.com');
  const [selectedModules, setSelectedModules] = useState<string[]>(ALL_MODULES);

  const [showTerminal, setShowTerminal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [terminalHeight] = useState(280);
  const isMobile = useIsMobile();

  const {
    backendOnline,
    isRunning,
    progress,
    currentModule,
    activeScanId,
    hasResults,
    terminalLines,
    scanHistory,
    handleStartScan,
    handleCancelScan,
    handleLoadScan,
    handleDeleteScan,
    handleGenerateReport,
  } = useScan();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 't' || e.key === 'T') setShowTerminal(prev => !prev);
      if (e.key === 'h' || e.key === 'H') setShowHistory(prev => !prev);
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowHistory(false);
        setShowConfig(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const onStartScan = () => {
    setShowTerminal(true);
    if (isMobile) setShowConfig(false);
    handleStartScan(domain, selectedModules);
  };

  const scanConfigElement = (
    <ScanConfig
      domain={domain}
      setDomain={setDomain}
      isRunning={isRunning}
      progress={progress}
      currentModule={currentModule}
      onStartScan={onStartScan}
      onCancelScan={handleCancelScan}
      selectedModules={selectedModules}
      setSelectedModules={setSelectedModules}
    />
  );

  const scanHistoryElement = (
    <ScanHistory
      onLoadScan={handleLoadScan}
      onDeleteScan={handleDeleteScan}
      activeScanId={activeScanId}
      history={scanHistory}
      backendOnline={backendOnline}
    />
  );

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
        onToggleConfig={() => setShowConfig(prev => !prev)}
        showConfig={showConfig}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: inline sidebar */}
        {!isMobile && scanConfigElement}

        <div className="flex-1 flex flex-col overflow-hidden">
          <ResultsDashboard
            domain={domain}
            isRunning={isRunning}
            hasResults={hasResults}
            onGenerateReport={handleGenerateReport}
            backendOnline={backendOnline}
          />

          {showTerminal && (
            <TerminalPanel
              height={isMobile ? 200 : terminalHeight}
              onClose={() => setShowTerminal(false)}
              lines={terminalLines}
            />
          )}
        </div>

        {/* Desktop: inline history sidebar */}
        {!isMobile && showHistory && scanHistoryElement}
      </div>

      {/* Mobile: ScanConfig as sheet from left */}
      {isMobile && (
        <Sheet open={showConfig} onOpenChange={setShowConfig}>
          <SheetContent side="left" className="w-[85vw] max-w-[360px] p-0 bg-card border-border">
            {scanConfigElement}
          </SheetContent>
        </Sheet>
      )}

      {/* Mobile: ScanHistory as sheet from right */}
      {isMobile && (
        <Sheet open={showHistory} onOpenChange={setShowHistory}>
          <SheetContent side="right" className="w-[85vw] max-w-[320px] p-0 bg-card border-border">
            {scanHistoryElement}
          </SheetContent>
        </Sheet>
      )}

      {!backendOnline && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-3 py-2 border border-warning/30 rounded-lg bg-card text-[10px] sm:text-xs font-mono text-warning max-w-[90vw] text-center">
          Demo mode — backend offline. Run: <span className="text-foreground">cd backend && uvicorn main:app --port 8000</span>
        </div>
      )}

      {showSettings && <SettingsPage onClose={() => setShowSettings(false)} backendOnline={backendOnline} />}
    </div>
  );
};

export default Index;
