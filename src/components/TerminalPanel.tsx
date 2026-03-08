import { Terminal as TerminalIcon, Plus, Minus, X } from 'lucide-react';

interface TerminalPanelProps {
  height: number;
  onClose: () => void;
}

const TerminalPanel = ({ height, onClose }: TerminalPanelProps) => {
  const lines = [
    { text: '┌──────────────────────────────────────┐', color: 'text-primary' },
    { text: '│       ⚡ AutoRecon Terminal v1.0      │', color: 'text-primary' },
    { text: '│   Type commands or use the scan UI   │', color: 'text-muted-foreground' },
    { text: '└──────────────────────────────────────┘', color: 'text-primary' },
    { text: '', color: '' },
    { text: '$ whoami', color: 'text-success' },
    { text: 'autorecon-user', color: 'text-foreground' },
    { text: '$ which nmap', color: 'text-success' },
    { text: '/usr/bin/nmap', color: 'text-foreground' },
    { text: '$ nmap --version', color: 'text-success' },
    { text: 'Nmap version 7.94SVN ( https://nmap.org )', color: 'text-foreground' },
    { text: '$ _', color: 'text-success' },
  ];

  return (
    <div
      className="border-t border-border bg-background flex flex-col"
      style={{ height }}
    >
      {/* Header */}
      <div className="h-8 border-b border-border flex items-center px-3 gap-2 bg-card flex-shrink-0">
        <TerminalIcon className="w-3 h-3 text-primary" />
        <div className="flex items-center gap-1">
          <div className="px-2 py-0.5 text-[10px] font-mono bg-primary/10 border border-primary/30 rounded-sm text-primary">
            session-1
          </div>
          <button className="px-1 py-0.5 text-[10px] text-muted-foreground hover:text-primary transition-smooth">
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1" />
        <button className="text-muted-foreground hover:text-foreground transition-smooth">
          <Minus className="w-3 h-3" />
        </button>
        <button onClick={onClose} className="text-muted-foreground hover:text-danger transition-smooth">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-auto p-3 font-mono text-[13px] leading-relaxed">
        {lines.map((line, i) => (
          <div key={i} className={line.color || 'text-foreground'}>
            {line.text || '\u00A0'}
          </div>
        ))}
        <div className="w-2 h-4 bg-primary animate-pulse inline-block" />
      </div>
    </div>
  );
};

export default TerminalPanel;
