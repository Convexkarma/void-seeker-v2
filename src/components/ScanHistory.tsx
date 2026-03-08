import { MOCK_RESULTS, timeAgo } from '@/data/mockData';
import { Trash2 } from 'lucide-react';

interface ScanHistoryEntry {
  id: string;
  domain: string;
  status: string;
  created_at: string;
  subdomains: number;
  critical: number;
  high: number;
  ports: number;
}

interface ScanHistoryProps {
  onLoadScan: (id: string) => void;
  onDeleteScan?: (id: string) => void;
  activeScanId: string;
  history?: ScanHistoryEntry[];
  backendOnline?: boolean;
}

const ScanHistory = ({ onLoadScan, onDeleteScan, activeScanId, history, backendOnline }: ScanHistoryProps) => {
  const entries = backendOnline && history && history.length > 0
    ? history
    : MOCK_RESULTS.scanHistory;

  return (
    <div className="w-full sm:w-[280px] sm:min-w-[280px] border-l border-border bg-card flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Scan History</h2>
        {backendOnline && (
          <p className="text-[10px] text-success mt-0.5">● Live from backend</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="p-5 text-center">
            <p className="text-sm text-muted-foreground">No scans yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map(scan => (
              <div
                key={scan.id}
                onClick={() => onLoadScan(scan.id)}
                className={`px-5 py-4 cursor-pointer transition-smooth group hover:bg-background
                  ${activeScanId === scan.id ? 'bg-background border-l-2 border-l-primary' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono font-medium text-primary">{scan.domain}</span>
                  {onDeleteScan && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteScan(scan.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-smooth text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  {scan.status === 'completed' ? (
                    <span className="text-xs text-success font-medium">✓ Completed</span>
                  ) : scan.status === 'running' ? (
                    <span className="flex items-center gap-1.5 text-xs text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-scan-pulse" />
                      Scanning
                    </span>
                  ) : (
                    <span className="text-xs text-danger">✗ Cancelled</span>
                  )}
                  <span className="text-xs text-muted-foreground">{timeAgo(scan.created_at)}</span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">{scan.subdomains} subs</span>
                  {scan.critical > 0 && <span className="text-danger font-medium">{scan.critical} crit</span>}
                  {scan.high > 0 && <span className="text-warning font-medium">{scan.high} high</span>}
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
