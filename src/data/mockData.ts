export const MODULES = {
  recon: { label: 'RECON', color: 'neon-blue', modules: ['subfinder', 'amass', 'dnsx', 'dig', 'whois'] },
  web: { label: 'WEB', color: 'neon-cyan', modules: ['httpx', 'whatweb', 'wafw00f', 'curl_headers'] },
  scan: { label: 'SCAN', color: 'warning', modules: ['nmap', 'testssl'] },
  fuzz: { label: 'FUZZ', color: 'danger', modules: ['gobuster'] },
  vuln: { label: 'VULN', color: 'danger', modules: ['nuclei'] },
  osint: { label: 'OSINT', color: 'neon-purple', modules: ['theHarvester', 'gowitness'] },
};

export const SCAN_PROFILES = {
  passive: { label: 'PASSIVE', modules: ['subfinder', 'amass', 'dnsx', 'dig', 'whois', 'theHarvester'] },
  quick: { label: 'QUICK', modules: ['subfinder', 'dnsx', 'httpx', 'nmap', 'whatweb', 'curl_headers'] },
  full: { label: 'FULL', modules: Object.values(MODULES).flatMap(g => g.modules) },
  stealth: { label: 'STEALTH', modules: ['subfinder', 'dnsx', 'dig', 'whois'] },
};

export const MOCK_RESULTS = {
  subdomains: [
    { name: 'www.example.com', live: true },
    { name: 'api.example.com', live: true },
    { name: 'mail.example.com', live: true },
    { name: 'dev.example.com', live: false },
    { name: 'staging.example.com', live: true },
    { name: 'cdn.example.com', live: true },
    { name: 'admin.example.com', live: true },
    { name: 'blog.example.com', live: false },
    { name: 'vpn.example.com', live: true },
    { name: 'ftp.example.com', live: false },
    { name: 'ns1.example.com', live: true },
    { name: 'ns2.example.com', live: true },
  ],
  ports: [
    { port: 22, protocol: 'tcp', state: 'open', service: 'ssh', product: 'OpenSSH', version: '8.9p1', risk: 'high', danger: 'Remote access - brute force target' },
    { port: 80, protocol: 'tcp', state: 'open', service: 'http', product: 'nginx', version: '1.24.0', risk: 'medium', danger: 'Unencrypted web traffic' },
    { port: 443, protocol: 'tcp', state: 'open', service: 'https', product: 'nginx', version: '1.24.0', risk: 'low', danger: '' },
    { port: 3306, protocol: 'tcp', state: 'open', service: 'mysql', product: 'MySQL', version: '8.0.35', risk: 'high', danger: 'Database exposed to network' },
    { port: 8080, protocol: 'tcp', state: 'open', service: 'http-proxy', product: 'Apache Tomcat', version: '9.0', risk: 'medium', danger: 'Alternative HTTP port' },
    { port: 6379, protocol: 'tcp', state: 'open', service: 'redis', product: 'Redis', version: '7.2.3', risk: 'high', danger: 'In-memory DB - often unauthed' },
    { port: 5432, protocol: 'tcp', state: 'open', service: 'postgresql', product: 'PostgreSQL', version: '15.4', risk: 'high', danger: 'Database exposed to network' },
    { port: 21, protocol: 'tcp', state: 'open', service: 'ftp', product: 'vsftpd', version: '3.0.5', risk: 'high', danger: 'Legacy protocol - cleartext creds' },
  ],
  vulns: [
    { id: 'CVE-2023-44487', severity: 'critical', template: 'http2-rapid-reset', url: 'https://example.com', matcher: 'HTTP/2 Rapid Reset Attack', raw: '[critical] [cve] https://example.com [http2-rapid-reset]', fp: false },
    { id: 'CVE-2023-38545', severity: 'high', template: 'curl-socks5-heap-overflow', url: 'https://api.example.com', matcher: 'curl SOCKS5 heap overflow', raw: '[high] [cve] https://api.example.com [curl-heap-overflow]', fp: false },
    { id: 'missing-csp', severity: 'medium', template: 'missing-csp-header', url: 'https://example.com', matcher: 'Content-Security-Policy header missing', raw: '[medium] [misconfiguration] https://example.com [missing-csp]', fp: false },
    { id: 'missing-hsts', severity: 'medium', template: 'missing-hsts', url: 'https://example.com', matcher: 'Strict-Transport-Security missing', raw: '[medium] [misconfiguration] https://example.com [missing-hsts]', fp: false },
    { id: 'directory-listing', severity: 'low', template: 'directory-listing', url: 'https://cdn.example.com/assets/', matcher: 'Directory listing enabled', raw: '[low] [exposure] https://cdn.example.com/assets/ [directory-listing]', fp: false },
    { id: 'server-info', severity: 'info', template: 'nginx-version', url: 'https://example.com', matcher: 'nginx/1.24.0', raw: '[info] [tech] https://example.com [nginx-version]', fp: false },
  ],
  dirs: [
    { path: '/.git/config', status: 200, sensitive: true },
    { path: '/.env', status: 403, sensitive: true },
    { path: '/admin', status: 302, sensitive: true },
    { path: '/api/v1/docs', status: 200, sensitive: false },
    { path: '/robots.txt', status: 200, sensitive: false },
    { path: '/wp-admin', status: 404, sensitive: true },
    { path: '/swagger', status: 200, sensitive: true },
    { path: '/phpinfo.php', status: 200, sensitive: true },
    { path: '/backup', status: 403, sensitive: true },
    { path: '/sitemap.xml', status: 200, sensitive: false },
    { path: '/.htaccess', status: 403, sensitive: true },
    { path: '/graphql', status: 200, sensitive: true },
  ],
  tech: [
    { name: 'nginx', version: '1.24.0' },
    { name: 'React', version: '18.2' },
    { name: 'Node.js', version: '' },
    { name: 'Cloudflare', version: '' },
    { name: 'jQuery', version: '3.7.1' },
    { name: 'Bootstrap', version: '5.3' },
    { name: 'MySQL', version: '8.0' },
    { name: 'Redis', version: '7.2' },
    { name: 'Docker', version: '' },
    { name: 'Kubernetes', version: '' },
  ],
  headers: [
    { key: 'Server', value: 'nginx/1.24.0' },
    { key: 'X-Powered-By', value: 'Express' },
    { key: 'Content-Type', value: 'text/html; charset=utf-8' },
    { key: 'X-Request-ID', value: 'a1b2c3d4-e5f6-7890' },
    { key: 'Cache-Control', value: 'public, max-age=3600' },
  ],
  missingHeaders: ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Frame-Options', 'Permissions-Policy'],
  dns: [
    { domain: 'example.com', type: 'A', value: '93.184.216.34' },
    { domain: 'example.com', type: 'AAAA', value: '2606:2800:220:1:248:1893:25c8:1946' },
    { domain: 'example.com', type: 'MX', value: '10 mail.example.com' },
    { domain: 'example.com', type: 'NS', value: 'ns1.example.com' },
    { domain: 'example.com', type: 'TXT', value: 'v=spf1 include:_spf.google.com ~all' },
    { domain: 'example.com', type: 'CNAME', value: 'cdn.example.com → d1234.cloudfront.net' },
  ],
  whois: {
    registrar: 'GoDaddy.com, LLC',
    registrant: 'REDACTED FOR PRIVACY',
    created: '1995-08-14',
    updated: '2023-08-14',
    expires: '2025-08-13',
    nameservers: ['ns1.example.com', 'ns2.example.com'],
    status: 'clientDeleteProhibited',
  },
  emailSecurity: { spf: true, dmarc: true, dkim: false },
  emails: [
    'admin@example.com',
    'support@example.com',
    'john.doe@example.com',
    'info@example.com',
    'webmaster@example.com',
  ],
  waf: { protected: true, name: 'Cloudflare' },
  scanHistory: [
    { id: 'scan-001', domain: 'example.com', status: 'completed', created_at: new Date(Date.now() - 3600000).toISOString(), duration: 342, subdomains: 12, critical: 1, high: 1, ports: 8 },
    { id: 'scan-002', domain: 'test.org', status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString(), duration: 198, subdomains: 5, critical: 0, high: 3, ports: 4 },
    { id: 'scan-003', domain: 'target.io', status: 'cancelled', created_at: new Date(Date.now() - 172800000).toISOString(), duration: 45, subdomains: 2, critical: 0, high: 0, ports: 2 },
  ],
  logs: {
    subfinder: [
      '$ subfinder -d example.com -silent -all -o /tmp/subdomains_sf.txt',
      'www.example.com',
      'api.example.com',
      'mail.example.com',
      'dev.example.com',
      'staging.example.com',
      'cdn.example.com',
      '[INF] Found 6 subdomains for example.com in 4.2s',
    ],
    nmap: [
      '$ nmap -sV -sC -T4 --open example.com -oX /tmp/nmap.xml',
      'Starting Nmap 7.94 ( https://nmap.org ) at 2024-01-15 10:30 UTC',
      'Nmap scan report for example.com (93.184.216.34)',
      'PORT     STATE SERVICE  VERSION',
      '22/tcp   open  ssh      OpenSSH 8.9p1',
      '80/tcp   open  http     nginx 1.24.0',
      '443/tcp  open  https    nginx 1.24.0',
      '3306/tcp open  mysql    MySQL 8.0.35',
      '6379/tcp open  redis    Redis 7.2.3',
      'Service detection performed. 8 services scanned.',
      'Nmap done: 1 IP address (1 host up) scanned in 23.45 seconds',
    ],
    nuclei: [
      '$ nuclei -u http://example.com -severity low,medium,high,critical -silent',
      '[critical] [CVE-2023-44487] [http] https://example.com',
      '[high] [CVE-2023-38545] [http] https://api.example.com',
      '[medium] [missing-csp-header] [http] https://example.com',
      '[medium] [missing-hsts] [http] https://example.com',
      '[low] [directory-listing] [http] https://cdn.example.com/assets/',
      '[info] [nginx-version] [http] https://example.com',
    ],
  },
};

export const ALL_MODULES = Object.values(MODULES).flatMap(g => g.modules);

export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
