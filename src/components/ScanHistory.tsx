import { MOCK_RESULTS, timeAgo } from '@/data/mockData';
import { Trash2 } from 'lucide-react';

interface ScanHistoryProps {
  onLoadScan: (id: string) => void;
  activeScanId: string;
}

const ScanHistory = ({ onLoadScan, activeScanId }: ScanHistoryProps) => {
  const history = MOCK_RESULTS.scanHistory;

  return (
    <div className="w-[264px] min-w-[264px] border-l border-border bg-card flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Scan History</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs font-mono text-muted-foreground">No scans yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {history.map(scan => (
              <div
                key={scan.id}
                onClick={() => onLoadScan(scan.id)}
                className={`px-4 py-3 cursor-pointer transition-smooth group hover:bg-elevated
                  ${activeScanId === scan.id ? 'bg-elevated border-l-2 border-l-primary' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-mono text-primary">{scan.domain}</span>
                  <button className="opacity-0 group-hover:opacity-100 transition-smooth text-muted-foreground hover:text-danger">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  {scan.status === 'completed' ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-neon-cyan">
                      ■ COMPLETED
                    </span>
                  ) : scan.status === 'running' ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-primary">
                      <span className="w-1 h-1 rounded-full bg-primary animate-scan-pulse" />
                      SCANNING
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-danger">✗ CANCELLED</span>
                  )}
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {timeAgo(scan.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="text-secondary-foreground">{scan.subdomains} subs</span>
                  {scan.critical > 0 && (
                    <span className="text-danger">{scan.critical} crit</span>
                  )}
                  {scan.high > 0 && (
                    <span className="text-warning">{scan.high} high</span>
                  )}
                  <span className="text-muted-foreground">{scan.ports} ports</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanHistory;
