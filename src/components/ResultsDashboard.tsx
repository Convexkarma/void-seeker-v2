import { useState } from 'react';
import { MOCK_RESULTS } from '@/data/mockData';
import { Copy, Check, ExternalLink, Search, X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ResultsDashboardProps {
  domain: string;
  isRunning: boolean;
  hasResults: boolean;
  onGenerateReport?: (format: string) => void;
  backendOnline?: boolean;
}

const TABS = ['Overview', 'Subdomains', 'Ports', 'Vulnerabilities', 'Directories', 'Tech & Headers', 'DNS & WHOIS', 'Logs'];

const ResultsDashboard = ({ domain, isRunning, hasResults, onGenerateReport, backendOnline }: ResultsDashboardProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [vulnFilter, setVulnFilter] = useState('all');
  const [subFilter, setSubFilter] = useState('');
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [selectedLogModule, setSelectedLogModule] = useState('subfinder');
  const [emailRevealed, setEmailRevealed] = useState<Record<string, boolean>>({});

  const data = MOCK_RESULTS;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copyToClipboard(text, id)} className="text-muted-foreground hover:text-primary transition-smooth p-1">
      {copiedId === id ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );

  const vulnCounts = {
    critical: data.vulns.filter(v => v.severity === 'critical' && !v.fp).length,
    high: data.vulns.filter(v => v.severity === 'high' && !v.fp).length,
    medium: data.vulns.filter(v => v.severity === 'medium' && !v.fp).length,
    low: data.vulns.filter(v => v.severity === 'low' && !v.fp).length,
    info: data.vulns.filter(v => v.severity === 'info' && !v.fp).length,
  };

  const totalVulns = vulnCounts.critical + vulnCounts.high + vulnCounts.medium + vulnCounts.low;

  const attackScore = Math.min(100, Math.floor(
    data.subdomains.length * 0.5 +
    data.ports.length * 2 +
    vulnCounts.critical * 20 + vulnCounts.high * 10 + vulnCounts.medium * 5 + vulnCounts.low * 2 +
    data.dirs.length * 0.3
  ));

  const scoreColor = attackScore >= 70 ? 'text-danger' : attackScore >= 40 ? 'text-warning' : 'text-success';
  const scoreLabel = attackScore >= 70 ? 'High Risk' : attackScore >= 40 ? 'Moderate' : 'Low Risk';

  const chartData = [
    { name: 'Critical', count: vulnCounts.critical, fill: 'hsl(345 100% 60%)' },
    { name: 'High', count: vulnCounts.high, fill: 'hsl(29 100% 50%)' },
    { name: 'Medium', count: vulnCounts.medium, fill: 'hsl(49 100% 52%)' },
    { name: 'Low', count: vulnCounts.low, fill: 'hsl(199 100% 50%)' },
    { name: 'Info', count: vulnCounts.info, fill: 'hsl(210 40% 65%)' },
  ];

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <AlertCircle className="w-8 h-8 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

  const renderTab = () => {
    if (!hasResults) {
      return <EmptyState message="No results yet. Launch a scan to get started." />;
    }

    switch (activeTab) {
      // ─── Overview ─────────────────────────
      case 0: return (
        <div className="space-y-6">
          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Subdomains', value: data.subdomains.length, color: 'text-primary' },
              { label: 'Open Ports', value: data.ports.length, color: 'text-neon-cyan' },
              { label: 'Vulnerabilities', value: totalVulns, color: 'text-danger' },
              { label: 'Directories', value: data.dirs.length, color: 'text-accent' },
            ].map(stat => (
              <div key={stat.label} className="border border-border rounded-lg p-4 bg-card">
                <div className={`text-3xl font-mono font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Risk score */}
          <div className="border border-border rounded-lg p-5 bg-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">Attack Surface Score</h3>
              <span className={`text-sm font-medium ${scoreColor}`}>{scoreLabel}</span>
            </div>
            <div className="flex items-end gap-4">
              <span className={`text-5xl font-mono font-bold ${scoreColor}`}>{attackScore}</span>
              <div className="flex-1 mb-2">
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${attackScore}%`,
                      background: attackScore >= 70 ? 'hsl(345 100% 60%)' : attackScore >= 40 ? 'hsl(29 100% 50%)' : 'hsl(153 100% 50%)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vuln chart */}
          <div className="border border-border rounded-lg p-5 bg-card">
            <h3 className="text-sm font-medium text-foreground mb-4">Vulnerability Breakdown</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: 'hsl(210 40% 65%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(210 40% 35%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(214 60% 5%)', border: '1px solid hsl(214 60% 15%)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'hsl(207 100% 95%)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick info row */}
          <div className="grid grid-cols-2 gap-3">
            {data.waf.protected && (
              <div className="border border-accent/20 rounded-lg p-4 bg-accent/5">
                <p className="text-xs text-muted-foreground">WAF Detected</p>
                <p className="text-sm font-medium text-accent mt-1">{data.waf.name}</p>
              </div>
            )}
            <div className="border border-warning/20 rounded-lg p-4 bg-warning/5">
              <p className="text-xs text-muted-foreground">High-Risk Ports</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {data.ports.filter(p => p.risk === 'high').map(p => (
                  <span key={p.port} className="px-2 py-0.5 bg-warning/10 border border-warning/30 rounded text-xs font-mono text-warning">
                    {p.port}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Emails */}
          <div className="border border-border rounded-lg p-5 bg-card">
            <h3 className="text-sm font-medium text-foreground mb-3">Discovered Emails ({data.emails.length})</h3>
            <div className="flex flex-wrap gap-2">
              {data.emails.map(email => {
                const revealed = emailRevealed[email];
                const redacted = email.replace(/^(.).*(@.*)$/, '$1••••$2');
                return (
                  <div key={email} className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border rounded bg-background text-xs font-mono">
                    <span className="text-foreground">{revealed ? email : redacted}</span>
                    <button onClick={() => setEmailRevealed(prev => ({ ...prev, [email]: !prev[email] }))} className="text-muted-foreground hover:text-primary">
                      {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );

      // ─── Subdomains ─────────────────────────
      case 1: {
        const filtered = data.subdomains.filter(s => s.name.toLowerCase().includes(subFilter.toLowerCase()));
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={subFilter}
                  onChange={e => setSubFilter(e.target.value)}
                  placeholder="Search subdomains..."
                  className="w-full bg-background border border-border rounded-lg px-3 pl-9 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-smooth"
                />
              </div>
              <span className="text-sm text-muted-foreground">{filtered.length} found</span>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card text-muted-foreground text-xs">
                    <th className="text-left px-4 py-3">Subdomain</th>
                    <th className="text-center px-4 py-3">Live</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-sm">
                  {filtered.map(sub => (
                    <tr key={sub.name} className="hover:bg-card/50 transition-smooth">
                      <td className="px-4 py-2.5 text-primary">{sub.name}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${sub.live ? 'bg-success' : 'bg-muted-foreground/20'}`} />
                      </td>
                      <td className="px-4 py-2.5 text-right flex items-center justify-end gap-1">
                        <CopyBtn text={sub.name} id={`sub-${sub.name}`} />
                        <a href={`https://${sub.name}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary p-1">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // ─── Ports ─────────────────────────
      case 2: return (
        <div className="space-y-4">
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-card text-muted-foreground text-xs">
                  <th className="text-left px-4 py-3">Port</th>
                  <th className="text-left px-4 py-3">Service</th>
                  <th className="text-left px-4 py-3">Product</th>
                  <th className="text-left px-4 py-3">Risk</th>
                  <th className="text-left px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.ports.map(p => (
                  <tr key={p.port} className={`hover:bg-card/50 transition-smooth ${p.risk === 'high' ? 'bg-danger/5' : ''}`}>
                    <td className={`px-4 py-2.5 font-mono font-bold ${p.risk === 'high' ? 'text-danger' : p.risk === 'medium' ? 'text-warning' : 'text-foreground'}`}>
                      {p.port}/{p.protocol}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{p.service}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.product} {p.version}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-1 rounded text-xs font-medium
                        ${p.risk === 'high' ? 'bg-danger/15 text-danger' :
                          p.risk === 'medium' ? 'bg-warning/15 text-warning' :
                          'bg-muted text-muted-foreground'}`}>
                        {p.risk}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.danger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

      // ─── Vulnerabilities ─────────────────────────
      case 3: {
        const filteredVulns = data.vulns.filter(v => vulnFilter === 'all' || v.severity === vulnFilter);
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {['all', 'critical', 'high', 'medium', 'low', 'info'].map(f => (
                <button
                  key={f}
                  onClick={() => setVulnFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth border
                    ${vulnFilter === f
                      ? f === 'critical' ? 'border-danger bg-danger/10 text-danger' :
                        f === 'high' ? 'border-warning bg-warning/10 text-warning' :
                        f === 'medium' ? 'border-severity-medium bg-severity-medium/10 text-severity-medium' :
                        f === 'low' ? 'border-primary bg-primary/10 text-primary' :
                        'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {f === 'all' ? `All (${totalVulns})` : `${f} (${vulnCounts[f as keyof typeof vulnCounts]})`}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {filteredVulns.map((v, i) => (
                <div
                  key={i}
                  className={`border rounded-lg p-4 bg-card transition-smooth
                    ${v.severity === 'critical' ? 'border-l-4 border-l-danger border-t-border border-r-border border-b-border' :
                      v.severity === 'high' ? 'border-l-4 border-l-warning border-t-border border-r-border border-b-border' :
                      'border-border'}
                    ${v.fp ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                      ${v.severity === 'critical' ? 'bg-danger/20 text-danger' :
                        v.severity === 'high' ? 'bg-warning/20 text-warning' :
                        v.severity === 'medium' ? 'bg-severity-medium/20 text-severity-medium' :
                        v.severity === 'low' ? 'bg-primary/20 text-primary' :
                        'bg-muted text-muted-foreground'}`}>
                      {v.severity}
                    </span>
                    <span className="text-sm font-medium text-foreground">{v.template}</span>
                  </div>
                  <p className="text-xs font-mono text-primary mb-1">{v.url}</p>
                  <p className="text-xs text-muted-foreground">{v.matcher}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ─── Directories ─────────────────────────
      case 4: {
        const dirs = sensitiveOnly ? data.dirs.filter(d => d.sensitive) : data.dirs;
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={sensitiveOnly} onChange={e => setSensitiveOnly(e.target.checked)} className="accent-danger w-4 h-4" />
                <span className="text-sm text-foreground">Sensitive only</span>
              </label>
              <span className="text-sm text-muted-foreground">{dirs.length} paths</span>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card text-muted-foreground text-xs">
                    <th className="text-left px-4 py-3">Path</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-center px-4 py-3">Sensitive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {dirs.map(d => (
                    <tr key={d.path} className={`hover:bg-card/50 transition-smooth ${d.sensitive ? 'bg-danger/5' : ''}`}>
                      <td className="px-4 py-2.5 text-foreground">{d.path}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`${d.status < 300 ? 'text-success' : d.status < 400 ? 'text-warning' : 'text-muted-foreground'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {d.sensitive && <span className="text-danger">⚠</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // ─── Tech & Headers ─────────────────────────
      case 5: return (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Technologies</h3>
            <div className="flex flex-wrap gap-2">
              {data.tech.map(t => (
                <div key={t.name} className="px-3 py-2 border border-border rounded-lg bg-card">
                  <span className="text-sm text-primary">{t.name}</span>
                  {t.version && <span className="text-xs text-muted-foreground ml-1.5">{t.version}</span>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">HTTP Headers</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {data.headers.map(h => (
                    <tr key={h.key} className="hover:bg-card/50 transition-smooth">
                      <td className="px-4 py-2.5 text-primary w-1/3 font-medium">{h.key}</td>
                      <td className="px-4 py-2.5 text-foreground font-mono text-xs">{h.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Missing Security Headers</h3>
            <div className="flex flex-wrap gap-2">
              {data.missingHeaders.map(h => (
                <span key={h} className="px-3 py-1.5 border border-danger/20 rounded-lg bg-danger/5 text-xs text-danger">
                  ✗ {h}
                </span>
              ))}
            </div>
          </div>
        </div>
      );

      // ─── DNS & WHOIS ─────────────────────────
      case 6: return (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">DNS Records</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card text-muted-foreground text-xs">
                    <th className="text-left px-4 py-3">Domain</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.dns.map((r, i) => (
                    <tr key={i} className="hover:bg-card/50 transition-smooth">
                      <td className="px-4 py-2.5 font-mono text-success text-xs">{r.domain}</td>
                      <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{r.type}</span></td>
                      <td className="px-4 py-2.5 text-foreground font-mono text-xs">{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">WHOIS</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {Object.entries(data.whois).filter(([k]) => k !== 'nameservers').map(([k, v]) => (
                    <tr key={k} className="hover:bg-card/50 transition-smooth">
                      <td className="px-4 py-2.5 text-primary w-1/3 capitalize font-medium">{k}</td>
                      <td className="px-4 py-2.5 text-foreground">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Email Security</h3>
            <div className="flex gap-3">
              {Object.entries(data.emailSecurity).map(([k, v]) => (
                <span key={k} className={`px-4 py-2 border rounded-lg text-sm font-medium ${v ? 'border-success/30 text-success bg-success/5' : 'border-danger/30 text-danger bg-danger/5'}`}>
                  {v ? '✓' : '✗'} {k.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>
      );

      // ─── Logs ─────────────────────────
      case 7: return (
        <div className="flex gap-0 h-full min-h-[400px] border border-border rounded-lg overflow-hidden">
          <div className="w-40 border-r border-border bg-card overflow-y-auto">
            {Object.keys(data.logs).map(mod => (
              <button
                key={mod}
                onClick={() => setSelectedLogModule(mod)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-smooth
                  ${selectedLogModule === mod
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                  }`}
              >
                {mod}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto p-4 bg-background">
            <div className="flex justify-end mb-3">
              <button
                onClick={() => copyToClipboard((data.logs as Record<string, string[]>)[selectedLogModule]?.join('\n') || '', 'logs-all')}
                className="px-3 py-1.5 border border-border rounded text-xs text-muted-foreground hover:text-primary hover:border-primary/30 transition-smooth"
              >
                {copiedId === 'logs-all' ? '✓ Copied' : 'Copy All'}
              </button>
            </div>
            <div className="font-mono text-xs leading-relaxed">
              {((data.logs as Record<string, string[]>)[selectedLogModule] || []).map((line, i) => (
                <div key={i} className="flex py-0.5">
                  <span className="w-8 text-right text-muted-foreground/40 mr-3 select-none text-[10px]">{i + 1}</span>
                  <span className={line.startsWith('$') ? 'text-success' : 'text-foreground'}>{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

      default: return <EmptyState message="Coming soon." />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="px-3 sm:px-5 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-card">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-sm sm:text-base font-mono font-medium text-primary truncate">{domain || 'No target'}</span>
          {hasResults && (
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-success/10 border border-success/30 rounded text-[10px] sm:text-xs text-success whitespace-nowrap">
              Completed
            </span>
          )}
          {isRunning && (
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-primary/10 border border-primary/30 rounded text-[10px] sm:text-xs text-primary flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-scan-pulse" />
              Scanning
            </span>
          )}
        </div>
        {hasResults && (
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            {['HTML', 'PDF', 'JSON', 'MD'].map(fmt => (
              <button key={fmt} className="px-2 sm:px-3 py-1 sm:py-1.5 border border-border rounded text-[10px] sm:text-xs text-muted-foreground hover:text-primary hover:border-primary/30 transition-smooth">
                Export {fmt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border overflow-x-auto bg-card px-2">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-3 text-sm whitespace-nowrap transition-smooth border-b-2 flex items-center gap-2
              ${activeTab === i
                ? 'border-b-primary text-primary font-medium'
                : 'border-b-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            {tab}
            {tab === 'Vulnerabilities' && hasResults && totalVulns > 0 && (
              <span className="px-1.5 py-0.5 bg-danger/20 text-danger text-[10px] rounded-full font-medium">{totalVulns}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5">
        {renderTab()}
      </div>
    </div>
  );
};

export default ResultsDashboard;
