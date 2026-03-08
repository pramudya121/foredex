import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Github, Twitter, MessageCircle } from 'lucide-react';
import { NEXUS_TESTNET } from '@/config/contracts';
import wolfLogo from '@/assets/wolf-logo.png';

const PRODUCT_LINKS = [
  { label: 'Swap', path: '/swap' },
  { label: 'Liquidity', path: '/liquidity' },
  { label: 'Pools', path: '/pools' },
  { label: 'Farming', path: '/farming' },
];

const RESOURCE_LINKS = [
  { label: 'Tokens', path: '/tokens' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Portfolio', path: '/portfolio' },
  { label: 'Docs', path: '/docs' },
];

export const Footer = memo(function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/80 backdrop-blur-sm mt-auto">
      <div className="container px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link to="/" className="flex items-center gap-2">
              <img src={wolfLogo} alt="FOREDEX" className="w-8 h-8 rounded-full" />
              <span className="font-bold text-lg text-foreground">FOREDEX</span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Decentralized exchange on Nexus Testnet. Swap, provide liquidity, and earn rewards.
            </p>
            <div className="flex gap-3 pt-1">
              <a
                href={`https://${NEXUS_TESTNET.blockExplorer}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Block Explorer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Discord">
                <MessageCircle className="w-4 h-4" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors" aria-label="GitHub">
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Product</h4>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map(link => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Resources</h4>
            <ul className="space-y-2">
              {RESOURCE_LINKS.map(link => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Network */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Network</h4>
            <ul className="space-y-2">
              <li className="text-xs text-muted-foreground">
                Chain: <span className="text-foreground">Nexus Testnet</span>
              </li>
              <li className="text-xs text-muted-foreground">
                Chain ID: <span className="text-foreground font-mono">{NEXUS_TESTNET.chainId}</span>
              </li>
              <li>
                <a
                  href={`https://${NEXUS_TESTNET.blockExplorer}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  Explorer <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} FOREDEX. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built on <span className="text-primary">Nexus Network</span>
          </p>
        </div>
      </div>
    </footer>
  );
});
