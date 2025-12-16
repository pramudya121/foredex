import { useState } from 'react';
import { CONTRACTS, TOKENS, NEXUS_TESTNET } from '@/config/contracts';
import { 
  Book, 
  Code, 
  Shield, 
  Zap, 
  ExternalLink, 
  Copy, 
  CheckCircle2,
  GitBranch,
  Layers,
  Wallet,
  ArrowRightLeft,
  Droplets,
  BarChart3,
  Rocket,
  Settings,
  Globe,
  ChevronRight,
  Download,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import wolfLogo from '@/assets/wolf-logo.png';

const DOCS_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: Book },
  { id: 'updates', label: "Today's Updates", icon: Sparkles },
  { id: 'technology', label: 'Technology Stack', icon: Code },
  { id: 'contracts', label: 'Smart Contracts', icon: Shield },
  { id: 'features', label: 'Features', icon: Zap },
  { id: 'roadmap', label: 'Roadmap', icon: GitBranch },
];

const TECH_STACK = [
  { name: 'React 18', description: 'Modern UI library with hooks and concurrent features', category: 'Frontend' },
  { name: 'TypeScript', description: 'Type-safe JavaScript for robust development', category: 'Frontend' },
  { name: 'Tailwind CSS', description: 'Utility-first CSS framework for rapid styling', category: 'Frontend' },
  { name: 'Vite', description: 'Next-generation frontend build tool', category: 'Build Tool' },
  { name: 'ethers.js v6', description: 'Complete Ethereum library for blockchain interaction', category: 'Web3' },
  { name: 'Recharts', description: 'Composable charting library for React', category: 'Data Visualization' },
  { name: 'React Router', description: 'Client-side routing for single-page applications', category: 'Frontend' },
  { name: 'Radix UI', description: 'Unstyled, accessible UI component primitives', category: 'UI Components' },
  { name: 'UniswapV2 Protocol', description: 'Battle-tested AMM smart contracts', category: 'Smart Contracts' },
  { name: 'Solidity', description: 'Smart contract programming language', category: 'Smart Contracts' },
  { name: 'Zustand', description: 'Lightweight state management for React', category: 'State Management' },
];

const FEATURES_LIST = [
  {
    icon: ArrowRightLeft,
    title: 'Token Swap',
    description: 'Instantly swap tokens using automated market maker (AMM) mechanism with competitive rates.',
  },
  {
    icon: Droplets,
    title: 'Liquidity Pools',
    description: 'Provide liquidity to earn 0.3% trading fees from every swap in your pool.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track pool performance, TVL, volume, and price charts in real-time.',
  },
  {
    icon: Wallet,
    title: 'Multi-Wallet Support',
    description: 'Connect with MetaMask, OKX Wallet, Rabby, Bitget, and more.',
  },
  {
    icon: Shield,
    title: 'Secure & Audited',
    description: 'Built on battle-tested UniswapV2 contracts with transparent on-chain operations.',
  },
  {
    icon: Globe,
    title: 'Nexus Testnet',
    description: 'Deployed on Nexus Testnet for safe testing and development.',
  },
];

const TODAYS_UPDATES = [
  {
    title: 'Real-time Price Updates',
    description: 'Live price data with WebSocket-style updates every 5 seconds. Visual indicators show price movements in real-time.',
    type: 'new',
  },
  {
    title: 'Price Alerts System',
    description: 'Set custom price alerts for any token. Get notified via toast and browser notifications when prices hit your targets.',
    type: 'new',
  },
  {
    title: 'Token Detail Page',
    description: 'Comprehensive token analytics page with historical price/volume charts, multiple timeframes (24H to 1Y), and detailed metrics.',
    type: 'new',
  },
  {
    title: 'Watchlist Widget',
    description: 'Quick access to your favorite tokens with live price updates on the main trading page.',
    type: 'new',
  },
  {
    title: 'Recent Trades Feed',
    description: 'Live feed showing recent trades across all pools with real-time updates.',
    type: 'new',
  },
  {
    title: 'Live Connection Status',
    description: 'Visual indicator showing real-time data connection status throughout the app.',
    type: 'new',
  },
  {
    title: 'Token Market Page',
    description: 'CoinMarketCap-style token listing page with prices, 24h changes, volume, TVL, and mini charts.',
    type: 'new',
  },
  {
    title: 'On-chain APR Calculation',
    description: 'APR is now calculated from real on-chain volume and fees data.',
    type: 'improved',
  },
  {
    title: 'Professional Pools Page',
    description: 'Enhanced pools page with better stats cards, APR display, and Add Liquidity buttons.',
    type: 'improved',
  },
  {
    title: 'Limit Order Feature',
    description: 'Create limit orders with target prices on the Swap page.',
    type: 'new',
  },
  {
    title: 'Performance Optimization',
    description: 'Added React.memo, lazy loading, and optimized data fetching for faster performance.',
    type: 'improved',
  },
  {
    title: 'Remove Wrap/Unwrap Feature',
    description: 'Simplified the Liquidity page by removing the Wrap/Unwrap tab.',
    type: 'removed',
  },
];

const ROADMAP = [
  {
    phase: 'Phase 1',
    title: 'Foundation',
    status: 'completed',
    items: [
      'Deploy UniswapV2 core contracts',
      'Basic swap functionality',
      'Wallet connection (MetaMask, OKX, Rabby, Bitget)',
      'Token list management',
      'Responsive UI design',
    ],
  },
  {
    phase: 'Phase 2',
    title: 'Liquidity & Pools',
    status: 'completed',
    items: [
      'Add/Remove liquidity interface',
      'Pool creation functionality',
      'Pools list with TVL tracking',
      'Transaction history tracking',
    ],
  },
  {
    phase: 'Phase 3',
    title: 'Analytics & Visualization',
    status: 'completed',
    items: [
      'Price charts with historical data',
      'TVL and volume tracking',
      'Pool performance metrics',
      'Portfolio dashboard',
      'Real-time data updates',
    ],
  },
  {
    phase: 'Phase 4',
    title: 'Advanced Features',
    status: 'completed',
    items: [
      'Limit orders',
      'Price impact warnings',
      'Multi-hop routing',
      'Swap confirmation modal',
      'Favorite pools system',
    ],
  },
  {
    phase: 'Phase 5',
    title: 'Mainnet & Beyond',
    status: 'planned',
    items: [
      'Security audit completion',
      'Nexus mainnet deployment',
      'Governance token launch',
      'Staking rewards program',
      'Cross-chain bridge integration',
    ],
  },
];

const CONTRACT_INFO = [
  { name: 'UniswapV2Factory', address: CONTRACTS.FACTORY, description: 'Creates and manages liquidity pairs' },
  { name: 'UniswapV2Router02', address: CONTRACTS.ROUTER, description: 'Handles swaps and liquidity operations' },
  { name: 'WETH9 (Wrapped ETH)', address: CONTRACTS.WETH, description: 'Wrapped native token for trading' },
  { name: 'Multicall', address: CONTRACTS.MULTICALL, description: 'Batch multiple contract calls' },
  { name: 'UniswapV2Library', address: CONTRACTS.LIBRARY, description: 'Helper functions for price calculations' },
];

const TOKEN_INFO = [
  { name: 'WNEX (Wrapped NEX)', address: TOKENS.WNEX, description: 'Wrapped version of native NEX token' },
  { name: 'MON Token', address: TOKENS.MON, description: 'Test token for liquidity testing' },
  { name: 'FRDX Token', address: TOKENS.FRDX, description: 'FOREDEX native governance token' },
  { name: 'WETH', address: TOKENS.WETH, description: 'Wrapped ETH representation' },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    toast.success('Address copied!');
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const downloadDocumentation = (format: 'json' | 'md') => {
    const docContent = {
      project: 'FOREDEX',
      description: 'Decentralized Exchange on Nexus Network',
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      network: NEXUS_TESTNET,
      contracts: CONTRACT_INFO,
      tokens: TOKEN_INFO,
      techStack: TECH_STACK,
      features: FEATURES_LIST.map(f => ({ title: f.title, description: f.description })),
      roadmap: ROADMAP,
      todaysUpdates: TODAYS_UPDATES,
    };

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(docContent, null, 2);
      filename = 'foredex-documentation.json';
      mimeType = 'application/json';
    } else {
      content = generateMarkdown(docContent);
      filename = 'foredex-documentation.md';
      mimeType = 'text/markdown';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Documentation downloaded as ${filename}`);
  };

  const generateMarkdown = (doc: any) => {
    return `# FOREDEX Documentation

## Overview
${doc.description}

**Version:** ${doc.version}  
**Last Updated:** ${new Date(doc.lastUpdated).toLocaleDateString()}

---

## Network Configuration

| Property | Value |
|----------|-------|
| Network Name | ${doc.network.name} |
| Chain ID | ${doc.network.chainId} |
| RPC URL | ${doc.network.rpcUrl} |
| Block Explorer | ${doc.network.blockExplorer} |

---

## Smart Contracts

${doc.contracts.map((c: any) => `### ${c.name}
- **Address:** \`${c.address}\`
- **Description:** ${c.description}
`).join('\n')}

---

## Tokens

${doc.tokens.map((t: any) => `### ${t.name}
- **Address:** \`${t.address}\`
- **Description:** ${t.description}
`).join('\n')}

---

## Technology Stack

${['Frontend', 'Web3', 'Smart Contracts', 'Build Tool', 'UI Components', 'Data Visualization', 'State Management'].map(category => {
  const techs = doc.techStack.filter((t: any) => t.category === category);
  if (techs.length === 0) return '';
  return `### ${category}
${techs.map((t: any) => `- **${t.name}:** ${t.description}`).join('\n')}
`;
}).join('\n')}

---

## Features

${doc.features.map((f: any) => `### ${f.title}
${f.description}
`).join('\n')}

---

## Today's Updates

${doc.todaysUpdates.map((u: any) => `- **[${u.type.toUpperCase()}]** ${u.title}: ${u.description}`).join('\n')}

---

## Roadmap

${doc.roadmap.map((p: any) => `### ${p.phase}: ${p.title} (${p.status})
${p.items.map((i: string) => `- ${i}`).join('\n')}
`).join('\n')}

---

*Generated by FOREDEX Documentation System*
`;
  };

  return (
    <main className="container py-8 md:py-12 max-w-7xl">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="lg:w-64 shrink-0">
          <div className="glass-card p-4 lg:sticky lg:top-24">
            <h2 className="font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wider">
              Documentation
            </h2>
            <nav className="space-y-1">
              {DOCS_SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      activeSection === section.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {section.label}
                    {section.id === 'updates' && (
                      <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
                        New
                      </Badge>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Download Section */}
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download Docs
              </h3>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start gap-2"
                  onClick={() => downloadDocumentation('md')}
                >
                  <FileText className="w-4 h-4" />
                  Markdown (.md)
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start gap-2"
                  onClick={() => downloadDocumentation('json')}
                >
                  <Code className="w-4 h-4" />
                  JSON (.json)
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <section className="space-y-8">
              <div className="glass-card p-8">
                <div className="flex items-center gap-4 mb-6">
                  <img src={wolfLogo} alt="FOREDEX" className="w-16 h-16" />
                  <div>
                    <h1 className="text-3xl font-bold">
                      FORE<span className="text-primary">DEX</span>
                    </h1>
                    <p className="text-muted-foreground">Decentralized Exchange on Nexus Network</p>
                  </div>
                </div>

                <div className="prose prose-invert max-w-none">
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    FOREDEX adalah decentralized exchange (DEX) yang berjalan di Nexus Testnet, 
                    dibangun menggunakan protokol UniswapV2 yang telah teruji. Platform ini memungkinkan 
                    pengguna untuk melakukan swap token, menyediakan likuiditas, dan mendapatkan fee dari setiap transaksi.
                  </p>

                  <h3 className="text-xl font-semibold mt-8 mb-4 text-foreground">Apa itu FOREDEX?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    FOREDEX merupakan automated market maker (AMM) yang memungkinkan perdagangan token 
                    secara terdesentralisasi tanpa memerlukan order book tradisional. Dengan menggunakan 
                    liquidity pools, setiap pengguna dapat menjadi market maker dan mendapatkan fee 
                    dari setiap transaksi yang terjadi di pool mereka.
                  </p>

                  <h3 className="text-xl font-semibold mt-8 mb-4 text-foreground">Mengapa FOREDEX?</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">Non-Custodial:</strong> Anda selalu memiliki kendali penuh atas aset Anda</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">Transparan:</strong> Semua transaksi tercatat di blockchain dan dapat diverifikasi</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">Tanpa Izin:</strong> Siapa saja dapat membuat pool dan trading tanpa perlu registrasi</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">Teruji:</strong> Dibangun di atas protokol UniswapV2 yang telah menangani miliaran dolar</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Network Info Card */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Network Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Network Name</p>
                    <p className="font-semibold">{NEXUS_TESTNET.name}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Chain ID</p>
                    <p className="font-semibold">{NEXUS_TESTNET.chainId}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">RPC URL</p>
                    <p className="font-mono text-sm break-all">{NEXUS_TESTNET.rpcUrl}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Block Explorer</p>
                    <a 
                      href={NEXUS_TESTNET.blockExplorer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {NEXUS_TESTNET.blockExplorer}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Today's Updates Section */}
          {activeSection === 'updates' && (
            <section className="space-y-6">
              <div className="glass-card p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-gradient-wolf">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Today's Updates</h2>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {TODAYS_UPDATES.map((update, index) => (
                    <div 
                      key={index} 
                      className="p-4 rounded-lg bg-muted/30 border-l-4 transition-colors hover:bg-muted/40"
                      style={{
                        borderLeftColor: update.type === 'new' ? 'hsl(var(--primary))' : 
                                        update.type === 'improved' ? '#22c55e' : '#ef4444'
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            'shrink-0',
                            update.type === 'new' && 'bg-primary/20 text-primary',
                            update.type === 'improved' && 'bg-green-500/20 text-green-500',
                            update.type === 'removed' && 'bg-red-500/20 text-red-500'
                          )}
                        >
                          {update.type === 'new' ? '✨ NEW' : update.type === 'improved' ? '⬆️ IMPROVED' : '🗑️ REMOVED'}
                        </Badge>
                        <div>
                          <h4 className="font-semibold mb-1">{update.title}</h4>
                          <p className="text-sm text-muted-foreground">{update.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Stats */}
                <div className="mt-8 pt-6 border-t border-border grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">
                      {TODAYS_UPDATES.filter(u => u.type === 'new').length}
                    </p>
                    <p className="text-sm text-muted-foreground">New Features</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-500">
                      {TODAYS_UPDATES.filter(u => u.type === 'improved').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Improvements</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-500">
                      {TODAYS_UPDATES.filter(u => u.type === 'removed').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Removed</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Technology Section */}
          {activeSection === 'technology' && (
            <section className="space-y-6">
              <div className="glass-card p-8">
                <h2 className="text-2xl font-bold mb-2">Technology Stack</h2>
                <p className="text-muted-foreground mb-8">
                  FOREDEX dibangun dengan teknologi modern untuk performa dan keamanan terbaik.
                </p>

                <div className="grid gap-4">
                  {['Frontend', 'Web3', 'Smart Contracts', 'Build Tool', 'UI Components', 'Data Visualization', 'State Management'].map((category) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                        {category}
                      </h3>
                      <div className="grid md:grid-cols-2 gap-3">
                        {TECH_STACK.filter(t => t.category === category).map((tech) => (
                          <div key={tech.name} className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                            <h4 className="font-semibold text-sm mb-1">{tech.name}</h4>
                            <p className="text-xs text-muted-foreground">{tech.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Architecture Diagram */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Architecture Overview
                </h3>
                <div className="p-6 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex flex-col items-center gap-4 text-sm">
                    <div className="w-full max-w-md p-4 rounded-lg bg-primary/10 border border-primary/30 text-center">
                      <p className="font-semibold text-primary">Frontend (React + TypeScript)</p>
                      <p className="text-xs text-muted-foreground mt-1">User Interface & Interactions</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground rotate-90" />
                    <div className="w-full max-w-md p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
                      <p className="font-semibold text-blue-500">ethers.js v6</p>
                      <p className="text-xs text-muted-foreground mt-1">Blockchain Communication Layer</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground rotate-90" />
                    <div className="w-full max-w-md p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                      <p className="font-semibold text-green-500">UniswapV2 Smart Contracts</p>
                      <p className="text-xs text-muted-foreground mt-1">Factory, Router, Pair Contracts</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground rotate-90" />
                    <div className="w-full max-w-md p-4 rounded-lg bg-purple-500/10 border border-purple-500/30 text-center">
                      <p className="font-semibold text-purple-500">Nexus Testnet Blockchain</p>
                      <p className="text-xs text-muted-foreground mt-1">Chain ID: 3945</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Contracts Section */}
          {activeSection === 'contracts' && (
            <section className="space-y-6">
              <div className="glass-card p-8">
                <h2 className="text-2xl font-bold mb-2">Smart Contracts</h2>
                <p className="text-muted-foreground mb-8">
                  Semua smart contract telah di-deploy di Nexus Testnet dan dapat diverifikasi di block explorer.
                </p>

                <h3 className="text-lg font-semibold mb-4">Core Contracts</h3>
                <div className="space-y-3 mb-8">
                  {CONTRACT_INFO.map((contract) => (
                    <div key={contract.address} className="p-4 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <h4 className="font-semibold">{contract.name}</h4>
                          <p className="text-xs text-muted-foreground">{contract.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-background/50 px-3 py-1.5 rounded font-mono">
                            {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(contract.address)}
                            className="h-8 w-8 p-0"
                          >
                            {copiedAddress === contract.address ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0"
                          >
                            <a
                              href={`${NEXUS_TESTNET.blockExplorer}/address/${contract.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <h3 className="text-lg font-semibold mb-4">Token Contracts</h3>
                <div className="space-y-3">
                  {TOKEN_INFO.map((token) => (
                    <div key={token.address} className="p-4 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <h4 className="font-semibold">{token.name}</h4>
                          <p className="text-xs text-muted-foreground">{token.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-background/50 px-3 py-1.5 rounded font-mono">
                            {token.address.slice(0, 10)}...{token.address.slice(-8)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(token.address)}
                            className="h-8 w-8 p-0"
                          >
                            {copiedAddress === token.address ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0"
                          >
                            <a
                              href={`${NEXUS_TESTNET.blockExplorer}/address/${token.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Features Section */}
          {activeSection === 'features' && (
            <section className="space-y-6">
              <div className="glass-card p-8">
                <h2 className="text-2xl font-bold mb-2">Features</h2>
                <p className="text-muted-foreground mb-8">
                  Fitur lengkap untuk pengalaman trading DeFi yang optimal.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  {FEATURES_LIST.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div key={feature.title} className="p-6 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-primary/10">
                            <Icon className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1">{feature.title}</h3>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Roadmap Section */}
          {activeSection === 'roadmap' && (
            <section className="space-y-6">
              <div className="glass-card p-8">
                <h2 className="text-2xl font-bold mb-2">Development Roadmap</h2>
                <p className="text-muted-foreground mb-8">
                  Rencana pengembangan FOREDEX dari testnet hingga mainnet.
                </p>

                <div className="space-y-6">
                  {ROADMAP.map((phase, index) => (
                    <div key={phase.phase} className="relative">
                      {/* Timeline connector */}
                      {index < ROADMAP.length - 1 && (
                        <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border" />
                      )}
                      
                      <div className="flex gap-4">
                        {/* Status indicator */}
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10',
                          phase.status === 'completed' && 'bg-green-500/20 text-green-500',
                          phase.status === 'in-progress' && 'bg-primary/20 text-primary animate-pulse',
                          phase.status === 'planned' && 'bg-muted text-muted-foreground'
                        )}>
                          {phase.status === 'completed' && <CheckCircle2 className="w-5 h-5" />}
                          {phase.status === 'in-progress' && <Rocket className="w-5 h-5" />}
                          {phase.status === 'planned' && <Settings className="w-5 h-5" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-8">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              phase.status === 'completed' && 'bg-green-500/20 text-green-500',
                              phase.status === 'in-progress' && 'bg-primary/20 text-primary',
                              phase.status === 'planned' && 'bg-muted text-muted-foreground'
                            )}>
                              {phase.phase}
                            </span>
                            <span className={cn(
                              'text-xs capitalize',
                              phase.status === 'completed' && 'text-green-500',
                              phase.status === 'in-progress' && 'text-primary',
                              phase.status === 'planned' && 'text-muted-foreground'
                            )}>
                              {phase.status.replace('-', ' ')}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold mb-3">{phase.title}</h3>
                          <div className="p-4 rounded-lg bg-muted/30">
                            <ul className="space-y-2">
                              {phase.items.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <ChevronRight className={cn(
                                    'w-4 h-4 mt-0.5 shrink-0',
                                    phase.status === 'completed' ? 'text-green-500' : 'text-muted-foreground'
                                  )} />
                                  <span className={phase.status === 'completed' ? 'text-muted-foreground line-through' : ''}>
                                    {item}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
