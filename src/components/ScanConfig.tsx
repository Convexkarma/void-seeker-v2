import { useState } from 'react';
import { MODULES, SCAN_PROFILES, ALL_MODULES } from '@/data/mockData';
import { AlertTriangle, Search } from 'lucide-react';

interface ScanConfigProps {
  domain: string;
  setDomain: (d: string) => void;
  isRunning: boolean;
  progress: number;
  currentModule: string;
  onStartScan: () => void;
  onCancelScan: () => void;
  selectedModules: string[];
  setSelectedModules: (m: string[]) => void;
}

const ScanConfig = ({
  domain,
  setDomain,
  isRunning,
  progress,
  currentModule,
  onStartScan,
  onCancelScan,
  selectedModules,
  setSelectedModules,
}: ScanConfigProps) => {
  const [activeProfile, setActiveProfile] = useState<string>('full');
  const [threads, setThreads] = useState(10);
  const [stealth, setStealth] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const selectProfile = (key: string) => {
    setActiveProfile(key);
    const profile = SCAN_PROFILES[key as keyof typeof SCAN_PROFILES];
    setSelectedModules(profile.modules);
    if (key === 'stealth') setStealth(true);
  };

  const toggleModule = (mod: string) => {
    setActiveProfile('');
    setSelectedModules(
      selectedModules.includes(mod)
        ? selectedModules.filter(m => m !== mod)
        : [...selectedModules, mod]
    );
  };

  const handleDomainChange = (val: string) => {
    setDomain(val);
    if (!val) setAuthorized(false);
  };

  return (
    <div className="w-[280px] min-w-[280px] border-r border-border bg-card flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Scan Configuration</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Target input */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">Target</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={domain}
              onChange={e => handleDomainChange(e.target.value)}
              placeholder="target.com"
              className="w-full bg-background border border-border rounded-sm px-3 pl-8 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:neon-glow-sm transition-smooth"
              disabled={isRunning}
            />
          </div>
        </div>

        {/* Scan profiles */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 block">Profile</label>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(SCAN_PROFILES).map(([key, profile]) => (
              <button
                key={key}
                onClick={() => selectProfile(key)}
                disabled={isRunning}
                className={`px-3 py-2 border rounded-sm text-[11px] font-mono uppercase tracking-wider transition-smooth
                  ${activeProfile === key
                    ? 'border-primary bg-primary/10 text-primary neon-glow-sm'
                    : 'border-border text-secondary-foreground hover:border-primary/30'
                  } disabled:opacity-30`}
              >
                {profile.label}
              </button>
            ))}
          </div>
        </div>

        {/* Module toggles */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 block">Modules</label>
          <div className="space-y-3">
            {Object.entries(MODULES).map(([key, group]) => (
              <div key={key}>
                <span className={`text-[9px] font-mono uppercase tracking-widest mb-1 block
                  ${key === 'recon' ? 'text-primary' :
                    key === 'web' ? 'text-neon-cyan' :
                    key === 'scan' ? 'text-warning' :
                    key === 'fuzz' ? 'text-danger' :
                    key === 'vuln' ? 'text-danger' :
                    'text-accent'}`}>
                  {group.label}
                </span>
                {group.modules.map(mod => (
                  <label
                    key={mod}
                    className="flex items-center gap-2 py-0.5 cursor-pointer group"
                  >
                    <div
                      className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center transition-smooth
                        ${selectedModules.includes(mod)
                          ? 'bg-primary border-primary'
                          : 'border-border group-hover:border-primary/50'
                        }`}
                      onClick={() => !isRunning && toggleModule(mod)}
                    >
                      {selectedModules.includes(mod) && (
                        <span className="text-[10px] text-primary-foreground">✓</span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-secondary-foreground">{mod}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-success ml-auto" title="Installed" />
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center justify-between">
              Threads
              <span className="text-primary">{threads}</span>
            </label>
            <input
              type="range"
              min={1}
              max={50}
              value={threads}
              onChange={e => setThreads(Number(e.target.value))}
              className="w-full accent-primary h-1"
              disabled={isRunning}
            />
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs font-mono text-secondary-foreground">Stealth Mode</span>
            <div
              onClick={() => !isRunning && setStealth(!stealth)}
              className={`w-9 h-5 rounded-full transition-smooth relative cursor-pointer
                ${stealth ? 'bg-primary' : 'bg-border'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-foreground transition-smooth
                ${stealth ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
          </label>
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="bracket-card border border-primary/20 rounded-sm p-3 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-scan-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary">Scanning</span>
              <span className="text-xs font-mono text-primary ml-auto">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full progress-gradient rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {currentModule && (
              <p className="text-[10px] font-mono text-muted-foreground mt-1.5">
                Running: {currentModule}
              </p>
            )}
          </div>
        )}

        {/* Authorization */}
        <div className="border border-danger/30 rounded-sm p-3 bg-danger/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-danger mt-0.5 flex-shrink-0" />
            <label className="cursor-pointer flex items-start gap-2">
              <input
                type="checkbox"
                checked={authorized}
                onChange={e => setAuthorized(e.target.checked)}
                className="mt-0.5 accent-danger"
                disabled={isRunning || !domain}
              />
              <span className="text-[11px] text-danger/80 leading-tight">
                I confirm I have written authorization to test this target.
              </span>
            </label>
          </div>
        </div>

        {/* Launch button */}
        <button
          onClick={isRunning ? onCancelScan : onStartScan}
          disabled={!isRunning && (!domain || !authorized || selectedModules.length === 0)}
          className={`w-full py-3 border-2 rounded-sm font-mono text-sm uppercase tracking-widest transition-smooth
            ${isRunning
              ? 'border-danger text-danger hover:bg-danger/10'
              : 'border-primary text-primary hover:bg-primary hover:text-primary-foreground hover:neon-glow disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-primary'
            }`}
        >
          {isRunning ? '■ CANCEL SCAN' : '⚡ LAUNCH SCAN'}
        </button>

        {/* Legal */}
        <div className="border border-danger/20 rounded-sm p-2">
          <p className="text-[9px] font-mono text-danger/50 leading-relaxed">
            DISCLAIMER: Only use on systems you own or have explicit written permission to test. Unauthorized access is illegal.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ScanConfig;
