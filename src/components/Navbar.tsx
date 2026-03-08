import { Zap, Terminal, LayoutGrid, Settings, Shield, Wifi, WifiOff } from 'lucide-react';

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
}

const Navbar = ({
  domain,
  isRunning,
  backendOnline,
  showTerminal,
  showHistory,
  stealthMode,
  onToggleTerminal,
  onToggleHistory,
  onOpenSettings,
}: NavbarProps) => {
  return (
    <header className="h-12 border-b border-border flex items-center px-4 gap-3 bg-card relative z-50">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <Zap className="w-4 h-4 text-primary" />
        <span className="font-display font-bold text-sm tracking-wider text-primary neon-text-glow">
          AUTO_RECON
        </span>
      </div>

      {/* Scan indicator */}
      {isRunning && domain && (
        <div className="flex items-center gap-2 px-3 py-1 border border-primary/30 rounded-sm bg-primary/5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-scan-pulse" />
          <span className="text-xs font-mono text-primary tracking-wide">
            SCANNING {domain}
          </span>
        </div>
      )}

      {/* Stealth indicator */}
      {stealthMode && (
        <span className="text-xs px-2 py-0.5 border border-accent/30 rounded-sm text-accent font-mono">
          👻 STEALTH
        </span>
      )}

      <div className="flex-1" />

      {/* Backend status */}
      <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-mono tracking-wide">
        {backendOnline ? (
          <>
            <Wifi className="w-3 h-3 text-success" />
            <span className="text-success">ONLINE</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 text-danger animate-pulse" />
            <span className="text-danger">OFFLINE</span>
          </>
        )}
      </div>

      {/* Action buttons */}
      <button
        onClick={onToggleTerminal}
        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-sm text-[11px] font-mono uppercase tracking-wider transition-smooth
          ${showTerminal
            ? 'border-primary/50 bg-primary/10 text-primary'
            : 'border-border text-secondary-foreground hover:border-primary/30 hover:text-primary'
          }`}
      >
        <Terminal className="w-3 h-3" />
        Terminal
        <kbd className="text-[9px] text-muted-foreground ml-1">T</kbd>
      </button>

      <button
        onClick={onToggleHistory}
        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-sm text-[11px] font-mono uppercase tracking-wider transition-smooth
          ${showHistory
            ? 'border-primary/50 bg-primary/10 text-primary'
            : 'border-border text-secondary-foreground hover:border-primary/30 hover:text-primary'
          }`}
      >
        <LayoutGrid className="w-3 h-3" />
        History
        <kbd className="text-[9px] text-muted-foreground ml-1">H</kbd>
      </button>

      <button
        onClick={onOpenSettings}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm text-[11px] font-mono uppercase tracking-wider text-secondary-foreground hover:border-primary/30 hover:text-primary transition-smooth"
      >
        <Settings className="w-3 h-3" />
        Settings
      </button>

      {/* Auth badge */}
      <div className="flex items-center gap-1.5 px-2 py-1 border border-danger/40 rounded-sm">
        <Shield className="w-3 h-3 text-danger" />
        <span className="text-[10px] font-mono text-danger tracking-wide">AUTH ONLY</span>
      </div>
    </header>
  );
};

export default Navbar;
