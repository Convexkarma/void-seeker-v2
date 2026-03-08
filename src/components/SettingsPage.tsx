import { useState } from 'react';
import { X, Eye, EyeOff, RefreshCw, Check } from 'lucide-react';

interface SettingsPageProps {
  onClose: () => void;
  backendOnline?: boolean;
}

const SettingsPage = ({ onClose, backendOnline }: SettingsPageProps) => {
  const [saved, setSaved] = useState(false);

  const tools = [
    { name: 'nmap', version: '7.94', installed: true },
    { name: 'subfinder', version: '2.6.3', installed: true },
    { name: 'nuclei', version: '3.1.0', installed: true },
    { name: 'httpx', version: '1.3.7', installed: true },
    { name: 'amass', version: '4.2.0', installed: true },
    { name: 'gobuster', version: '3.6', installed: true },
    { name: 'whatweb', version: '0.5.5', installed: true },
    { name: 'dnsx', version: '1.2.1', installed: true },
    { name: 'gowitness', version: '2.5.1', installed: false },
    { name: 'wafw00f', version: '', installed: false },
    { name: 'testssl', version: '', installed: false },
    { name: 'theHarvester', version: '4.4.0', installed: true },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 glass" />
      <div
        className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-card border border-border rounded-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-sm font-mono uppercase tracking-widest text-foreground">Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-smooth">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* API Keys */}
          <section>
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">API Keys</h3>
            <div className="grid grid-cols-2 gap-3">
              {['Shodan', 'VirusTotal', 'Censys ID', 'SecurityTrails', 'IPInfo', 'GitHub Token'].map(key => (
                <div key={key}>
                  <label className="text-[10px] font-mono text-secondary-foreground mb-1 block">{key}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-background border border-border rounded-sm px-3 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none transition-smooth"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Notifications */}
          <section>
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Notifications</h3>
            <div className="space-y-3">
              {['Discord Webhook URL', 'Slack Webhook URL'].map(label => (
                <div key={label}>
                  <label className="text-[10px] font-mono text-secondary-foreground mb-1 block">{label}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://..."
                      className="flex-1 bg-background border border-border rounded-sm px-3 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none transition-smooth"
                    />
                    <button className="px-3 py-1.5 border border-border rounded-sm text-[10px] font-mono text-secondary-foreground hover:border-primary/30 hover:text-primary transition-smooth">
                      Test
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tool Status */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Tool Status</h3>
              <button className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-muted-foreground hover:text-primary transition-smooth">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {tools.map(tool => (
                <div key={tool.name} className="flex items-center gap-2 p-2 border border-border rounded-sm bg-background">
                  <span className={`w-1.5 h-1.5 rounded-full ${tool.installed ? 'bg-success' : 'bg-danger'}`} />
                  <span className="text-xs font-mono text-foreground">{tool.name}</span>
                  {tool.version && (
                    <span className="text-[9px] font-mono text-muted-foreground ml-auto">{tool.version}</span>
                  )}
                </div>
              ))}
            </div>
            <button className="mt-3 w-full py-2 border border-border rounded-sm text-xs font-mono text-secondary-foreground hover:border-primary/30 hover:text-primary transition-smooth">
              Run Setup Script (bash setup.sh)
            </button>
          </section>

          {/* Save */}
          <button
            onClick={handleSave}
            className="w-full py-2.5 border-2 border-primary rounded-sm font-mono text-sm uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground transition-smooth flex items-center justify-center gap-2"
          >
            {saved ? <><Check className="w-4 h-4" /> Saved</> : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
