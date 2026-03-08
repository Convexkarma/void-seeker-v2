import { useState } from 'react';
import { MOCK_RESULTS } from '@/data/mockData';
import { FileText, Download, Copy, Check, ExternalLink, Filter, Search, X, Eye, EyeOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ResultsDashboardProps {
  domain: string;
  isRunning: boolean;
  hasResults: boolean;
}

const TABS = ['Overview', 'Subdomains', 'Ports', 'Vulns', 'Dirs', 'Tech', 'Screenshots', 'DNS/WHOIS', 'Intel', 'Logs'];

const ResultsDashboard = ({ domain, isRunning, hasResults }: ResultsDashboardProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [vulnFilter, setVulnFilter] = useState('all');
  const [subFilter, setSubFilter] = useState('');
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [selectedLogModule, setSelectedLogModule] = useState('subfinder');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [emailRevealed, setEmailRevealed] = useState<Record<string, boolean>>({});

  const data = MOCK_RESULTS;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copyToClipboard(text, id)} className="text-muted-foreground hover:text-primary transition-smooth">
      {copiedId === id ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
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
  const scoreLabel = attackScore >= 70 ? 'HIGH RISK' : attackScore >= 40 ? 'MODERATE' : 'LIMITED';

  const chartData = [
    { name: 'Critical', count: vulnCounts.critical, fill: 'hsl(345 100% 60%)' },
    { name: 'High', count: vulnCounts.high, fill: 'hsl(29 100% 50%)' },
    { name: 'Medium', count: vulnCounts.medium, fill: 'hsl(49 100% 52%)' },
    { name: 'Low', count: vulnCounts.low, fill: 'hsl(199 100% 50%)' },
    { name: 'Info', count: vulnCounts.info, fill: 'hsl(210 40% 65%)' },
  ];

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex items-center justify-center h-48">
      <div className="border border-border rounded-sm px-6 py-4 text-xs font-mono text-muted-foreground">
        [ {message} ]
      </div>
    </div>
  );

  const renderTab = () => {
    if (!hasResults) {
      return <EmptyState message="No scan results yet. Configure and launch a scan." />;
    }

    switch (activeTab) {
      case 0: return (
        <div className="space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Subdomains', value: data.subdomains.length, color: 'text-primary' },
              { label: 'Live Hosts', value: data.subdomains.filter(s => s.live).length, color: 'text-success' },
              { label: 'Open Ports', value: data.ports.length, color: 'text-neon-cyan' },
              { label: 'Critical', value: vulnCounts.critical, color: 'text-danger' },
              { label: 'High', value: vulnCounts.high, color: 'text-warning' },
              { label: 'Medium', value: vulnCounts.medium, color: 'text-severity-medium' },
              { label: 'Directories', value: data.dirs.length, color: 'text-accent' },
              { label: 'Emails', value: data.emails.length, color: 'text-neon-bright' },
            ].map(stat => (
              <div key={stat.label} className="bracket-card border border-border rounded-sm p-3 bg-background">
                <div className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Attack surface score */}
          <div className="bracket-card border border-border rounded-sm p-4 bg-background">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Attack Surface Score</span>
              <span className={`text-xs font-mono font-bold ${scoreColor}`}>{scoreLabel}</span>
            </div>
            <div className="flex items-end gap-4">
              <span className={`text-5xl font-mono font-bold ${scoreColor}`}>{attackScore}</span>
              <div className="flex-1 mb-2">
                <div className="w-full h-2 bg-border rounded-full overflow-hidden">
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
          <div className="bracket-card border border-border rounded-sm p-4 bg-background">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3 block">Vulnerability Distribution</span>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: 'hsl(210 40% 65%)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(210 40% 35%)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(214 60% 5%)', border: '1px solid hsl(214 60% 15%)', borderRadius: 4, fontFamily: 'JetBrains Mono', fontSize: 11 }}
                  labelStyle={{ color: 'hsl(207 100% 95%)' }}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* WAF + High-risk ports */}
          <div className="grid grid-cols-2 gap-3">
            {data.waf.protected && (
              <div className="border border-accent/30 rounded-sm p-3 bg-accent/5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-accent">WAF Detected</span>
                <div className="text-sm font-mono text-foreground mt-1">{data.waf.name}</div>
              </div>
            )}
            <div className="border border-warning/30 rounded-sm p-3 bg-warning/5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-warning mb-2 block">High-Risk Ports</span>
              <div className="flex flex-wrap gap-1">
                {data.ports.filter(p => p.risk === 'high').map(p => (
                  <span key={p.port} className="px-2 py-0.5 bg-warning/10 border border-warning/30 rounded-sm text-[11px] font-mono text-warning">
                    {p.port}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      );

      case 1: {
        const filtered = data.subdomains.filter(s => s.name.toLowerCase().includes(subFilter.toLowerCase()));
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={subFilter}
                  onChange={e => setSubFilter(e.target.value)}
                  placeholder="Filter subdomains..."
                  className="w-full bg-background border border-border rounded-sm px-3 pl-8 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none transition-smooth"
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{filtered.length} found</span>
              <button className="px-3 py-1.5 border border-border rounded-sm text-[10px] font-mono text-secondary-foreground hover:text-primary hover:border-primary/30 transition-smooth">
                Export CSV
              </button>
            </div>
            <div className="border border-border rounded-sm overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-elevated text-muted-foreground text-[10px] uppercase tracking-wider">
                    <th className="text-left px-3 py-2">Subdomain</th>
                    <th className="text-center px-3 py-2">Status</th>
                    <th className="text-right px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(sub => (
                    <tr key={sub.name} className="hover:bg-elevated/50 transition-smooth">
                      <td className="px-3 py-2 text-primary">{sub.name}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`w-2 h-2 rounded-full inline-block ${sub.live ? 'bg-success' : 'bg-muted-foreground/30'}`} />
                      </td>
                      <td className="px-3 py-2 text-right flex items-center justify-end gap-2">
                        <CopyBtn text={sub.name} id={`sub-${sub.name}`} />
                        <a href={`https://${sub.name}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-smooth">
                          <ExternalLink className="w-3 h-3" />
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

      case 2: return (
        <div className="space-y-4">
          {/* Port grid */}
          <div className="flex flex-wrap gap-1.5">
            {data.ports.map(p => (
              <div
                key={p.port}
                title={`${p.port}/${p.protocol} — ${p.service} — ${p.danger || 'No known issues'}`}
                className={`w-10 h-10 border rounded-sm flex items-center justify-center text-[10px] font-mono cursor-default transition-smooth
                  ${p.risk === 'high' ? 'border-danger/50 bg-danger/10 text-danger hover:neon-glow-sm' :
                    p.risk === 'medium' ? 'border-warning/50 bg-warning/10 text-warning' :
                    'border-border bg-background text-secondary-foreground'}`}
              >
                {p.port}
              </div>
            ))}
          </div>
          {/* Port table */}
          <div className="border border-border rounded-sm overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-elevated text-muted-foreground text-[10px] uppercase tracking-wider">
                  <th className="text-left px-3 py-2">Port</th>
                  <th className="text-left px-3 py-2">Proto</th>
                  <th className="text-left px-3 py-2">Service</th>
                  <th className="text-left px-3 py-2">Product</th>
                  <th className="text-left px-3 py-2">Risk</th>
                  <th className="text-left px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.ports.map(p => (
                  <tr key={p.port} className={`hover:bg-elevated/50 transition-smooth ${p.risk === 'high' ? 'bg-danger/5' : ''}`}>
                    <td className={`px-3 py-2 font-bold ${p.risk === 'high' ? 'text-danger' : p.risk === 'medium' ? 'text-warning' : 'text-foreground'}`}>
                      {p.port}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{p.protocol}</td>
                    <td className="px-3 py-2 text-foreground">{p.service}</td>
                    <td className="px-3 py-2 text-secondary-foreground">{p.product} {p.version}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded-sm text-[9px] uppercase
                        ${p.risk === 'high' ? 'bg-danger/20 text-danger' :
                          p.risk === 'medium' ? 'bg-warning/20 text-warning' :
                          'bg-muted text-muted-foreground'}`}>
                        {p.risk}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-[10px]">{p.danger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

      case 3: {
        const filteredVulns = data.vulns.filter(v => vulnFilter === 'all' || v.severity === vulnFilter);
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {['all', 'critical', 'high', 'medium', 'low', 'info'].map(f => (
                <button
                  key={f}
                  onClick={() => setVulnFilter(f)}
                  className={`px-3 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider transition-smooth border
                    ${vulnFilter === f
                      ? f === 'critical' ? 'border-danger bg-danger/10 text-danger' :
                        f === 'high' ? 'border-warning bg-warning/10 text-warning' :
                        f === 'medium' ? 'border-severity-medium bg-severity-medium/10 text-severity-medium' :
                        f === 'low' ? 'border-primary bg-primary/10 text-primary' :
                        f === 'info' ? 'border-secondary-foreground bg-secondary text-secondary-foreground' :
                        'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/30'
                    }`}
                >
                  {f} {f !== 'all' ? `(${vulnCounts[f as keyof typeof vulnCounts]})` : `(${totalVulns})`}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {filteredVulns.map((v, i) => (
                <div
                  key={i}
                  className={`border rounded-sm p-3 bg-background transition-smooth
                    ${v.severity === 'critical' ? 'border-l-2 border-l-danger border-border' :
                      v.severity === 'high' ? 'border-l-2 border-l-warning border-border' :
                      v.severity === 'medium' ? 'border-l-2 border-l-severity-medium border-border' :
                      'border-border'}
                    ${v.fp ? 'opacity-40 line-through' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-mono uppercase font-bold
                        ${v.severity === 'critical' ? 'bg-danger/20 text-danger' :
                          v.severity === 'high' ? 'bg-warning/20 text-warning' :
                          v.severity === 'medium' ? 'bg-severity-medium/20 text-severity-medium' :
                          v.severity === 'low' ? 'bg-primary/20 text-primary' :
                          'bg-muted text-muted-foreground'}`}>
                        {v.severity}
                      </span>
                      <span className="text-xs font-mono text-foreground">{v.template}</span>
                    </div>
                    <button className="text-[9px] font-mono text-muted-foreground hover:text-primary transition-smooth">
                      Mark FP
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-neon-cyan mb-1">{v.url}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{v.raw}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 4: {
        const dirs = sensitiveOnly ? data.dirs.filter(d => d.sensitive) : data.dirs;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sensitiveOnly}
                  onChange={e => setSensitiveOnly(e.target.checked)}
                  className="accent-danger"
                />
                <span className="text-xs font-mono text-secondary-foreground">Sensitive only</span>
              </label>
              <span className="text-[10px] font-mono text-muted-foreground">{dirs.length} directories</span>
            </div>
            <div className="border border-border rounded-sm overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-elevated text-muted-foreground text-[10px] uppercase tracking-wider">
                    <th className="text-left px-3 py-2">Path</th>
                    <th className="text-center px-3 py-2">Status</th>
                    <th className="text-center px-3 py-2">Sensitive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dirs.map(d => (
                    <tr key={d.path} className={`hover:bg-elevated/50 transition-smooth ${d.sensitive ? 'bg-danger/5' : ''}`}>
                      <td className="px-3 py-2 text-foreground flex items-center gap-1.5">
                        {d.path.includes('.git') && <span title="Git">📁</span>}
                        {d.path.includes('.env') && <span title="Env">🔑</span>}
                        {d.path.includes('admin') && <span title="Admin">🛡</span>}
                        {d.path}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`${d.status < 300 ? 'text-success' : d.status < 400 ? 'text-severity-medium' : 'text-muted-foreground'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {d.sensitive && <span className="text-danger text-[10px]">⚠</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 5: return (
        <div className="space-y-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 block">Technologies Detected</span>
            <div className="flex flex-wrap gap-2">
              {data.tech.map(t => (
                <div key={t.name} className="px-3 py-1.5 border border-border rounded-sm bg-background">
                  <span className="text-xs font-mono text-primary">{t.name}</span>
                  {t.version && <span className="text-[10px] font-mono text-muted-foreground ml-1.5">{t.version}</span>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 block">HTTP Headers</span>
            <div className="border border-border rounded-sm overflow-hidden">
              <table className="w-full text-xs font-mono">
                <tbody className="divide-y divide-border">
                  {data.headers.map(h => (
                    <tr key={h.key} className="hover:bg-elevated/50 transition-smooth">
                      <td className="px-3 py-2 text-neon-cyan w-1/3">{h.key}</td>
                      <td className="px-3 py-2 text-foreground">{h.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 block">Missing Security Headers</span>
            <div className="flex flex-wrap gap-1.5">
              {data.missingHeaders.map(h => (
                <span key={h} className="px-2 py-1 border border-danger/30 rounded-sm bg-danger/5 text-[10px] font-mono text-danger">
                  ✗ {h}
                </span>
              ))}
            </div>
          </div>
        </div>
      );

      case 6: return (
        <div>
          <EmptyState message="Screenshots require gowitness + backend. Mock preview shown below." />
          <div className="grid grid-cols-3 gap-3 mt-4">
            {['www.example.com', 'api.example.com', 'admin.example.com'].map(host => (
              <div
                key={host}
                onClick={() => setLightboxImg(host)}
                className="bracket-card border border-border rounded-sm overflow-hidden cursor-pointer hover:border-primary/30 transition-smooth group"
              >
                <div className="aspect-video bg-elevated flex items-center justify-center">
                  <span className="text-xs font-mono text-muted-foreground group-hover:text-primary transition-smooth">[Screenshot]</span>
                </div>
                <div className="px-2 py-1.5 text-[10px] font-mono text-secondary-foreground truncate">{host}</div>
              </div>
            ))}
          </div>
          {lightboxImg && (
            <div className="fixed inset-0 z-50 flex items-center justify-center glass" onClick={() => setLightboxImg(null)}>
              <div className="relative bg-card border border-border rounded-sm p-8 max-w-2xl">
                <button onClick={() => setLightboxImg(null)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
                <div className="aspect-video bg-elevated flex items-center justify-center rounded-sm">
                  <span className="text-sm font-mono text-muted-foreground">{lightboxImg}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      );

      case 7: return (
        <div className="space-y-6">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 block">DNS Records</span>
            <div className="border border-border rounded-sm overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-elevated text-muted-foreground text-[10px] uppercase tracking-wider">
                    <th className="text-left px-3 py-2">Domain</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.dns.map((r, i) => (
                    <tr key={i} className="hover:bg-elevated/50 transition-smooth">
                      <td className="px-3 py-2 text-success">{r.domain}</td>
                      <td className="px-3 py-2"><span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-sm text-[9px]">{r.type}</span></td>
                      <td className="px-3 py-2 text-foreground">{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 block">WHOIS</span>
            <div className="border border-border rounded-sm overflow-hidden">
              <table className="w-full text-xs font-mono">
                <tbody className="divide-y divide-border">
                  {Object.entries(data.whois).filter(([k]) => k !== 'nameservers').map(([k, v]) => (
                    <tr key={k} className="hover:bg-elevated/50 transition-smooth">
                      <td className="px-3 py-2 text-neon-cyan w-1/3 capitalize">{k}</td>
                      <td className="px-3 py-2 text-foreground">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 block">Email Security</span>
            <div className="flex gap-3">
              {Object.entries(data.emailSecurity).map(([k, v]) => (
                <span key={k} className={`px-3 py-1.5 border rounded-sm text-xs font-mono ${v ? 'border-success/30 text-success bg-success/5' : 'border-danger/30 text-danger bg-danger/5'}`}>
                  {v ? '✓' : '✗'} {k.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>
      );

      case 8: return (
        <div className="space-y-6">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 block">
              Emails ({data.emails.length})
            </span>
            <div className="space-y-1.5">
              {data.emails.map(email => {
                const revealed = emailRevealed[email];
                const redacted = email.replace(/^(.).*(@.*)$/, '$1••••$2');
                return (
                  <div key={email} className="flex items-center gap-2 px-3 py-2 border border-border rounded-sm bg-background">
                    <span className="text-xs font-mono text-foreground flex-1">{revealed ? email : redacted}</span>
                    <button
                      onClick={() => setEmailRevealed(prev => ({ ...prev, [email]: !prev[email] }))}
                      className="text-muted-foreground hover:text-primary transition-smooth"
                    >
                      {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <CopyBtn text={email} id={`email-${email}`} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );

      case 9: return (
        <div className="flex gap-0 h-full min-h-[400px]">
          {/* Module list */}
          <div className="w-36 min-w-[136px] border-r border-border overflow-y-auto">
            {Object.keys(data.logs).map(mod => (
              <button
                key={mod}
                onClick={() => setSelectedLogModule(mod)}
                className={`w-full text-left px-3 py-2 text-xs font-mono transition-smooth border-l-2
                  ${selectedLogModule === mod
                    ? 'border-l-primary bg-primary/5 text-primary'
                    : 'border-l-transparent text-secondary-foreground hover:bg-elevated/50'
                  }`}
              >
                {mod}
              </button>
            ))}
          </div>
          {/* Log output */}
          <div className="flex-1 overflow-auto p-3 bg-background">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => copyToClipboard((data.logs as Record<string, string[]>)[selectedLogModule]?.join('\n') || '', 'logs-all')}
                className="px-2 py-1 border border-border rounded-sm text-[9px] font-mono text-muted-foreground hover:text-primary hover:border-primary/30 transition-smooth"
              >
                {copiedId === 'logs-all' ? '✓ Copied' : 'Copy All'}
              </button>
            </div>
            <div className="font-mono text-[12px] leading-relaxed">
              {((data.logs as Record<string, string[]>)[selectedLogModule] || []).map((line, i) => (
                <div key={i} className="flex">
                  <span className="w-8 text-right text-muted-foreground/50 mr-3 select-none">{i + 1}</span>
                  <span className={line.startsWith('$') ? 'text-success' : 'text-foreground'}>{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

      default: return <EmptyState message="Tab not implemented yet." />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-primary">{domain || 'No target'}</span>
          {hasResults && (
            <span className="px-2 py-0.5 bg-neon-cyan/10 border border-neon-cyan/30 rounded-sm text-[9px] font-mono text-neon-cyan uppercase">
              Completed
            </span>
          )}
        </div>
        {hasResults && (
          <div className="flex gap-1.5">
            {['HTML', 'PDF', 'JSON', 'MD'].map(fmt => (
              <button key={fmt} className="px-2 py-1 border border-border rounded-sm text-[9px] font-mono uppercase text-secondary-foreground hover:text-primary hover:border-primary/30 transition-smooth">
                {fmt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border overflow-x-auto bg-card">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider whitespace-nowrap transition-smooth border-b-2 flex items-center gap-1.5
              ${activeTab === i
                ? 'border-b-primary text-primary'
                : 'border-b-transparent text-muted-foreground hover:text-secondary-foreground'
              }`}
          >
            {tab}
            {tab === 'Vulns' && hasResults && totalVulns > 0 && (
              <span className="px-1 py-0 bg-danger/20 text-danger text-[8px] rounded-sm">{totalVulns}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderTab()}
      </div>
    </div>
  );
};

export default ResultsDashboard;
