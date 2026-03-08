import { useState } from 'react';
import { MODULES, SCAN_PROFILES, ALL_MODULES } from '@/data/mockData';
import { AlertTriangle, ChevronDown, ChevronUp, Play, Square } from 'lucide-react';

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
  const [authorized, setAuthorized] = useState(false);
  const [showModules, setShowModules] = useState(false);

  const selectProfile = (key: string) => {
    setActiveProfile(key);
    const profile = SCAN_PROFILES[key as keyof typeof SCAN_PROFILES];
    setSelectedModules(profile.modules);
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
    <div className="w-full sm:w-[300px] sm:min-w-[300px] border-r border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Scan Setup</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Configure and launch your reconnaissance scan</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Step 1: Target */}
        <div>
          <label className="text-xs font-medium text-foreground mb-2 block">
            1. Enter Target Domain
          </label>
          <input
            type="text"
            value={domain}
            onChange={e => handleDomainChange(e.target.value)}
            placeholder="example.com"
            className="w-full bg-background border border-border rounded px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-smooth"
            disabled={isRunning}
          />
        </div>

        {/* Step 2: Scan Profile */}
        <div>
          <label className="text-xs font-medium text-foreground mb-2 block">
            2. Choose Scan Profile
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(SCAN_PROFILES).map(([key, profile]) => (
              <button
                key={key}
                onClick={() => selectProfile(key)}
                disabled={isRunning}
                className={`px-3 py-2.5 border rounded text-sm font-medium transition-smooth
                  ${activeProfile === key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-secondary-foreground hover:border-primary/30'
                  } disabled:opacity-30`}
              >
                {profile.label}
                <span className="block text-[10px] text-muted-foreground mt-0.5 font-normal">
                  {profile.modules.length} tools
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Expandable modules */}
        <div>
          <button
            onClick={() => setShowModules(!showModules)}
            className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-smooth"
          >
            <span>{selectedModules.length} of {ALL_MODULES.length} modules selected</span>
            {showModules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showModules && (
            <div className="mt-3 space-y-3 border border-border rounded p-3 bg-background">
              {Object.entries(MODULES).map(([key, group]) => (
                <div key={key}>
                  <span className={`text-[10px] font-mono uppercase tracking-wider mb-1.5 block
                    ${key === 'recon' ? 'text-primary' :
                      key === 'web' ? 'text-neon-cyan' :
                      key === 'scan' ? 'text-warning' :
                      key === 'fuzz' || key === 'vuln' ? 'text-danger' :
                      'text-accent'}`}>
                    {group.label}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {group.modules.map(mod => (
                      <button
                        key={mod}
                        onClick={() => !isRunning && toggleModule(mod)}
                        className={`px-2 py-1 rounded text-xs font-mono transition-smooth border
                          ${selectedModules.includes(mod)
                            ? 'bg-primary/15 border-primary/40 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/30'
                          }`}
                      >
                        {mod}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="border border-primary/30 rounded p-4 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-scan-pulse" />
                <span className="text-sm font-medium text-primary">Scanning...</span>
              </div>
              <span className="text-lg font-mono font-bold text-primary">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full progress-gradient rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {currentModule && (
              <p className="text-xs text-muted-foreground">
                Running <span className="text-primary font-mono">{currentModule}</span>
              </p>
            )}
          </div>
        )}

        {/* Step 3: Authorization */}
        <div className="border border-danger/20 rounded p-3 bg-danger/5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={authorized}
              onChange={e => setAuthorized(e.target.checked)}
              className="mt-1 accent-danger w-4 h-4"
              disabled={isRunning || !domain}
            />
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-danger">
                <AlertTriangle className="w-3.5 h-3.5" />
                Authorization Required
              </div>
              <p className="text-xs text-danger/70 mt-1">
                I have written permission to test this target.
              </p>
            </div>
          </label>
        </div>

        {/* Launch button */}
        <button
          onClick={isRunning ? onCancelScan : onStartScan}
          disabled={!isRunning && (!domain || !authorized || selectedModules.length === 0)}
          className={`w-full py-3.5 rounded font-medium text-sm flex items-center justify-center gap-2 transition-smooth
            ${isRunning
              ? 'bg-danger/10 border border-danger text-danger hover:bg-danger/20'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4" />
              Cancel Scan
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Launch Scan
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ScanConfig;
