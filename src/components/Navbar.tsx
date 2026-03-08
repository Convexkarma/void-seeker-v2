import { Zap, Terminal, Clock, Settings, Shield, Menu } from 'lucide-react';

interface NavbarProps {
  domain: string;
  isRunning: boolean;
  backendOnline: boolean;
  showTerminal: boolean;
  showHistory: boolean;
  stealthMode: boolean;
  onToggleTerminal: () => void;
  onToggleHistory: () => void;
  onOpenSettings: () => void;
  onToggleConfig?: () => void;
  showConfig?: boolean;
}

const Navbar = ({
  isRunning,
  domain,
  backendOnline,
  showTerminal,
  showHistory,
  onToggleTerminal,
  onToggleHistory,
  onOpenSettings,
  onToggleConfig,
  showConfig,
}: NavbarProps) => {
  return (
    <header className="h-14 border-b border-border flex items-center px-3 sm:px-5 gap-2 sm:gap-4 bg-card">
      {/* Mobile menu button */}
      {onToggleConfig && (
        <button
          onClick={onToggleConfig}
          className={`sm:hidden flex items-center justify-center p-2 rounded transition-smooth
            ${showConfig ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Logo */}
      <div className="flex items-center gap-2 mr-2 sm:mr-6">
        <Zap className="w-5 h-5 text-primary" />
        <span className="font-display font-bold text-base tracking-wider text-primary neon-text-glow hidden xs:inline sm:inline">
          AutoRecon
        </span>
      </div>

      {/* Scan status */}
      {isRunning && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-primary/30 rounded bg-primary/5">
          <span className="w-2 h-2 rounded-full bg-primary animate-scan-pulse" />
          <span className="text-sm font-mono text-primary">Scanning {domain}</span>
        </div>
      )}

      {/* Mobile scan indicator */}
      {isRunning && (
        <div className="sm:hidden flex items-center gap-1.5 px-2 py-1 border border-primary/30 rounded bg-primary/5">
          <span className="w-2 h-2 rounded-full bg-primary animate-scan-pulse" />
          <span className="text-xs font-mono text-primary">Scanning</span>
        </div>
      )}

      {/* Backend status */}
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${backendOnline ? 'text-success' : 'text-danger'}`}>
        <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-success' : 'bg-danger animate-pulse'}`} />
        <span className="hidden sm:inline">{backendOnline ? 'Backend OK' : 'Offline'}</span>
      </div>

      <div className="flex-1" />

      {/* Toggle buttons */}
      <button
        onClick={onToggleTerminal}
        className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded text-sm transition-smooth
          ${showTerminal ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <Terminal className="w-4 h-4" />
        <span className="hidden md:inline">Terminal</span>
      </button>

      <button
        onClick={onToggleHistory}
        className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded text-sm transition-smooth
          ${showHistory ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <Clock className="w-4 h-4" />
        <span className="hidden md:inline">History</span>
      </button>

      <button
        onClick={onOpenSettings}
        className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded text-sm text-muted-foreground hover:text-foreground transition-smooth"
      >
        <Settings className="w-4 h-4" />
      </button>

      <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 border border-danger/30 rounded text-danger">
        <Shield className="w-3.5 h-3.5" />
        <span className="text-[10px] font-mono">AUTH ONLY</span>
      </div>
    </header>
  );
};

export default Navbar;
