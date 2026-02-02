import { memo } from 'react';
import { Marquee } from '@/components/ui/marquee';
import { cn } from '@/lib/utils';

interface Partner {
  name: string;
  logo: string;
  url?: string;
}

const PARTNERS: Partner[] = [
  { name: 'Ethereum', logo: '/tokens/weth.png' },
  { name: 'Chainlink', logo: '/tokens/link.png' },
  { name: 'USDC', logo: '/tokens/usdc.png' },
  { name: 'XRP', logo: '/tokens/xrp.png' },
  { name: 'Tron', logo: '/tokens/trx.png' },
  { name: 'Monero', logo: '/tokens/xmr.png' },
  { name: 'Shiba Inu', logo: '/tokens/shib.png' },
  { name: 'Dogecoin', logo: '/tokens/doge.png' },
];

const PartnerLogo = memo(({ partner }: { partner: Partner }) => (
  <div 
    className={cn(
      'flex items-center gap-3 px-6 py-3 mx-4',
      'rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm',
      'hover:border-primary/40 hover:bg-card/50 transition-all duration-300',
      'group cursor-pointer'
    )}
  >
    <img 
      src={partner.logo} 
      alt={partner.name}
      width={32}
      height={32}
      loading="lazy"
      className="w-8 h-8 rounded-full object-cover group-hover:scale-110 transition-transform"
      onError={(e) => {
        e.currentTarget.src = '/placeholder.svg';
      }}
    />
    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
      {partner.name}
    </span>
  </div>
));

PartnerLogo.displayName = 'PartnerLogo';

export const PartnersSection = memo(function PartnersSection() {
  return (
    <section className="py-12 border-y border-border/20 bg-gradient-to-b from-transparent via-card/20 to-transparent">
      <div className="container px-4 mb-8 text-center">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Ecosystem Partners
        </h3>
        <p className="text-xs text-muted-foreground/70">
          Trusted by leading blockchain protocols
        </p>
      </div>
      
      <Marquee pauseOnHover speed={30} className="py-4">
        {PARTNERS.map((partner) => (
          <PartnerLogo key={partner.name} partner={partner} />
        ))}
      </Marquee>
      
      <Marquee pauseOnHover speed={25} reverse className="py-4">
        {[...PARTNERS].reverse().map((partner) => (
          <PartnerLogo key={`rev-${partner.name}`} partner={partner} />
        ))}
      </Marquee>
    </section>
  );
});
